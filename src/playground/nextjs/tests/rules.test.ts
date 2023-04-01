import { Blog, PrismaClient } from '@prisma/client';
import bridg from 'tests/bridg/client-db';
import { setRules } from 'tests/bridg/test-rules';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

const prisma = new PrismaClient();

const TEST_TITLE = 'TEST_BLOG';
let testBlog: Blog;

beforeAll(async () => {
  testBlog = await prisma.blog.create({ data: { title: TEST_TITLE } });
});

beforeEach(() => setRules({}));

const queryFails = async (query: Promise<any>) => {
  const data = await query.catch((err) => {
    expect(err).toBeTruthy();
  });
  expect(data).toBeUndefined();
};

const querySucceeds = async (query: Promise<any>) => {
  const data = await bridg.blog.findFirst({ where: { title: TEST_TITLE } });
  expect(data).toBeTruthy();
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

  setRules({ blog: { find: true } });
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findUnique({ where: { id: testBlog.id } }));
  await querySucceeds(bridg.blog.findUniqueOrThrow({ where: { id: testBlog.id } }));
  // await querySucceeds(bridg.blog.aggregate({ where: { id: testBlog.id } }));
  await querySucceeds(bridg.blog.count());
  // await querySucceeds(bridg.blog.groupBy());
});

const TEST_UPDATE_BODY = 'TEST_BLOG_UPDATED';

it('Update rules work with true/false', async () => {
  setRules({ blog: { find: false } });
  const b1 = await bridg.blog.update({ where: { id: testBlog.id }, data: { body: TEST_UPDATE_BODY } }).catch((err) => {
    expect(err).toBeTruthy();
  });
  expect(b1).toBeUndefined();
  const record = await prisma.blog.findFirst({ where: { id: testBlog.id } });
  expect(record?.body).toBeNull(); // record wasn't updated

  setRules({ blog: { update: true } });
  const b2 = await bridg.blog.update({ where: { id: testBlog.id }, data: { body: TEST_UPDATE_BODY } });
  expect(b2).toBeTruthy();
  expect(b2?.body).toBe(TEST_UPDATE_BODY);
});

it('Create rules work with true/false', async () => {
  setRules({ blog: { create: false } });
  const b1 = await bridg.blog.create({ data: { title: TEST_TITLE } }).catch((err) => {
    expect(err).toBeTruthy();
  });
  expect(b1).toBeUndefined();

  setRules({ blog: { create: true } });
  const b2 = await bridg.blog.create({ data: { title: TEST_TITLE } });
  expect(b2).toBeTruthy();
  expect(b2?.title).toBe(TEST_TITLE);
});

it('Delete rules work with true/false', async () => {
  setRules({ blog: { delete: false } });
  const b1 = await bridg.blog.delete({ where: { id: testBlog.id } }).catch((err) => {
    expect(err).toBeTruthy();
  });
  expect(b1).toBeUndefined();

  setRules({ blog: { delete: true } });
  const b2 = await bridg.blog.delete({ where: { id: testBlog.id } });
  expect(b2).toBeTruthy();
  expect(b2?.title).toBe(TEST_TITLE);

  const record = await prisma.blog.findUnique({ where: { id: testBlog.id } });
  expect(record).toBeNull(); // record was deleted
});

afterAll(async () => {
  setRules({});
  await prisma.blog.deleteMany({ where: { title: TEST_TITLE } });
});
