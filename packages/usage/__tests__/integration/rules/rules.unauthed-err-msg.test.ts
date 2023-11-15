import { mockFetch } from '../../__mocks__/fetch.mock';
import bridg from '../../generated/bridg';
import { expectQueryError } from '../../utils/query.test-util';
import { setRules } from '../../utils/rules.test-util';

global.fetch = mockFetch;

const TEST_TITLE = 'TEST_BLOG';

beforeEach(async () => {
  setRules({});
});

afterAll(async () => {
  setRules({});
});

it('Unauthed Err message reflects correct failing model', async () => {
  await expectQueryError(bridg.blog.findMany(), ': blog');
  setRules({ blog: { find: true } });
  await expectQueryError(
    bridg.blog.findMany({
      where: { title: TEST_TITLE },
      include: { user: true },
    }),
    ': user'
  );
});
