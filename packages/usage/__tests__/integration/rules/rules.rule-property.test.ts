import { beforeEach, expect, it } from '@jest/globals';
import { mockFetch } from '../../__mocks__/fetch.mock';
import bridg from '../../generated/bridg';
import { Blog, User } from '../../generated/prisma';
import { TEST_TITLE, deleteDbData, seedDbData } from '../../utils/prisma.test-util';
import { queryFails, querySucceeds } from '../../utils/query.test-util';
import { setRules } from '../../utils/rules.test-util';

global.fetch = mockFetch;

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

it('Supports model.rule property as an alternative for setting rules', async () => {
  // FAIL
  setRules({
    blog: {
      create: { rule: false },
      find: { rule: { id: 'nonexistent' } },
      update: { rule: () => false },
    },
  });
  await queryFails(bridg.blog.create({ data: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findMany(), 0);
  await queryFails(
    bridg.blog.update({
      where: { id: testBlog1.id },
      data: { title: 'updated' },
    })
  );

  // SUCCESS
  setRules({
    blog: {
      create: { rule: true },
      find: { rule: { id: testBlog1.id } },
      update: { rule: () => ({ id: testBlog1.id }) },
    },
  });
  const b1 = await querySucceeds(bridg.blog.create({ data: { title: TEST_TITLE } }));
  expect(b1?.title).toBe(TEST_TITLE);
  await querySucceeds(bridg.blog.create({ data: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findMany(), 1);
  await querySucceeds(
    bridg.blog.update({
      where: { id: testBlog1.id },
      data: { title: 'updated' },
    })
  );
});
