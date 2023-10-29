import { afterAll, beforeEach, expect, it } from '@jest/globals';
import { mockFetch } from './__mocks__/fetch.mock';
import bridg from './generated/bridg';
import { Blog, Prisma, User } from './generated/prisma';
import prisma, { resetDbData } from './utils/prisma';
import { setRules } from './utils/test-rules';

global.fetch = mockFetch;

const TEST_TITLE = 'TEST_BLOG';
const TEST_TITLE_2 = 'TEST_BLOG_2';
let testBlog1: Blog;
let testBlog2: Blog;
let testUser: User;

const createFakeData = async () => {
  testUser = await prisma.user.create({ data: { email: 'johndoe@gmail.com', name: 'John Doe' } });

  const blogCreate = {
    userId: testUser.id,
    body: 'hello world test blog body',
    comments: { create: { body: 'test-comment' } },
  };
  testBlog1 = await prisma.blog.create({
    data: { title: TEST_TITLE, ...blogCreate },
  });
  testBlog2 = await prisma.blog.create({
    data: { title: TEST_TITLE_2, ...blogCreate },
  });
};

beforeEach(async () => {
  setRules({});
  await resetDbData();
  await createFakeData();
});

afterAll(async () => {
  setRules({});
});

const queryFails = async (query: Promise<any>) => {
  const data = await query.catch((err) => {
    expect(err).toBeTruthy();
  });
  expect(data).toBeUndefined();
};

const querySucceeds = async (query: Promise<any>, resultCount = 1) => {
  const data = await query;

  if (Array.isArray(data)) {
    expect(data.length).toBe(resultCount);
  } else if (data?.count !== undefined) {
    expect(data.count).toBe(resultCount);
  } else {
    resultCount === 0 && expect(data).toBeNull();
    resultCount === 1 && expect(data).toBeTruthy();
    if (resultCount > 1) throw Error(`Expected array, but received: ${data}`);
  }

  return data;
};

it('Before hook runs before query executed', async () => {
  const queryArgs: Prisma.BlogWhereInput = { id: testBlog1.id };
  let queryRan = false;
  setRules({
    blog: {
      find: {
        rule: true,
        before: (uid, query, { method }) => {
          expect(method).toBe('findMany');
          queryRan = true;
          expect(uid).toBe('');
          expect(query.where.id).toEqual(queryArgs.id);
          return { where: { id: testBlog2.id } };
        },
      },
    },
  });
  expect(queryRan).toBe(false);
  const res = await querySucceeds(bridg.blog.findMany({ where: queryArgs }));
  expect(queryRan).toBe(true);
  expect(res?.at(0).id).toEqual(testBlog2.id);
});

it('Before hook can override user query', async () => {
  const queryArgs: Prisma.BlogFindFirstArgs = {
    where: { id: testBlog1.id },
    select: { body: true },
  };
  setRules({
    blog: {
      find: {
        rule: true,
        before: (uid, query) => {
          expect(query.select.body).toBe(true);
          expect(Object.keys(query.select).length).toBe(1);
          return { where: { id: testBlog2.id }, select: { title: true } };
        },
      },
    },
  });
  const res = await querySucceeds(bridg.blog.findFirst(queryArgs));
  expect(res.title).toEqual(testBlog2.title);
  expect(res.body).toBeUndefined();
});

it('After hook runs after query, can modify result data', async () => {
  const queryArgs: Prisma.BlogFindFirstArgs = { where: { id: testBlog1.id } };
  const returnData = 'OMG_HI';
  setRules({
    blog: {
      find: {
        rule: true,
        after: (uid, data) => {
          expect(data.id).toBe(testBlog1.id);

          return returnData;
        },
      },
    },
  });
  const res = await querySucceeds(bridg.blog.findFirst(queryArgs));
  expect(res).toEqual(returnData);
});

it('Hooks pass context of query', async () => {
  const queryArgs: Prisma.BlogFindFirstArgs = { where: { id: testBlog1.id } };

  setRules({
    blog: {
      find: {
        rule: { id: testBlog2.id },
        before: (uid, query, { method, originalQuery }) => {
          expect(method).toBe('findFirst');
          expect(query.where.id).toBe(testBlog1.id);
          expect(query.where.AND[0].id).toBe(testBlog2.id);
          expect(originalQuery.where.id).toBe(queryArgs?.where?.id);
          expect(Object.keys(originalQuery).length).toBe(1);
          expect(Object.keys(originalQuery.where).length).toBe(1);

          return { where: { id: testBlog2.id } };
        },
        after: (uid, data, { method, originalQuery, queryExecuted }) => {
          expect(method).toBe('findFirst');
          expect(queryExecuted.where.id).toBe(testBlog2.id);
          expect(originalQuery.where.id).toBe(queryArgs?.where?.id);
          expect(Object.keys(originalQuery).length).toBe(1);
          expect(Object.keys(originalQuery.where).length).toBe(1);

          return data;
        },
      },
    },
  });

  const res = await querySucceeds(bridg.blog.findFirst(queryArgs));
  expect(res.id).toEqual(testBlog2.id);
});

it('Before hook can alter mutation data', async () => {
  const createArgs: Prisma.BlogCreateArgs = { data: { title: 'title_original', body: null } };
  let updateArgs: any;

  setRules({
    blog: {
      create: {
        rule: true,
        before: (uid, query, { method }) => {
          expect(method).toBe('create');
          expect(query).toEqual(createArgs);

          return { ...query, data: { ...query.data, body: 'body_added' } };
        },
      },
      update: {
        rule: true,
        before: (uid, query, { method }) => {
          expect(method).toBe('update');
          expect(query.data.body).toEqual(updateArgs.data.body);

          return { ...query, data: { ...query.data, body: 'body_added_2' } };
        },
      },
    },
  });

  const res = await querySucceeds(bridg.blog.create(createArgs));
  expect(res.title).toEqual(createArgs.data.title);
  expect(res.body).toEqual('body_added');

  updateArgs = { where: { id: res.id }, data: { body: null } };
  const updateRes = await querySucceeds(bridg.blog.update(updateArgs));
  expect(updateRes.id).toEqual(res.id);
  expect(updateRes.body).toEqual('body_added_2');
});

it('Before/after hooks work with delete', async () => {
  const deleteArgs: Prisma.BlogDeleteArgs = { where: { id: testBlog1.id } };

  setRules({
    blog: {
      delete: {
        rule: true,
        before: (uid, query, { method, originalQuery }) => {
          expect(method).toBe('delete');
          expect(query.where.id).toBe(testBlog1.id);
          expect(originalQuery.where.id).toBe(testBlog1.id);

          return { ...query, where: { id: testBlog2.id } };
        },
        after: (uid, data, { method, queryExecuted, originalQuery }) => {
          expect(data.id).toBe(testBlog2.id);
          expect(method).toBe('delete');
          expect(queryExecuted.where.id).toBe(testBlog2.id);
          expect(originalQuery.where.id).toBe(testBlog1.id);

          return 'fake_res';
        },
      },
    },
  });

  const res = await querySucceeds(bridg.blog.delete(deleteArgs));
  expect(res).toEqual('fake_res');
  const deleted = await prisma.blog.findUnique({ where: { id: testBlog2.id } });
  expect(deleted).toBeNull();
});
