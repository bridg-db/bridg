import { PrismaClient } from '@prisma/client';
import bridg from 'tests/bridg/client-db';
import { setRules } from 'tests/bridg/test-rules';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

console.log('breh');

const prisma = new PrismaClient();

const TEST_TITLE = 'TEST_BLOG';
beforeAll(async () => {
  await prisma.blog.create({ data: { title: TEST_TITLE } });
});

beforeEach(() => setRules({}));

it('can find', async () => {
  setRules({ blog: { find: true } });

  const res = await bridg.blog.findFirst({ where: { title: TEST_TITLE } });
  expect(res).toBeTruthy();
  expect(res?.title).toBe(TEST_TITLE);
});

it('cant find if rules block', async () => {
  setRules({ blog: { find: false } });

  const res = await bridg.blog.findFirst({ where: { title: TEST_TITLE } }).catch((err) => {
    expect(err).toBeTruthy();
  });

  expect(res).toBeUndefined();
});

afterAll(async () => {
  setRules({});
  await prisma.blog.deleteMany({ where: { title: TEST_TITLE } });
});
