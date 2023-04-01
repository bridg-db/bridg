import { it, expect, beforeAll } from 'vitest';
import bridg from 'tests/bridg/client-db';
import { PrismaClient } from '@prisma/client';
import { setRules } from 'tests/bridg/test-rules';
import { afterEach, beforeEach } from 'node:test';

console.log('breh');

const prisma = new PrismaClient();

const TEST_TITLE = 'TEST_BLOG';
beforeAll(async () => {
  await prisma.blog.create({ data: { title: TEST_TITLE } });
});

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
