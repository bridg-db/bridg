import { afterAll, beforeEach, expect, it } from '@jest/globals';
import { mockFetch } from './__mocks__/fetch.mock';
import bridg from './generated/bridg';
import { Blog, User } from './generated/prisma';
import prisma, { resetDbData } from './utils/prisma';
import { setRules } from './utils/test-rules';

global.fetch = mockFetch;

const TEST_TITLE = 'TEST_BLOG';
const TEST_TITLE_2 = 'TEST_BLOG_2';
let testBlog1: Blog;
let testBlog2: Blog;
let testUser: User;

const createFakeData = async () => {
  testUser = await prisma.user.create({ data: { email: 'johndoe@gmail.com' } });

  const blogCreate = {
    userId: testUser.id,
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

const fetchBlog1 = () => prisma.blog.findFirst({ where: { id: testBlog1.id } });
const fetchBlog2 = () => prisma.blog.findFirst({ where: { id: testBlog2.id } });

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

it('Hidden property for prevents reading fields', async () => {
  const shallowFindTest = async () => {
    const findMany1 = await querySucceeds(bridg.blog.findMany(), 2);
    expect(findMany1[0].title).toBeUndefined();
    expect(findMany1[0].published).toBeUndefined();
    expect(findMany1[0].id).toBeTruthy();

    const findFirst1 = await querySucceeds(bridg.blog.findFirst());
    expect(findFirst1.title).toBeUndefined();
    expect(findFirst1.published).toBeUndefined();
    expect(findFirst1.id).toBeDefined();

    setRules({ blog: { find: { rule: true, hidden: ['id'] } } });
    const findMany2 = await querySucceeds(bridg.blog.findMany(), 2);
    expect(findMany2[0].title).toBeTruthy();
    expect(findMany2[0].published).toBeDefined();
    expect(findMany2[0].id).toBeUndefined();
  };
  // find.hidden
  setRules({ blog: { find: { rule: true, hidden: ['title', 'published'] } } });
  await shallowFindTest();
  // model.hidden
  setRules({ blog: { find: true, hidden: ['title', 'published'] } });
  await shallowFindTest();

  const nestedFindTest = async () => {
    const findMany3 = await querySucceeds(
      bridg.blog.findMany({ include: { user: { include: { blogs: true } } } }),
      2
    );

    expect(findMany3[0].title).toBeUndefined();
    expect(findMany3[0].user.id).toBeDefined();
    expect(findMany3[0].user.email).toBeUndefined();
    // double nested
    expect(findMany3[0].user.blogs[0].title).toBeUndefined();
    expect(findMany3[0].user.blogs[0].id).toBeDefined();
  };
  setRules({
    blog: { find: { rule: true, hidden: ['title'] } },
    user: { find: { rule: true, hidden: ['email'] } },
  });
  await nestedFindTest();
  setRules({ blog: { find: true, hidden: ['title'] }, user: { find: true, hidden: ['email'] } });
  await nestedFindTest();
});

it('Hidden property prevents querying by fields', async () => {
  setRules({ blog: { find: { rule: true, hidden: ['id'] } } });
  await queryFails(bridg.blog.findMany({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.findFirst({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.findFirstOrThrow({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.findUnique({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.findUniqueOrThrow({ where: { id: testBlog1.id } }));
  const res1 = await querySucceeds(bridg.blog.findMany(), 2);
  res1.forEach((b: any) => {
    expect(b.id).toBeUndefined();
    expect(b.title).toBeTruthy();
  });
  const res2 = await querySucceeds(bridg.blog.findMany({ where: { title: testBlog1.title } }), 1);
  res2.forEach((b: any) => {
    expect(b.id).toBeUndefined();
    expect(b.title).toBeTruthy();
  });
});

it('Hidden property prevents updates from returning data', async () => {
  const shallowUpdateTest = async () => {
    const update1 = await querySucceeds(
      bridg.blog.update({
        where: { id: testBlog1.id },
        data: { body: 'edited1' },
      })
    );
    expect(update1.title).toBeUndefined();
    expect(update1.published).toBeUndefined();
    expect(update1.id).toBeTruthy();
    expect(update1.body).toEqual('edited1');
  };
  setRules({
    blog: {
      find: { rule: true, hidden: ['title', 'published'] },
      update: true,
    },
  });
  await shallowUpdateTest();
  setRules({
    blog: {
      update: true,
      hidden: ['title', 'published'],
    },
  });

  setRules({
    blog: {
      find: { rule: true, hidden: ['title', 'published'] },
      update: true,
    },
    user: {
      find: { rule: true, hidden: ['name'] },
      update: true,
    },
  });
  const nestedUpdate = await querySucceeds(
    bridg.user.update({
      where: { id: testUser.id },
      data: {
        email: 'update2',
        blogs: {
          update: { where: { id: testBlog1.id }, data: { body: 'edited2' } },
        },
      },
      include: { blogs: { where: { id: testBlog1.id } } },
    })
  );

  expect(nestedUpdate.email).toBe('update2');
  expect(nestedUpdate.id).toBeTruthy();
  expect(nestedUpdate.name).toBeUndefined();

  const update2 = nestedUpdate.blogs[0];
  expect(update2.title).toBeUndefined();
  expect(update2.published).toBeUndefined();
  expect(update2.id).toBeTruthy();
  expect(update2.body).toEqual('edited2');
});

it('Hidden property prevents updates from changing hidden field', async () => {
  setRules({
    blog: {
      find: { rule: true, hidden: ['published'] },
      update: { rule: true, hidden: ['title'] },
    },
    user: {
      update: { rule: true, hidden: ['email'] },
    },
  });
  await queryFails(
    bridg.blog.update({ where: { id: testBlog1.id }, data: { body: 'edited1', title: 'edited1' } })
  );
  const edit1 = await querySucceeds(
    bridg.blog.update({ where: { id: testBlog1.id }, data: { body: 'edited1' } })
  );
  // data returned from update respects "find" rules
  expect(edit1.published).toBeUndefined();
  expect(edit1.title).toBeDefined();
  // nested update
  await queryFails(
    bridg.user.update({
      where: { id: testBlog1.id },
      data: {
        name: 'edited2',
        blogs: {
          //  blog.title hidden
          update: { where: { id: testBlog1.id }, data: { title: 'edited2' } },
        },
      },
    })
  );
  await queryFails(
    bridg.user.update({
      where: { id: testUser.id },
      data: {
        email: 'edited2', // user.email hidden
        blogs: {
          update: { where: { id: testBlog1.id }, data: { body: 'edited2' } },
        },
      },
    })
  );
  await querySucceeds(
    bridg.user.update({
      where: { id: testUser.id },
      data: {
        name: 'edited2',
        blogs: {
          update: { where: { id: testBlog1.id }, data: { body: 'edited2' } },
        },
      },
    })
  );
});

it('Hidden property prevents creating data with field', async () => {
  setRules({
    blog: {
      find: { rule: true, hidden: ['title'] },
      create: { rule: true, hidden: ['published'] },
    },
    user: {
      find: { rule: true, hidden: ['email'] },
      create: { rule: true, hidden: ['name'] },
    },
  });

  await queryFails(
    bridg.blog.create({
      data: { title: 'test', published: true, userId: testUser.id },
    })
  );
  const createdBlog = await querySucceeds(
    bridg.blog.create({
      data: { title: 'test', userId: testUser.id },
    })
  );
  // returned data respects find rules
  expect(createdBlog.title).toBeUndefined();
  expect(createdBlog.published).toBeDefined();

  await queryFails(bridg.user.create({ data: { email: 'test1', name: 'test' } }));
  await querySucceeds(bridg.user.create({ data: { email: 'test1' } }));

  await queryFails(
    bridg.user.create({
      data: {
        email: 'test_fail',
        blogs: {
          create: {
            title: 'test',
            published: true, // hidden field
          },
        },
      },
    })
  );
  const userWithBlog = await querySucceeds(
    bridg.user.create({
      data: { email: 'test2', blogs: { create: { title: 'test' } } },
      include: { blogs: true },
    })
  );
  expect(userWithBlog.email).toBeUndefined();
  expect(userWithBlog.name).toBeDefined();
  expect(userWithBlog.blogs[0].title).toBeUndefined();
  expect(userWithBlog.blogs[0].published).toBeDefined();
});

it('Hidden property prevents deleting data by querying hidden field', async () => {
  setRules({ blog: { delete: { rule: true, hidden: ['id'] } } });

  await queryFails(bridg.blog.delete({ where: { id: testBlog1.id } }));
  await querySucceeds(bridg.blog.deleteMany({ where: { title: '' } }), 0);
  await querySucceeds(bridg.blog.deleteMany({ where: { title: testBlog1.title } }), 1);
  await resetDbData();
  await createFakeData();
  await querySucceeds(bridg.blog.deleteMany({ where: {} }), 2);
});

it('Hidden property respects method level fields over model level', async () => {
  setRules({ blog: { find: { rule: true, hidden: ['id'] }, hidden: ['title'] } });

  await queryFails(bridg.blog.findMany({ where: { id: testBlog1.id } }));
  await querySucceeds(bridg.blog.findMany({ where: { title: testBlog1.title } }));
});

it('Hidden property falls back to model level if no method level available', async () => {
  setRules({ blog: { find: { rule: true }, hidden: ['title'] } });
  await queryFails(bridg.blog.findMany({ where: { title: testBlog1.title } }));
  await querySucceeds(bridg.blog.findMany({ where: { id: testBlog1.id } }));

  // uses blog.update.hidden for update, but blog.hidden for data returned
  setRules({
    blog: { find: { rule: true }, update: { rule: true, hidden: ['title'] }, hidden: ['title'] },
  });
  await queryFails(bridg.blog.findMany({ where: { title: testBlog1.title } }));
  await queryFails(
    bridg.blog.updateMany({ where: { title: testBlog1.title }, data: { body: 'edited' } })
  );
  const res = await querySucceeds(
    bridg.blog.update({ where: { id: testBlog1.id }, data: { body: 'edited' } })
  );
  expect(res.body).toEqual('edited');
  expect(res.title).toBeUndefined();

  // user.create.hidden overrides user.hidden
  setRules({
    user: { default: true, hidden: ['email'], create: { rule: true, hidden: ['name'] } },
  });
  await queryFails(bridg.user.findMany({ where: { email: testUser.email } }));
  await queryFails(bridg.user.create({ data: { email: 'test', name: 'test' } }));
  const res2 = await querySucceeds(bridg.user.create({ data: { email: 'test' } }));
  // respects user.hidden for returning data, since no find rule is available
  expect(res2.name).toBeDefined();
  expect(res2.email).toBeUndefined();
});
