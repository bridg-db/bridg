import { mockFetch } from './__mocks__/fetch.mock';
import bridg from './generated/bridg';
import { setRules } from './utils/test-rules';

global.fetch = mockFetch;

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
  await expectErr(
    bridg.blog.findMany({
      where: { title: TEST_TITLE },
      include: { user: true },
    }),
    ': user'
  );
});

it('fake-test', () => {
  expect(true).toBe(true);
});
