import { beforeEach, expect, it } from '@jest/globals';
import bridg from '../../generated/bridg/index';
import { Blog, Prisma, User } from '../../generated/prisma';
import prisma, {
  TEST_TITLE,
  TEST_TITLE_2,
  deleteDbData,
  seedDbData,
} from '../../utils/prisma.test-util';
import { queryFails, querySucceeds } from '../../utils/query.test-util';
import { setRules } from '../../utils/rules.test-util';

const fetchBlog1 = () => prisma.blog.findFirst({ where: { id: testBlog1.id } });
const fetchBlog2 = () => prisma.blog.findFirst({ where: { id: testBlog2.id } });

const x = [prisma, expect, it, bridg, Prisma, TEST_TITLE, TEST_TITLE_2, queryFails, querySucceeds];

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

it('Delete rules work with true/false', async () => {
  // FAIL
  setRules({ blog: { delete: false } });
  await queryFails(bridg.blog.delete({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.deleteMany({ where: { id: testBlog1.id } }));

  // SUCCESS
  setRules({ blog: { delete: true } });
  await querySucceeds(bridg.blog.delete({ where: { id: testBlog1.id } }));
  testBlog1 = await prisma.blog.create({ data: { title: TEST_TITLE } });
  await querySucceeds(bridg.blog.deleteMany({ where: { id: testBlog1.id } }));

  expect(await fetchBlog1()).toBeNull(); // record was deleted
});

it('Delete rules work with where clauses', async () => {
  // FAIL
  setRules({ blog: { delete: { title: 'TITLE_THAT_DOESNT_EXIST' } } });
  await queryFails(bridg.blog.delete({ where: { id: testBlog1.id } }));
  await querySucceeds(bridg.blog.deleteMany({ where: { id: testBlog1.id } }), 0);

  // SUCCESS
  setRules({ blog: { delete: { title: TEST_TITLE } } });
  await querySucceeds(bridg.blog.delete({ where: { id: testBlog1.id } }));
  expect(await fetchBlog1()).toBeNull();
  expect(await fetchBlog2()).toBeTruthy();

  testBlog1 = await prisma.blog.create({ data: { title: TEST_TITLE } });
  expect(await fetchBlog1()).toBeTruthy();
  await querySucceeds(bridg.blog.deleteMany({ where: { id: testBlog1.id } }));
  expect(await fetchBlog1()).toBeNull();
  expect(await fetchBlog2()).toBeTruthy();
});

it('Find rules work on delete includes', async () => {
  // FAIL
  setRules({ blog: { delete: true }, user: { find: false } });
  await queryFails(bridg.blog.delete({ where: { id: testBlog1.id }, include: { user: true } }));
  // DEEP
  setRules({
    blog: { find: true },
    user: { delete: true },
    comment: { find: false },
  });
  await queryFails(
    bridg.user.delete({
      where: { id: testUser.id },
      include: { blogs: { include: { comments: true } } },
    }),
  );

  // SUCCESS
  setRules({ blog: { delete: true }, user: { find: true } });
  await querySucceeds(bridg.blog.delete({ where: { id: testBlog1.id }, include: { user: true } }));
  // DEEP
  setRules({
    blog: { find: true },
    user: { delete: true },
    comment: { find: true },
  });
  await querySucceeds(
    bridg.user.delete({
      where: { id: testUser.id },
      include: { blogs: { include: { comments: true } } },
    }),
  );
});
