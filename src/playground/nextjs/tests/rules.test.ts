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

it('Find rules work with true/false', async () => {
  setRules({ blog: { find: true } });

  const b1 = await bridg.blog.findFirst({ where: { title: TEST_TITLE } });
  expect(b1).toBeTruthy();
  expect(b1?.title).toBe(TEST_TITLE);

  setRules({ blog: { find: false } });
  const b2 = await bridg.blog.findFirst({ where: { title: TEST_TITLE } }).catch((err) => {
    expect(err).toBeTruthy();
  });
  expect(b2).toBeUndefined();
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
