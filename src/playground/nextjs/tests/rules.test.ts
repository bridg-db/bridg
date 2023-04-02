import { Blog, PrismaClient } from '@prisma/client';
import bridg from 'tests/bridg/client-db';
import { setRules } from 'tests/bridg/test-rules';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

const prisma = new PrismaClient();

const TEST_TITLE = 'TEST_BLOG';
const TEST_TITLE_2 = 'TEST_BLOG_2';
let testBlog: Blog;
let testBlog2: Blog;

beforeAll(async () => {
  await prisma.blog.deleteMany();
  testBlog = await prisma.blog.create({ data: { title: TEST_TITLE } });
  testBlog2 = await prisma.blog.create({ data: { title: TEST_TITLE_2 } });
});

afterAll(async () => {
  setRules({});
  // await prisma.blog.deleteMany({ where: { id: { in: [testBlog.id, testBlog2.id] } } });
});

beforeEach(() => setRules({}));

const queryFails = async (query: Promise<any>) => {
  const data = await query.catch((err) => {
    expect(err).toBeTruthy();
  });
  expect(data).toBeUndefined();
};

const querySucceeds = async (query: Promise<any>, resultCount = 1) => {
  const data = await query;
  if (resultCount !== undefined) {
    if (Array.isArray(data)) {
      expect(data.length).toBe(resultCount);
    } else {
      resultCount === 0 && expect(data).toBeNull();
      resultCount === 1 && expect(data).toBeTruthy();
      if (resultCount > 1) throw Error('Expected array, but received ', data);
    }
  }
  return data;
};

it('Find rules work with true/false', async () => {
  setRules({ blog: { find: false } });
  await queryFails(bridg.blog.findMany({ where: { title: TEST_TITLE } }));
  await queryFails(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await queryFails(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await queryFails(bridg.blog.findUnique({ where: { id: testBlog.id } }));
  await queryFails(bridg.blog.findUniqueOrThrow({ where: { id: testBlog.id } }));
  await queryFails(bridg.blog.aggregate({ where: { id: testBlog.id } }));
  await queryFails(bridg.blog.count());
  await queryFails(bridg.blog.groupBy());
  await queryFails(bridg.blog.aggregate({ where: { id: testBlog.id } }));

  setRules({ blog: { find: true } });
  await querySucceeds(bridg.blog.findMany(), 2);
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findUnique({ where: { id: testBlog.id } }));
  await querySucceeds(bridg.blog.findUniqueOrThrow({ where: { id: testBlog.id } }));
  await querySucceeds(bridg.blog.count());
  // TODO:
  // await querySucceeds(bridg.blog.groupBy());
  // await querySucceeds(bridg.blog.aggregate({ where: { id: testBlog.id } }));
});

it('Find rules work with queries', async () => {
  setRules({ blog: { find: { title: 'SOMETHING_THAT_ISNT_IN_THE_DB' } } });
  await querySucceeds(bridg.blog.findMany({ where: { title: TEST_TITLE } }), 0);
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }), 0);
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }), 0);
  await querySucceeds(bridg.blog.findUnique({ where: { id: testBlog.id } }), 0);
  // throws error (fails), bc of method
  await queryFails(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await queryFails(bridg.blog.findUniqueOrThrow({ where: { id: testBlog.id } }));

  setRules({ blog: { find: { title: TEST_TITLE } } });
  await querySucceeds(bridg.blog.findMany(), 1);
  await querySucceeds(bridg.blog.findMany({ where: { title: TEST_TITLE_2 } }), 0);
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findUnique({ where: { id: testBlog.id } }));
  await querySucceeds(bridg.blog.findUniqueOrThrow({ where: { id: testBlog.id } }));
  await querySucceeds(bridg.blog.count());
  // TODO:
  // await querySucceeds(bridg.blog.aggregate({ where: { id: testBlog.id } }));
  // await querySucceeds(bridg.blog.groupBy());
});

const TEST_UPDATE_BODY = 'TEST_BLOG_UPDATED';

it('Update rules work with true/false', async () => {
  setRules({ blog: { update: false } });

  await queryFails(bridg.blog.update({ where: { id: testBlog.id }, data: { body: TEST_UPDATE_BODY } }));
  await queryFails(bridg.blog.updateMany({ data: { body: TEST_UPDATE_BODY } }));

  let record = await prisma.blog.findFirst({ where: { id: testBlog.id } });
  expect(record?.body).toBeNull(); // record wasn't updated

  setRules({ blog: { update: true } });
  await querySucceeds(bridg.blog.update({ where: { id: testBlog.id }, data: { body: TEST_UPDATE_BODY } }));
  await querySucceeds(bridg.blog.updateMany({ where: { id: testBlog.id }, data: { body: TEST_UPDATE_BODY } }));

  record = await prisma.blog.findFirst({ where: { id: testBlog.id } });
  expect(record?.body).toBe(TEST_UPDATE_BODY); // record updated
});

it('Update rules work with queries', async () => {
  await prisma.blog.update({ where: { id: testBlog.id }, data: { body: null } });
  setRules({ blog: { update: false } });

  await queryFails(bridg.blog.update({ where: { id: testBlog.id }, data: { body: TEST_UPDATE_BODY } }));
  await queryFails(bridg.blog.updateMany({ data: { body: TEST_UPDATE_BODY } }));

  let record = await prisma.blog.findFirst({ where: { id: testBlog.id } });
  expect(record?.body).toBeNull(); // record wasn't updated

  setRules({ blog: { update: true } });
  await querySucceeds(bridg.blog.update({ where: { id: testBlog.id }, data: { body: TEST_UPDATE_BODY } }));
  await querySucceeds(bridg.blog.updateMany({ where: { id: testBlog.id }, data: { body: TEST_UPDATE_BODY } }));

  record = await prisma.blog.findFirst({ where: { id: testBlog.id } });
  expect(record?.body).toBe(TEST_UPDATE_BODY); // record updated
});

it('Create rules work with true/false', async () => {
  setRules({ blog: { create: false } });
  await queryFails(bridg.blog.create({ data: { title: TEST_TITLE } }));
  // TODO: createMany not supported via SQLite
  // await queryFails(bridg.blog.createMany({}));

  setRules({ blog: { create: true } });
  const b1 = await querySucceeds(bridg.blog.create({ data: { title: TEST_TITLE } }));
  expect(b1?.title).toBe(TEST_TITLE);
});

it('Delete rules work with true/false', async () => {
  setRules({ blog: { delete: false } });
  await queryFails(bridg.blog.delete({ where: { id: testBlog.id } }));
  await queryFails(bridg.blog.deleteMany({ where: { id: testBlog.id } }));

  setRules({ blog: { delete: true } });
  await querySucceeds(bridg.blog.delete({ where: { id: testBlog.id } }));
  testBlog = await prisma.blog.create({ data: { title: TEST_TITLE } });
  await querySucceeds(bridg.blog.deleteMany({ where: { id: testBlog.id } }));

  const record = await prisma.blog.findUnique({ where: { id: testBlog.id } });
  expect(record).toBeNull(); // record was deleted
});
