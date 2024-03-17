import { beforeEach, expect, it } from '@jest/globals';
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

it('Create rules work with true/false', async () => {
  // FAIL
  setRules({ blog: { create: false } });
  await queryFails(bridg.blog.create({ data: { title: TEST_TITLE } }));
  // TODO: createMany not supported via SQLite
  // await queryFails(bridg.blog.createMany({}));

  // SUCCESS
  setRules({ blog: { create: true } });
  const b1 = await querySucceeds(bridg.blog.create({ data: { title: TEST_TITLE } }));
  expect(b1?.title).toBe(TEST_TITLE);
});

it('Create rules work when creating related models', async () => {
  // FAIL
  setRules({ user: { create: true }, blog: { create: false } });
  await queryFails(
    bridg.user.create({
      data: {
        email: 'charlie@nightcrawlers.io',
        blogs: { create: { title: 'my blog' } },
      },
    }),
  );
  await queryFails(
    bridg.user.create({
      data: {
        email: 'charlie@nightcrawlers.io',
        blogs: { create: [{ title: 'my blog' }, { title: 'my blog 2' }] },
      },
    }),
  );
  // SUCCESS
  setRules({ user: { create: true }, blog: { create: true } });
  await querySucceeds(
    bridg.user.create({
      data: {
        email: 'charlie@nightcrawlers.io',
        blogs: { create: { title: 'my blog' } },
      },
    }),
  );
  // TODO: this throws an error, not appropriately handling checks for when they pass an array
  // await querySucceeds(
  //   bridg.user.create({
  //     data: {
  //       email: 'charlie@nightcrawlers.io',
  //       blogs: { create: [{ title: 'my blog' }, { title: 'my blog 2' }] },
  //     },
  //   }),
  // );
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
    }),
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
});
