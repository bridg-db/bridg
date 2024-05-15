import { beforeEach, it } from '@jest/globals';
import bridg from '../../generated/bridg/index';
import { Blog, User } from '../../generated/prisma';
import prisma, { TEST_TITLE, deleteDbData, seedDbData } from '../../utils/prisma.test-util';
import { queryFails, querySucceeds } from '../../utils/query.test-util';
import { setRules } from '../../utils/rules.test-util';

let testBlog1: Blog;
let testBlog2: Blog;
let testUser: User;

const fetchBlog1 = () => prisma.blog.findFirst({ where: { id: testBlog1.id } });
const fetchBlog2 = () => prisma.blog.findFirst({ where: { id: testBlog2.id } });

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

const TEST_UPDATE_BODY = 'TEST_BLOG_UPDATED';

it('Update rules work with true/false', async () => {
  // FAIL
  setRules({ blog: { update: false } });

  await queryFails(
    bridg.blog.update({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    }),
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
    }),
  );
  await querySucceeds(
    bridg.blog.updateMany({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    }),
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
    }),
  );
  await querySucceeds(bridg.blog.updateMany({ data: { body: TEST_UPDATE_BODY } }), 0);

  expect((await fetchBlog1())?.body).toBeNull(); // record wasn't updated

  // SUCCESS
  setRules({ blog: { update: { title: TEST_TITLE } } });
  await querySucceeds(
    bridg.blog.update({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    }),
  );
  await querySucceeds(
    bridg.blog.updateMany({
      where: { id: testBlog1.id },
      data: { body: TEST_UPDATE_BODY },
    }),
    1,
  );

  expect((await fetchBlog1())?.body).toBe(TEST_UPDATE_BODY); // record updated
  expect((await fetchBlog2())?.body).toBeNull(); // not updated bc didn't fullfill where clause
});

it('Find rules work on update includes', async () => {
  // FAIL
  setRules({ blog: { update: true }, user: { find: false } });
  await queryFails(
    bridg.blog.update({
      data: { body: '' },
      where: { id: testBlog1.id },
      include: { user: true },
    }),
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
    }),
  );

  // SUCCESS
  setRules({ blog: { update: true }, user: { find: true } });
  await querySucceeds(
    bridg.blog.update({
      data: { body: '' },
      where: { id: testBlog1.id },
      include: { user: true },
    }),
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
    }),
  );
});

// NESTED UPDATES
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
