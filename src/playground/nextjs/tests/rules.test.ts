import { Blog, Prisma, PrismaClient, User } from '@prisma/client';
import bridg from 'tests/bridg/client-db';
import { setRules } from 'tests/bridg/test-rules';
import { afterAll, beforeAll, beforeEach, expect, it, test } from 'vitest';

const prisma = new PrismaClient();

const TEST_TITLE = 'TEST_BLOG';
const TEST_TITLE_2 = 'TEST_BLOG_2';
let testBlog1: Blog;
let testBlog2: Blog;
let testUser: User;

beforeEach(async () => {
  setRules({});
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();
  testUser = await prisma.user.create({ data: { email: 'johndoe@gmail.com' } });
  testBlog1 = await prisma.blog.create({ data: { title: TEST_TITLE, userId: testUser.id } });
  testBlog2 = await prisma.blog.create({ data: { title: TEST_TITLE_2, userId: testUser.id } });
});

afterAll(async () => {
  setRules({});
});

const fetchBlog1 = () => prisma.blog.findFirst({ where: { id: testBlog1.id } });
const fetchBlog2 = () => prisma.blog.findFirst({ where: { id: testBlog2.id } });

const queryFails = async (query: Promise<any>) => {
  const data = await query.catch((err) => {
    expect(err).toBeTruthy();
  });
  expect(data).toBeUndefined();
};

const querySucceeds = async (query: Promise<any>, resultCount = 1) => {
  const data = await query;

  if (Array.isArray(data)) {
    expect(data.length).toBe(resultCount);
  } else if (data?.count !== undefined) {
    expect(data.count).toBe(resultCount);
  } else {
    resultCount === 0 && expect(data).toBeNull();
    resultCount === 1 && expect(data).toBeTruthy();
    if (resultCount > 1) throw Error('Expected array, but received ', data);
  }

  return data;
};

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
  await queryFails(bridg.blog.groupBy());
  await queryFails(bridg.blog.aggregate({ where: { id: testBlog1.id } }));

  // SUCCESS
  setRules({ blog: { find: true } });
  await querySucceeds(bridg.blog.findMany(), 2);
  await querySucceeds(bridg.blog.findFirst({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findFirstOrThrow({ where: { title: TEST_TITLE } }));
  await querySucceeds(bridg.blog.findUnique({ where: { id: testBlog1.id } }));
  await querySucceeds(bridg.blog.findUniqueOrThrow({ where: { id: testBlog1.id } }));
  await querySucceeds(bridg.blog.count());
  // TODO:
  // await querySucceeds(bridg.blog.groupBy());
  // await querySucceeds(bridg.blog.aggregate({ where: { id: testBlog.id } }));
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

const TEST_UPDATE_BODY = 'TEST_BLOG_UPDATED';

it('Update rules work with true/false', async () => {
  // FAIL
  setRules({ blog: { update: false } });

  await queryFails(bridg.blog.update({ where: { id: testBlog1.id }, data: { body: TEST_UPDATE_BODY } }));
  await queryFails(bridg.blog.updateMany({ data: { body: TEST_UPDATE_BODY } }));

  let record = await fetchBlog1();
  expect(record?.body).toBeNull(); // record wasn't updated

  // SUCCESS
  setRules({ blog: { update: true } });
  await querySucceeds(bridg.blog.update({ where: { id: testBlog1.id }, data: { body: TEST_UPDATE_BODY } }));
  await querySucceeds(bridg.blog.updateMany({ where: { id: testBlog1.id }, data: { body: TEST_UPDATE_BODY } }));

  record = await fetchBlog1();
  expect(record?.body).toBe(TEST_UPDATE_BODY); // record updated
});

it('Update rules work with where clauses', async () => {
  // FAIL
  await prisma.blog.update({ where: { id: testBlog1.id }, data: { body: null } });
  setRules({ blog: { update: { title: 'TITLE_THAT_DOESNT_EXIST' } } });

  // query throws bc update should find at least one and it doesnt find any
  await queryFails(bridg.blog.update({ where: { id: testBlog1.id }, data: { body: TEST_UPDATE_BODY } }));
  await querySucceeds(bridg.blog.updateMany({ data: { body: TEST_UPDATE_BODY } }), 0);

  expect((await fetchBlog1())?.body).toBeNull(); // record wasn't updated

  // SUCCESS
  setRules({ blog: { update: { title: TEST_TITLE } } });
  await querySucceeds(bridg.blog.update({ where: { id: testBlog1.id }, data: { body: TEST_UPDATE_BODY } }));
  await querySucceeds(bridg.blog.updateMany({ where: { id: testBlog1.id }, data: { body: TEST_UPDATE_BODY } }), 1);

  expect((await fetchBlog1())?.body).toBe(TEST_UPDATE_BODY); // record updated
  expect((await fetchBlog2())?.body).toBeNull(); // not updated bc didn't fullfill where clause
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

it('Find rules work with nested relations', async () => {
  // FAIL
  setRules({ blog: { find: true }, user: { find: false } });
  await queryFails(bridg.blog.findMany({ include: { user: true } }));
  await queryFails(bridg.blog.findFirst({ include: { user: true } }));
  await queryFails(bridg.blog.findFirstOrThrow({ include: { user: true } }));
  await queryFails(bridg.blog.findUnique({ where: { id: testBlog1.id }, include: { user: true } }));
  await queryFails(bridg.blog.findUniqueOrThrow({ where: { id: testBlog1.id }, include: { user: true } }));

  // SUCCESS
  setRules({ blog: { find: true }, user: { find: true } });
  await querySucceeds(bridg.blog.findMany({ include: { user: true } }), 2);
  await querySucceeds(bridg.blog.findFirst({ include: { user: true } }));
  await querySucceeds(bridg.blog.findFirstOrThrow({ include: { user: true } }));
  await querySucceeds(bridg.blog.findUnique({ where: { id: testBlog1.id }, include: { user: true } }));
  await querySucceeds(bridg.blog.findUniqueOrThrow({ where: { id: testBlog1.id }, include: { user: true } }));

  // DOUBLE NESTED RELATIONS
  // FAIL
  setRules({ blog: { find: true }, user: { find: true }, comment: { find: false } });
  const include: Prisma.UserInclude = { blogs: { include: { comments: true } } };
  await queryFails(bridg.user.findMany({ include }));
  await queryFails(bridg.user.findFirst({ include }));
  await queryFails(bridg.user.findFirstOrThrow({ include }));
  await queryFails(bridg.user.findUnique({ where: { id: testBlog1.id }, include }));
  await queryFails(bridg.user.findUniqueOrThrow({ where: { id: testBlog1.id }, include }));

  //SUCCESS
  setRules({ blog: { find: true }, user: { find: true }, comment: { find: true } });
  await querySucceeds(bridg.user.findMany({ include }));
  await querySucceeds(bridg.user.findFirst({ include }));
  await querySucceeds(bridg.user.findFirstOrThrow({ include }));
  await querySucceeds(bridg.user.findUnique({ where: { id: testUser.id }, include }));
  await querySucceeds(bridg.user.findUniqueOrThrow({ where: { id: testUser.id }, include }));
});

it('Find rules work on update includes', async () => {
  // FAIL
  setRules({ blog: { update: true }, user: { find: false } });
  await queryFails(bridg.blog.update({ data: { body: '' }, where: { id: testBlog1.id }, include: { user: true } }));

  //  SUCCESS
  setRules({ blog: { update: true }, user: { find: true } });
  await querySucceeds(bridg.blog.update({ data: { body: '' }, where: { id: testBlog1.id }, include: { user: true } }));
});

// TODO: these are not covered yet. vulnerability
// it('Update rules work on related models', async () => {
//   // connect, connectOrCreate, create, delete, deleteMany, disconnect, set, update, updateMany, upsert
//   // FAIL
//   setRules({ blog: { update: true }, user: { update: false, find: true } });
//   // child.update
//   await queryFails(
//     bridg.blog.update({
//       data: { body: 'updated', user: { update: { data: { email: 'updated' } } } },
//       where: { id: testBlog1.id },
//       include: { user: true },
//     }),
//   );
//   setRules({ blog: { update: true }, comment: { update: false } });
//   // child.connect
//   const comment = await bridg.comment.create({ data: { body: 'hello_world' } });
//   await queryFails(
//     bridg.blog.update({
//       data: { body: 'updated', comments: { connect: { id: comment.id } } },
//       where: { id: testBlog1.id },
//     }),
//   );

//   //  SUCCESS
//   setRules({ blog: { update: true }, user: { update: true } });
//   await querySucceeds(
//     bridg.blog.update({ data: { body: '', user: { update: { data: { email: '' } } } }, where: { id: testBlog1.id } }),
//   );
//   await querySucceeds(
//     bridg.blog.update({
//       data: { body: 'updated', comments: { connect: { id: comment.id } } },
//       where: { id: testBlog1.id },
//     }),
//   );
// });
