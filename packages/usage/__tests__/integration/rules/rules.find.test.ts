import { beforeEach, it } from '@jest/globals';
import { mockFetch } from '../../__mocks__/fetch.mock';
import bridg from '../../generated/bridg';
import { Blog, Prisma, User } from '../../generated/prisma';
import { TEST_TITLE, TEST_TITLE_2, deleteDbData, seedDbData } from '../../utils/prisma.test-util';
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

it('Find rules work with true/false', async () => {
  // FAIL
  setRules({ blog: { find: false } });

  await queryFails(bridg.blog.findMany({ where: { title: TEST_TITLE } }));
  await queryFails(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await queryFails(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await queryFails(bridg.blog.findUnique({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.findUniqueOrThrow({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.aggregate({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.count());
  await queryFails(bridg.blog.groupBy({}));

  // SUCCESS
  setRules({ blog: { find: true } });
  await querySucceeds(bridg.blog.findMany(), 2);
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findUnique({ where: { id: testBlog1.id } }));
  await querySucceeds(bridg.blog.findUniqueOrThrow({ where: { id: testBlog1.id } }));
  await querySucceeds(bridg.blog.count());
  // TODO: await querySucceeds(bridg.blog.groupBy());
  // await querySucceeds(bridg.blog.aggregate({ where: { id: testBlog1.id } }));
});

it('Find rules work with where clauses', async () => {
  // FAIL
  setRules({ blog: { find: { title: 'SOMETHING_THAT_ISNT_IN_THE_DB' } } });
  await querySucceeds(bridg.blog.findMany({ where: { title: TEST_TITLE } }), 0);
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }), 0);
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }), 0);
  await querySucceeds(bridg.blog.findUnique({ where: { id: testBlog1.id } }), 0);
  // throws error (fails), bc of method
  await queryFails(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await queryFails(bridg.blog.findUniqueOrThrow({ where: { id: testBlog1.id } }));

  // SUCCESS
  setRules({ blog: { find: { title: TEST_TITLE } } });
  await querySucceeds(bridg.blog.findMany(), 1);
  await querySucceeds(bridg.blog.findMany({ where: { title: TEST_TITLE_2 } }), 0);
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findUnique({ where: { id: testBlog1.id } }));
  await querySucceeds(bridg.blog.findUniqueOrThrow({ where: { id: testBlog1.id } }));
  await querySucceeds(bridg.blog.count());
  // TODO:
  // await querySucceeds(bridg.blog.aggregate({ where: { id: testBlog.id } }));
  // await querySucceeds(bridg.blog.groupBy());
});

it('Find rules work with nested relations', async () => {
  // FAIL
  setRules({ blog: { find: true }, user: { find: false } });
  await queryFails(bridg.blog.findMany({ include: { user: true } }));
  await queryFails(bridg.blog.findFirst({ include: { user: true } }));
  await queryFails(bridg.blog.findFirstOrThrow({ include: { user: true } }));
  await queryFails(
    bridg.blog.findUnique({
      where: { id: testBlog1.id },
      include: { user: true },
    })
  );
  await queryFails(
    bridg.blog.findUniqueOrThrow({
      where: { id: testBlog1.id },
      include: { user: true },
    })
  );

  // SUCCESS
  setRules({ blog: { find: true }, user: { find: true } });
  await querySucceeds(bridg.blog.findMany({ include: { user: true } }), 2);
  await querySucceeds(bridg.blog.findFirst({ include: { user: true } }));
  await querySucceeds(bridg.blog.findFirstOrThrow({ include: { user: true } }));
  await querySucceeds(
    bridg.blog.findUnique({
      where: { id: testBlog1.id },
      include: { user: true },
    })
  );
  await querySucceeds(
    bridg.blog.findUniqueOrThrow({
      where: { id: testBlog1.id },
      include: { user: true },
    })
  );

  // DOUBLE NESTED RELATIONS
  // FAIL
  setRules({
    blog: { find: true },
    user: { find: true },
    comment: { find: false },
  });
  const include: Prisma.UserInclude = {
    blogs: { include: { comments: true } },
  };
  await queryFails(bridg.user.findMany({ include }));
  await queryFails(bridg.user.findFirst({ include }));
  await queryFails(bridg.user.findFirstOrThrow({ include }));
  await queryFails(bridg.user.findUnique({ where: { id: testBlog1.id }, include }));
  await queryFails(bridg.user.findUniqueOrThrow({ where: { id: testBlog1.id }, include }));

  //SUCCESS
  setRules({
    blog: { find: true },
    user: { find: true },
    comment: { find: true },
  });
  await querySucceeds(bridg.user.findMany({ include }));
  await querySucceeds(bridg.user.findFirst({ include }));
  await querySucceeds(bridg.user.findFirstOrThrow({ include }));
  await querySucceeds(bridg.user.findUnique({ where: { id: testUser.id }, include }));
  await querySucceeds(bridg.user.findUniqueOrThrow({ where: { id: testUser.id }, include }));
});

it('Find rules work with AND', async () => {
  setRules({ blog: { find: { id: testBlog2.id } } });
  await querySucceeds(
    bridg.blog.findMany({ where: { AND: [{ body: testBlog2.body }, { title: testBlog2.title }] } }),
    1
  );
  await querySucceeds(
    bridg.blog.findMany({ where: { AND: [{ body: testBlog2.body }, { title: testBlog1.title }] } }),
    0
  );
  await querySucceeds(bridg.blog.findMany({ where: { AND: [{ title: testBlog1.title }] } }), 0);
});
