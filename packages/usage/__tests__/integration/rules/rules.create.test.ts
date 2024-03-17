import { beforeEach, expect, it } from '@jest/globals';
import bridg from '../../generated/bridg';
import { Blog, User } from '../../generated/prisma';
import prisma, { TEST_TITLE_2, deleteDbData, seedDbData } from '../../utils/prisma.test-util';
import { queryFails, querySucceeds } from '../../utils/query.test-util';
import { setRules } from '../../utils/rules.test-util';
import { TEST_TITLE } from './../../utils/prisma.test-util';

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

it('Create boolean rules work when creating related models', async () => {
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
  await querySucceeds(
    bridg.user.create({
      data: {
        email: 'charlie2@nightcrawlers.io',
        blogs: { create: [{ title: 'my blog' }, { title: 'my blog 2' }] },
      },
    }),
  );
});

it('Create callback rules work when creating related models', async () => {
  setRules({
    user: { create: true },
    blog: { create: (uid, data) => data?.title === TEST_TITLE },
  });

  // FLAT NESTED
  await queryFails(
    bridg.user.create({
      data: {
        email: 'charlie@nightcrawlers.io',
        blogs: { create: { title: TEST_TITLE_2 } },
      },
    }),
  );
  await querySucceeds(
    bridg.user.create({
      data: {
        email: 'charlie2@nightcrawlers.io',
        blogs: { create: { title: TEST_TITLE } },
      },
    }),
  );

  // ARRAY NESTED
  await queryFails(
    bridg.user.create({
      data: {
        email: 'charlie3@nightcrawlers.io',
        blogs: { create: [{ title: TEST_TITLE }, { title: TEST_TITLE_2 }] },
      },
    }),
  );

  await querySucceeds(
    bridg.user.create({
      data: {
        email: 'charlie4@nightcrawlers.io',
        blogs: { create: [{ title: TEST_TITLE }, { title: TEST_TITLE }] },
      },
    }),
  );
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

it('createMany works with true/false', async () => {
  // FAIL
  setRules({ blog: { create: false } });
  await queryFails(
    bridg.blog.createMany({
      data: [{ title: TEST_TITLE }, { title: TEST_TITLE }],
    }),
  );

  // SUCCESS
  setRules({ blog: { create: true } });
  await querySucceeds(bridg.blog.createMany({ data: [{ title: 'a' }] }), 1);

  const bA = await prisma.blog.findMany({ where: { title: 'a' } });
  expect(bA.length).toBe(1);
  expect(bA?.at(0)?.title).toBe('a');

  await querySucceeds(bridg.blog.createMany({ data: [{ title: 'b' }, { title: 'c' }] }), 2);

  const bB = await prisma.blog.findMany({ where: { title: { in: ['b', 'c'] } } });
  expect(bB.length).toBe(2);
  expect(bB?.at(0)?.title).toBe('b');
  expect(bB?.at(1)?.title).toBe('c');
});

it('createMany works with callback', async () => {
  // FAIL
  setRules({
    blog: {
      create: (uid, data) => data?.title !== TEST_TITLE_2,
    },
  });
  await queryFails(
    bridg.blog.createMany({
      data: [{ title: TEST_TITLE }, { title: TEST_TITLE_2 }],
    }),
  );

  // SUCCESS
  await querySucceeds(
    bridg.blog.createMany({
      data: [{ title: TEST_TITLE }, { title: 'some-other-legal-value' }],
    }),
    2,
  );
});

// TODO: test that create callbacks work for relational creates on .update,
//  with both array and object data

// as of 2024-03-17, createMany does allow creating related models
// if that changes, we will need to add tests ensuring that bridg protects those queries
