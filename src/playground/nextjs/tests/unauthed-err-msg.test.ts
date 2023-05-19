import bridg from 'tests/bridg/client-db';
import { setRules } from 'tests/bridg/test-rules';
import { afterAll, beforeEach, expect, it } from 'vitest';

const TEST_TITLE = 'TEST_BLOG';

beforeEach(async () => {
  setRules({});
});

afterAll(async () => {
  setRules({});
});

const expectErr = async (query: Promise<any>, msg: string) => {
  const data = await query.catch((err) => {
    expect(err).toBeTruthy();
    expect(err.message.includes(msg)).toBeTruthy();
  });
  expect(data).toBeUndefined();
};

it('Unauthed Err message reflects correct failing model', async () => {
  await expectErr(bridg.blog.findMany(), ': blog');
  setRules({ blog: { find: true } });
  await expectErr(bridg.blog.findMany({ where: { title: TEST_TITLE }, include: { user: true } }), ': user');
});
