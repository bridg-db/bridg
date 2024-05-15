import { beforeEach, it } from '@jest/globals';
import bridg from '../../generated/bridg';
import { Blog, User } from '../../generated/prisma';
import { TEST_TITLE, deleteDbData, seedDbData } from '../../utils/prisma.test-util';
import { queryFails, querySucceeds } from '../../utils/query.test-util';
import { setRules } from '../../utils/rules.test-util';

let testBlog1: Blog;
let testBlog2: Blog;
let testUser: User;

const resetTestData = () =>
  seedDbData({
    userData: { email: 'johndoe@gmail.com' },
    blogData: { comments: { create: { body: 'test-comment' } } },
  }).then((r) => {
    testUser = r.testUser;
    testBlog1 = r.testBlog1;
    testBlog2 = r.testBlog2;
  });

beforeEach(async () => {
  setRules({});
  await deleteDbData();
  await resetTestData();
});

it('Find rules work with true/false', async () => {
  // FAIL
  setRules({ blog: { create: false } });
  const data = [{ title: TEST_TITLE }, { title: TEST_TITLE }];
  await queryFails(bridg.blog.createMany({ data }));
  await queryFails(bridg.blog.createManyAndReturn({ data }));

  // SUCCESS
  setRules({ blog: { create: true } });
  await querySucceeds(bridg.blog.createMany({ data: [{ title: 'a' }] }), 1);
  await querySucceeds(bridg.blog.createManyAndReturn({ data: [{ title: 'b' }] }), 1);
});
