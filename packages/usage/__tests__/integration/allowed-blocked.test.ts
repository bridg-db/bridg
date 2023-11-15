import { beforeEach, expect, it } from '@jest/globals';
import { mockFetch } from '../__mocks__/fetch.mock';
import bridg from '../generated/bridg';
import { Blog, User } from '../generated/prisma';
import { deleteDbData, seedDbData } from '../utils/prisma.test-util';
import { queryFails, querySucceeds } from '../utils/query.test-util';
import { setRules } from '../utils/rules.test-util';

global.fetch = mockFetch;

let testUser: User;
let testBlog1: Blog;
let testBlog2: Blog;

const resetTestData = () =>
  seedDbData().then((r) => {
    testUser = r.testUser;
    testBlog1 = r.testBlog1;
    testBlog2 = r.testBlog2;
  });

beforeEach(async () => {
  setRules({});
  await deleteDbData();
  await resetTestData();
});

const blogFields = [
  'id',
  'createdAt',
  'updatedAt',
  'title',
  'body',
  'published',
  'viewCount',
  'userId',
  'user',
  'comments',
] as const;
type BlogField = typeof blogFields[number];
const userFields = ['id', 'name', 'email', 'image', 'createdAt', 'updatedAt', 'blogs'] as const;
type UserField = typeof userFields[number];

const getAllowedEquivalentForUserFields = (blockedFields: UserField[]) =>
  userFields.filter((k) => !blockedFields.includes(k as UserField)) as UserField[];
const getAllowedEquivalentForBlogFields = (blockedFields: BlogField[]) =>
  blogFields.filter((k) => !blockedFields.includes(k as BlogField)) as BlogField[];

it('Allowed/blocked property prevents reading fields', async () => {
  const shallowFindTest = async () => {
    const findMany1 = await querySucceeds(bridg.blog.findMany(), 2);
    expect(findMany1[0].title).toBeUndefined();
    expect(findMany1[0].published).toBeUndefined();
    expect(findMany1[0].id).toBeTruthy();

    const findFirst1 = await querySucceeds(bridg.blog.findFirst());
    expect(findFirst1.title).toBeUndefined();
    expect(findFirst1.published).toBeUndefined();
    expect(findFirst1.id).toBeDefined();

    setRules({ blog: { find: { rule: true, blockedFields: ['id'] } } });
    const findMany2 = await querySucceeds(bridg.blog.findMany(), 2);
    expect(findMany2[0].title).toBeTruthy();
    expect(findMany2[0].published).toBeDefined();
    expect(findMany2[0].id).toBeUndefined();
  };
  const blockedFields: (keyof Blog)[] = ['title', 'published'];
  // find.blocked
  setRules({ blog: { find: { rule: true, blockedFields: blockedFields } } });
  await shallowFindTest();
  // model.blocked
  setRules({ blog: { find: true, blockedFields: blockedFields } });
  await shallowFindTest();
  const allowedFieldsFields = getAllowedEquivalentForBlogFields(blockedFields);
  // find.allowedFields
  setRules({
    blog: {
      find: { rule: true, allowedFields: allowedFieldsFields },
    },
  });
  await shallowFindTest();
  // model.allowedFields
  setRules({ blog: { find: true, allowedFields: allowedFieldsFields } });

  await shallowFindTest();

  const nestedFindTest = async () => {
    const findMany3 = await querySucceeds(
      bridg.blog.findMany({ include: { user: { include: { blogs: true } } } }),
      2
    );

    expect(findMany3[0].title).toBeUndefined();
    expect(findMany3[0].user.id).toBeDefined();
    expect(findMany3[0].user.email).toBeUndefined();
    // double nested
    expect(findMany3[0].user.blogs[0].title).toBeUndefined();
    expect(findMany3[0].user.blogs[0].id).toBeDefined();
  };
  const blogNestedBlocked = ['title'] as BlogField[];
  const userNestedBlocked = ['email'] as UserField[];
  setRules({
    blog: { find: { rule: true, blockedFields: blogNestedBlocked } },
    user: { find: { rule: true, blockedFields: userNestedBlocked } },
  });
  await nestedFindTest();
  setRules({
    blog: { find: true, blockedFields: blogNestedBlocked },
    user: { find: true, blockedFields: userNestedBlocked },
  });
  await nestedFindTest();
  const blogNestedAllowed = getAllowedEquivalentForBlogFields(blogNestedBlocked);
  const userNestedAllowed = getAllowedEquivalentForUserFields(userNestedBlocked);
  setRules({
    blog: { find: true, allowedFields: blogNestedAllowed },
    user: { find: true, allowedFields: userNestedAllowed },
  });
  await nestedFindTest();
});

const manyUserWithBlogs = () => bridg.user.findMany({ include: { blogs: true } });
const firstUserWithBlogs = () => bridg.user.findFirst({ include: { blogs: true } });

it('Blocked property prevents/allows including relations', async () => {
  // blocked prevents querying
  setRules({ user: { find: { rule: true, blockedFields: ['blogs'] } }, blog: { find: true } });
  await queryFails(manyUserWithBlogs());
  await queryFails(firstUserWithBlogs());
  // works if relation is included in blocked
  setRules({ user: { find: { rule: true, blockedFields: [] } }, blog: { find: true } });
  const manyBlogs = await querySucceeds(manyUserWithBlogs());
  expect(manyBlogs?.at(0).blogs.length).toBe(2);
  const firstBlog = await querySucceeds(firstUserWithBlogs());
  expect(firstBlog.blogs.length).toBe(2);
});

it('Allowed property prevents/allows including relations', async () => {
  // not in allowedFields prevents querying
  setRules({ user: { find: { rule: true, allowedFields: ['id'] } }, blog: { find: true } });
  await queryFails(manyUserWithBlogs());
  await queryFails(firstUserWithBlogs());
  // works if relation is included in blocked
  setRules({ user: { find: { rule: true, allowedFields: ['blogs'] } }, blog: { find: true } });
  const manyBlogsAllowed = await querySucceeds(manyUserWithBlogs());
  expect(manyBlogsAllowed?.at(0).blogs.length).toBe(2);
  const firstBlogAllowed = await querySucceeds(firstUserWithBlogs());
  expect(firstBlogAllowed.blogs.length).toBe(2);
});

const userSelect = () => bridg.user.findFirst({ select: { email: true, name: true } });
const nestedUserSelect = () =>
  bridg.user.findFirst({ include: { blogs: { select: { body: true, id: true } } } });

it('Blocked property prevents/allows selecting fields, protects fields on inclusions/relations', async () => {
  setRules({ user: { find: { rule: true, blockedFields: ['email'] } } });
  await queryFails(userSelect());
  setRules({ user: { find: { rule: true, blockedFields: ['createdAt'] } } });
  await querySucceeds(userSelect());
  setRules({
    user: { find: { rule: true, blockedFields: ['email'] } },
    blog: { find: { rule: true, blockedFields: ['body'] } },
  });
  await queryFails(nestedUserSelect());
  setRules({
    user: { find: { rule: true, blockedFields: ['email'] } },
    blog: { find: { rule: true, blockedFields: ['createdAt'] } },
  });
  const nestedRes = await querySucceeds(nestedUserSelect());

  expect(nestedRes.email).toBeUndefined();
  expect(nestedRes.blogs[0].body).toBeTruthy();
  expect(nestedRes.blogs[0].createdAt).toBeUndefined();
  expect(Object.keys(nestedRes.blogs[0]).length).toBe(2);
});

it('Allowed property prevents/allows selecting fields', async () => {
  setRules({ user: { find: { rule: true, allowedFields: ['id'] } } });
  await queryFails(userSelect());
  setRules({ user: { find: { rule: true, allowedFields: ['email', 'name'] } } });
  await querySucceeds(userSelect());
  setRules({
    user: { find: { rule: true, allowedFields: ['blogs'] } },
    blog: { find: { rule: true, allowedFields: ['id'] } },
  });
  await queryFails(nestedUserSelect());
  setRules({
    user: { find: { rule: true, allowedFields: ['blogs'] } },
    blog: { find: { rule: true, allowedFields: ['body', 'id'] } },
  });
  const nestedRes = await querySucceeds(nestedUserSelect());
  expect(nestedRes.email).toBeUndefined();
  expect(nestedRes.blogs[0].body).toBeTruthy();
  expect(nestedRes.blogs[0].id).toBeTruthy();
  expect(Object.keys(nestedRes.blogs[0]).length).toBe(2);
});

const testQueryByFields = async () => {
  await queryFails(bridg.blog.findMany({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.findFirst({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.findFirstOrThrow({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.findUnique({ where: { id: testBlog1.id } }));
  await queryFails(bridg.blog.findUniqueOrThrow({ where: { id: testBlog1.id } }));
  const res1 = await querySucceeds(bridg.blog.findMany(), 2);
  res1.forEach((b: any) => {
    expect(b.id).toBeUndefined();
    expect(b.title).toBeTruthy();
  });
  const res2 = await querySucceeds(bridg.blog.findMany({ where: { title: testBlog1.title } }), 1);
  res2.forEach((b: any) => {
    expect(b.id).toBeUndefined();
    expect(b.title).toBeTruthy();
  });
};

it('Blocked property prevents querying by fields', async () => {
  setRules({ blog: { find: { rule: true, blockedFields: ['id'] } } });
  await testQueryByFields();
});

it('Allowed property prevents querying by fields', async () => {
  setRules({
    blog: { find: { rule: true, allowedFields: getAllowedEquivalentForBlogFields(['id']) } },
  });
  await testQueryByFields();
});

it('Blocked/allowedFields prevent updates from returning data', async () => {
  const shallowUpdateTest = async () => {
    const update1 = await querySucceeds(
      bridg.blog.update({
        where: { id: testBlog1.id },
        data: { body: 'edited1' },
      })
    );
    expect(update1.title).toBeUndefined();
    expect(update1.published).toBeUndefined();
    expect(update1.id).toBeTruthy();
    expect(update1.body).toEqual('edited1');
  };
  setRules({
    blog: {
      find: { rule: true, blockedFields: ['title', 'published'] },
      update: true,
    },
  });
  await shallowUpdateTest();
  setRules({
    blog: {
      find: {
        rule: true,
        allowedFields: getAllowedEquivalentForBlogFields(['title', 'published']),
      },
      update: true,
    },
  });
  await shallowUpdateTest();

  const nestedUpdateTest = async () => {
    const nestedUpdate = await querySucceeds(
      bridg.user.update({
        where: { id: testUser.id },
        data: {
          email: 'update2',
          blogs: {
            update: { where: { id: testBlog1.id }, data: { body: 'edited2' } },
          },
        },
        include: { blogs: { where: { id: testBlog1.id } } },
      })
    );

    expect(nestedUpdate.email).toBe('update2');
    expect(nestedUpdate.id).toBeTruthy();
    expect(nestedUpdate.name).toBeUndefined();

    const update2 = nestedUpdate.blogs[0];
    expect(update2.title).toBeUndefined();
    expect(update2.published).toBeUndefined();
    expect(update2.id).toBeTruthy();
    expect(update2.body).toEqual('edited2');
  };

  setRules({
    blog: {
      find: { rule: true, blockedFields: ['title', 'published'] },
      update: true,
    },
    user: {
      find: { rule: true, blockedFields: ['name'] },
      update: true,
    },
  });
  await nestedUpdateTest();

  setRules({
    blog: {
      find: {
        rule: true,
        allowedFields: getAllowedEquivalentForBlogFields(['title', 'published']),
      },
      update: true,
    },
    user: {
      find: { rule: true, allowedFields: getAllowedEquivalentForUserFields(['name']) },
      update: true,
    },
  });
  await nestedUpdateTest();
});

it('Sensitive fields cannot be updated', async () => {
  const updateTests = async () => {
    await queryFails(
      bridg.blog.update({
        where: { id: testBlog1.id },
        data: { body: 'edited1', title: 'edited1' },
      })
    );
    const edit1 = await querySucceeds(
      bridg.blog.update({ where: { id: testBlog1.id }, data: { body: 'edited1' } })
    );
    // data returned from update respects "find" rules
    expect(edit1.published).toBeUndefined();
    expect(edit1.title).toBeDefined();
    // nested update
    await queryFails(
      bridg.user.update({
        where: { id: testBlog1.id },
        data: {
          name: 'edited2',
          blogs: {
            //  blog.title blocked
            update: { where: { id: testBlog1.id }, data: { title: 'edited2' } },
          },
        },
      })
    );
    await queryFails(
      bridg.user.update({
        where: { id: testUser.id },
        data: {
          email: 'edited2', // user.email blocked
          blogs: {
            update: { where: { id: testBlog1.id }, data: { body: 'edited2' } },
          },
        },
      })
    );
    await querySucceeds(
      bridg.user.update({
        where: { id: testUser.id },
        data: {
          name: 'edited2',
          blogs: {
            update: { where: { id: testBlog1.id }, data: { body: 'edited2' } },
          },
        },
      })
    );
  };

  setRules({
    blog: {
      find: { rule: true, blockedFields: ['published'] },
      update: { rule: true, blockedFields: ['title'] },
    },
    user: {
      update: { rule: true, blockedFields: ['email'] },
    },
  });
  await updateTests();

  setRules({
    blog: {
      find: { rule: true, allowedFields: getAllowedEquivalentForBlogFields(['published']) },
      update: { rule: true, allowedFields: getAllowedEquivalentForBlogFields(['title']) },
    },
    user: {
      update: { rule: true, allowedFields: getAllowedEquivalentForUserFields(['email']) },
    },
  });
  await updateTests();
});

it('Sensitive fields cannot be used for creating data', async () => {
  const createTests = async () => {
    await queryFails(
      bridg.blog.create({
        data: { title: 'test', published: true, userId: testUser.id },
      })
    );
    const createdBlog = await querySucceeds(
      bridg.blog.create({
        data: { title: 'test', userId: testUser.id },
      })
    );
    // returned data respects find rules
    expect(createdBlog.title).toBeUndefined();
    expect(createdBlog.published).toBeDefined();

    await queryFails(bridg.user.create({ data: { email: 'test1', name: 'test' } }));
    await querySucceeds(bridg.user.create({ data: { email: 'test1' } }));

    await queryFails(
      bridg.user.create({
        data: {
          email: 'test_fail',
          blogs: {
            create: {
              title: 'test',
              published: true, // blocked field
            },
          },
        },
      })
    );
    const userWithBlog = await querySucceeds(
      bridg.user.create({
        data: { email: 'test2', blogs: { create: { title: 'test' } } },
        include: { blogs: true },
      })
    );
    expect(userWithBlog.email).toBeUndefined();
    expect(userWithBlog.name).toBeDefined();
    expect(userWithBlog.blogs[0].title).toBeUndefined();
    expect(userWithBlog.blogs[0].published).toBeDefined();
  };

  setRules({
    blog: {
      find: { rule: true, blockedFields: ['title'] },
      create: { rule: true, blockedFields: ['published'] },
    },
    user: {
      find: { rule: true, blockedFields: ['email'] },
      create: { rule: true, blockedFields: ['name'] },
    },
  });
  await createTests();
  await deleteDbData();
  await resetTestData();

  setRules({
    blog: {
      find: { rule: true, allowedFields: getAllowedEquivalentForBlogFields(['title']) },
      create: { rule: true, allowedFields: getAllowedEquivalentForBlogFields(['published']) },
    },
    user: {
      find: { rule: true, allowedFields: getAllowedEquivalentForUserFields(['email']) },
      create: { rule: true, allowedFields: getAllowedEquivalentForUserFields(['name']) },
    },
  });
  await createTests();
});

it('Cannot delete data by querying sensitive fields', async () => {
  const deleteViaSensitiveFields = async () => {
    await queryFails(bridg.blog.delete({ where: { id: testBlog1.id } }));
    await querySucceeds(bridg.blog.deleteMany({ where: { title: '' } }), 0);
    await querySucceeds(bridg.blog.deleteMany({ where: { title: testBlog1.title } }), 1);
    await deleteDbData();
    await resetTestData();
    await querySucceeds(bridg.blog.deleteMany({ where: {} }), 2);
  };

  setRules({ blog: { delete: { rule: true, blockedFields: ['id'] } } });
  await deleteViaSensitiveFields();
  await deleteDbData();
  await resetTestData();
  setRules({
    blog: { delete: { rule: true, allowedFields: getAllowedEquivalentForBlogFields(['id']) } },
  });
  await deleteViaSensitiveFields();
});

it('Blocked/allowedFields respects method level fields over model level', async () => {
  const modelLevelTest = async () => {
    await queryFails(bridg.blog.findMany({ where: { id: testBlog1.id } }));
    await querySucceeds(bridg.blog.findMany({ where: { title: testBlog1.title } }));
  };

  setRules({ blog: { find: { rule: true, blockedFields: ['id'] }, blockedFields: ['title'] } });
  await modelLevelTest();
  setRules({
    blog: {
      find: { rule: true, allowedFields: getAllowedEquivalentForBlogFields(['id']) },
      allowedFields: getAllowedEquivalentForBlogFields(['title']),
    },
  });
  await modelLevelTest();
});

// TODO: break into 3 tests
it('Sensitive props falls back to model level if no method level available', async () => {
  const testModelProp = async () => {
    await queryFails(bridg.blog.findMany({ where: { title: testBlog1.title } }));
    await querySucceeds(bridg.blog.findMany({ where: { id: testBlog1.id } }));
  };

  setRules({ blog: { find: { rule: true }, blockedFields: ['title'] } });
  await testModelProp();
  setRules({
    blog: { find: { rule: true }, allowedFields: getAllowedEquivalentForBlogFields(['title']) },
  });
  await testModelProp();

  // uses blog.update.prop for update, but blog.prop for data returned
  const testMultiLevelProps = async () => {
    await queryFails(bridg.blog.findMany({ where: { title: testBlog1.title } }));
    await queryFails(
      bridg.blog.updateMany({ where: { title: testBlog1.title }, data: { body: 'edited' } })
    );
    const res = await querySucceeds(
      bridg.blog.update({ where: { id: testBlog1.id }, data: { body: 'edited' } })
    );
    expect(res.body).toEqual('edited');
    expect(res.title).toBeUndefined();
  };
  setRules({
    blog: {
      find: { rule: true },
      update: { rule: true, blockedFields: ['title'] },
      blockedFields: ['title'],
    },
  });
  await testMultiLevelProps();
  setRules({
    blog: {
      find: { rule: true },
      update: { rule: true, allowedFields: getAllowedEquivalentForBlogFields(['title']) },
      allowedFields: getAllowedEquivalentForBlogFields(['title']),
    },
  });
  await testMultiLevelProps();

  const testMultilevelCreate = async () => {
    await queryFails(bridg.user.findMany({ where: { email: testUser.email } }));
    await queryFails(bridg.user.create({ data: { email: 'test', name: 'test' } }));
    const res2 = await querySucceeds(bridg.user.create({ data: { email: 'test' } }));
    // respects user.blocked for returning data, since no find rule is available
    expect(res2.name).toBeDefined();
    expect(res2.email).toBeUndefined();
  };
  // user.create.blocked overrides user.blocked
  setRules({
    user: {
      default: true,
      blockedFields: ['email'],
      create: { rule: true, blockedFields: ['name'] },
    },
  });
  await testMultilevelCreate();
  await deleteDbData();
  setRules({
    user: {
      default: true,
      allowedFields: getAllowedEquivalentForUserFields(['email']),
      create: { rule: true, allowedFields: getAllowedEquivalentForUserFields(['name']) },
    },
  });
  await testMultilevelCreate();
});

// test mixing them at different levels, ie: model.blocked, and model.method.allowedFields
it('Model.allowedFields gets overridden by method.blocked', async () => {
  const runTest = async () => {
    await queryFails(bridg.blog.findFirst({ select: { id: true } }));
    const res1 = await querySucceeds(bridg.blog.findFirst({ select: { body: true } }));
    expect(res1.body).toBeTruthy();
    const res2 = await querySucceeds(bridg.blog.findFirst({}));
    expect(res2.body).toBeTruthy();
    expect(res2.id).toBeUndefined();
    expect(res2.createdAt).toBeUndefined();
  };
  setRules({
    blog: {
      allowedFields: ['body'],
      find: {
        rule: true,
        blockedFields: ['id', 'createdAt'],
      },
    },
  });
  await runTest();
  setRules({
    blog: {
      blockedFields: ['body'],
      find: {
        rule: true,
        allowedFields: getAllowedEquivalentForBlogFields(['id', 'createdAt']),
      },
    },
  });
  await runTest();
});

it('relational updates dont get around blockedFields', async () => {
  // write security rules blocking updates on blog.title,
  // attempt to relationally update via user,
  // should still fail
  const relationalUpdate = () =>
    bridg.user.update({
      where: { id: testUser.id },
      data: {
        blogs: {
          updateMany: {
            where: { id: testBlog1.id },
            data: {
              title: 'shouldntWork',
            },
          },
        },
      },
    });

  setRules({
    user: { update: true, find: true },
    blog: {
      update: {
        rule: true,
        blockedFields: ['title'],
      },
    },
  });
  await queryFails(relationalUpdate());
  setRules({
    user: { update: true, find: true },
    blog: {
      update: {
        rule: true,
        blockedFields: [],
      },
    },
  });
  await querySucceeds(relationalUpdate());
});
