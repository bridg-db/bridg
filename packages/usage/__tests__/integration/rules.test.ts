import { beforeEach, expect, it } from '@jest/globals';
import { mockFetch } from '../__mocks__/fetch.mock';
import bridg from '../generated/bridg';
import { Blog, Prisma, User } from '../generated/prisma';
import prisma, {
  TEST_TITLE,
  TEST_TITLE_2,
  deleteDbData,
  seedDbData,
} from '../utils/prisma.test-util';
import { queryFails, querySucceeds } from '../utils/query.test-util';
import { setRules } from '../utils/rules.test-util';

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

const fetchBlog1 = () => prisma.blog.findFirst({ where: { id: testBlog1.id } });
const fetchBlog2 = () => prisma.blog.findFirst({ where: { id: testBlog2.id } });

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

const TEST_UPDATE_BODY = 'TEST_BLOG_UPDATED';

it('Update rules work with true/false', async () => {
  // FAIL
  setRules({ blog: { update: false } });

  await queryFails(
    bridg.blog.update({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    })
  );
  await queryFails(bridg.blog.updateMany({ data: { body: TEST_UPDATE_BODY } }));

  let record = await fetchBlog1();
  expect(record?.body).toBeNull(); // record wasn't updated

  // SUCCESS
  setRules({ blog: { update: true } });
  await querySucceeds(
    bridg.blog.update({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    })
  );
  await querySucceeds(
    bridg.blog.updateMany({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    })
  );

  record = await fetchBlog1();
  expect(record?.body).toBe(TEST_UPDATE_BODY); // record updated
});

it('Update rules work with where clauses', async () => {
  // FAIL
  await prisma.blog.update({
    where: { id: testBlog1.id },
    data: { body: null },
  });
  setRules({ blog: { update: { title: 'TITLE_THAT_DOESNT_EXIST' } } });

  // query throws bc update should find at least one and it doesnt find any
  await queryFails(
    bridg.blog.update({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    })
  );
  await querySucceeds(bridg.blog.updateMany({ data: { body: TEST_UPDATE_BODY } }), 0);

  expect((await fetchBlog1())?.body).toBeNull(); // record wasn't updated

  // SUCCESS
  setRules({ blog: { update: { title: TEST_TITLE } } });
  await querySucceeds(
    bridg.blog.update({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    })
  );
  await querySucceeds(
    bridg.blog.updateMany({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    }),
    1
  );

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

it('Find rules work on update includes', async () => {
  // FAIL
  setRules({ blog: { update: true }, user: { find: false } });
  await queryFails(
    bridg.blog.update({
      data: { body: '' },
      where: { id: testBlog1.id },
      include: { user: true },
    })
  );
  // DEEP
  setRules({
    blog: { find: true },
    user: { update: true },
    comment: { find: false },
  });
  await queryFails(
    bridg.user.update({
      data: {},
      where: { id: testUser.id },
      include: { blogs: { include: { comments: true } } },
    })
  );

  // SUCCESS
  setRules({ blog: { update: true }, user: { find: true } });
  await querySucceeds(
    bridg.blog.update({
      data: { body: '' },
      where: { id: testBlog1.id },
      include: { user: true },
    })
  );
  // DEEP
  setRules({
    blog: { find: true },
    user: { update: true },
    comment: { find: true },
  });
  await querySucceeds(
    bridg.user.update({
      data: {},
      where: { id: testUser.id },
      include: { blogs: { include: { comments: true } } },
    })
  );
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
    })
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
    })
  );
});

it('Model method rules supercede default rules', async () => {
  setRules({ default: true, blog: { find: false, default: true } });
  await queryFails(bridg.blog.findFirst({ where: { id: testBlog1.id } }));

  setRules({ default: false, blog: { default: false, find: true } });
  await querySucceeds(bridg.blog.findFirst({ where: { id: testBlog1.id } }));
});
it('Default model rules supercede global default rules', async () => {
  setRules({ default: true, blog: { default: false } });
  await queryFails(bridg.blog.findFirst({ where: { id: testBlog1.id } }));

  setRules({ default: false, blog: { default: true } });
  await querySucceeds(bridg.blog.findFirst({ where: { id: testBlog1.id } }));
});
it('Global default rules work', async () => {
  setRules({ default: false });
  await queryFails(bridg.blog.findFirst({ where: { id: testBlog1.id } }));

  setRules({ default: true });
  await querySucceeds(bridg.blog.findFirst({ where: { id: testBlog1.id } }));
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
    })
  );
  await queryFails(
    bridg.user.create({
      data: {
        email: 'charlie@nightcrawlers.io',
        blogs: { create: [{ title: 'my blog' }, { title: 'my blog 2' }] },
      },
    })
  );
  // SUCCESS
  setRules({ user: { create: true }, blog: { create: true } });
  await querySucceeds(
    bridg.user.create({
      data: {
        email: 'charlie@nightcrawlers.io',
        blogs: { create: { title: 'my blog' } },
      },
    })
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

it('Upsert queries correctly use update, then create rules', async () => {
  // FAIL
  // first fails to update nonexistent record, falls back to create
  setRules({ blog: { update: true, create: false } });
  await queryFails(
    bridg.blog.upsert({
      where: { id: 'nonexistent' },
      update: {},
      create: { title: 'hello' },
    })
  );
  // fails immediately when trying to update
  setRules({ blog: { update: false, create: true } });
  await queryFails(
    bridg.blog.upsert({
      where: { id: testBlog1.id },
      update: {},
      create: { title: 'hello' },
    })
  );
  // SUCCESS
  setRules({ blog: { update: { id: 'nonexistent!!' }, create: true } });
  const newBlog = await querySucceeds(
    bridg.blog.upsert({
      where: { id: 'nonexistent' },
      update: {},
      create: { title: 'hello' },
    })
  );
  expect(newBlog.title).toBe('hello');
  setRules({ blog: { update: true, create: false } });
  const editedBlog = await querySucceeds(
    bridg.blog.upsert({
      where: { id: testBlog1.id },
      update: { body: 'edited-body' },
      create: { title: 'hello' },
    })
  );
  expect(editedBlog.body).toBe('edited-body');
  expect(editedBlog.id).toBe(testBlog1.id);
});

it('Update.relation.update rules working', async () => {
  const query = () =>
    bridg.blog.update({
      data: {
        body: 'updated',
        user: { update: { data: { email: 'updated' } } },
      },
      where: { id: testBlog1.id },
    });

  // FAIL
  setRules({ blog: { update: true }, user: { update: false } });
  await queryFails(query());

  // SUCCESS
  setRules({ blog: { update: true }, user: { update: true } });
  await querySucceeds(query());

  const comment = await prisma.comment.create({
    data: { body: 'hello_world', blogId: testBlog1.id },
  });
  const deepUpdate = () =>
    bridg.user.update({
      where: { id: testUser.id },
      data: {
        blogs: {
          update: {
            where: { id: testBlog1.id },
            data: {
              comments: {
                update: {
                  data: { body: 'wow' },
                  where: { id: comment.id },
                },
              },
            },
          },
        },
      },
    });

  // FAIL
  setRules({
    blog: { update: true },
    user: { update: true },
    comment: { update: false },
  });
  await queryFails(deepUpdate());

  // SUCCESS
  setRules({
    blog: { update: true },
    user: { update: true },
    comment: { update: true },
  });
  await querySucceeds(deepUpdate());
});

it('Update.relation.updateMany rules working', async () => {
  const query = () =>
    bridg.user.update({
      data: { blogs: { updateMany: { data: { body: 'cool' }, where: {} } } },
      where: { id: testUser.id },
    });

  // FAIL
  setRules({ blog: { update: false }, user: { update: true } });
  await queryFails(query());

  //  SUCCESS
  setRules({ blog: { update: true }, user: { update: true } });
  await querySucceeds(query());
});

it('Update.relation.connect rules working', async () => {
  const query = () =>
    bridg.blog.update({
      data: { body: 'updated', comments: { connect: { id: comment.id } } },
      where: { id: testBlog1.id },
    });
  const comment = await prisma.comment.create({
    data: { body: 'hello_world' },
  });

  // FAIL
  setRules({ blog: { update: true }, comment: { update: false } });
  await queryFails(query());

  //  SUCCESS
  setRules({ blog: { update: true }, comment: { update: true } });
  await querySucceeds(query());
});

it('Update.relation.create rules working', async () => {
  const query = () =>
    bridg.blog.update({
      data: { body: 'updated', comments: { create: { body: 'hi' } } },
      where: { id: testBlog1.id },
    });

  // FAIL
  setRules({ blog: { update: true }, comment: { create: false } });
  await queryFails(query());

  //  SUCCESS
  setRules({ blog: { update: true }, comment: { create: true } });
  await querySucceeds(query());
});

it('Update.relation.delete rules working', async () => {
  const comment = await prisma.comment.create({
    data: { body: 'hello_world', blogId: testBlog1.id },
  });
  const query = () =>
    bridg.blog.update({
      data: { body: 'updated', comments: { delete: { id: comment.id } } },
      where: { id: testBlog1.id },
    });

  // FAIL
  setRules({ blog: { update: true }, comment: { delete: false } });
  await queryFails(query());

  //  SUCCESS
  setRules({ blog: { update: true }, comment: { delete: true } });
  await querySucceeds(query());
});

it('Update.relation.deleteMany rules working', async () => {
  const query = () =>
    bridg.blog.update({
      data: { body: 'updated', comments: { deleteMany: {} } },
      where: { id: testBlog1.id },
    });

  // FAIL
  setRules({ blog: { update: true }, comment: { delete: false } });
  await queryFails(query());

  //  SUCCESS
  setRules({ blog: { update: true }, comment: { delete: true } });
  await querySucceeds(query());
});

it('Update.relation.connectOrCreate throws error (not supported)', async () => {
  const query = () =>
    bridg.blog.update({
      data: {
        body: 'updated',
        comments: {
          connectOrCreate: { create: { body: '' }, where: { id: '' } },
        },
      },
      where: { id: testBlog1.id },
    });

  // FAIL
  setRules({ blog: { update: true }, comment: { update: true } });
  await queryFails(query());
});

it('Update.relation.disconnect throws error (not supported)', async () => {
  const comment = await prisma.comment.create({
    data: { body: 'hello_world', blogId: testBlog1.id },
  });
  const query = () =>
    bridg.blog.update({
      data: { body: 'updated', comments: { disconnect: [{ id: comment.id }] } },
      where: { id: testBlog1.id },
    });

  // FAIL
  setRules({ blog: { update: true }, comment: { update: true } });
  await queryFails(query());
});

it('Update.relation.set throws error (not supported)', async () => {
  const comment = await prisma.comment.create({
    data: { body: 'hello_world', blogId: testBlog1.id },
  });
  const query = () =>
    bridg.blog.update({
      data: { body: 'updated', comments: { set: [{ id: comment.id }] } },
      where: { id: testBlog1.id },
    });

  // FAIL
  setRules({ blog: { update: true }, comment: { update: true } });
  await queryFails(query());
});

it('Update.relation.upsert throws error (not supported)', async () => {
  const comment = await prisma.comment.create({
    data: { body: 'hello_world', blogId: testBlog1.id },
  });
  const query = () =>
    bridg.blog.update({
      data: {
        body: 'updated',
        comments: {
          upsert: {
            create: { body: 'a' },
            update: { body: 'b' },
            where: { id: comment.id },
          },
        },
      },
      where: { id: testBlog1.id },
    });

  // FAIL
  setRules({ default: true });
  await queryFails(query());
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
