import { afterAll, beforeEach, expect, it } from '@jest/globals';
import { mockFetch } from './__mocks__/fetch.mock';
import bridg from './generated/bridg';
import { Blog, User } from './generated/prisma';
import prisma, { resetDbData } from './utils/prisma';
import { setRules } from './utils/test-rules';

global.fetch = mockFetch;

const TEST_TITLE = 'TEST_BLOG';
const TEST_TITLE_2 = 'TEST_BLOG_2';
let testBlog1: Blog;
let testBlog2: Blog;
let testUser: User;

const createFakeData = async () => {
  testUser = await prisma.user.create({ data: { email: 'johndoe@gmail.com', name: 'John Doe' } });

  const blogCreate = {
    userId: testUser.id,
    body: 'hello world test blog body',
    comments: { create: { body: 'test-comment' } },
  };
  testBlog1 = await prisma.blog.create({
    data: { title: TEST_TITLE, ...blogCreate },
  });
  testBlog2 = await prisma.blog.create({
    data: { title: TEST_TITLE_2, ...blogCreate },
  });
};

beforeEach(async () => {
  setRules({});
  await resetDbData();
  await createFakeData();
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
    if (resultCount > 1) throw Error(`Expected array, but received: ${data}`);
  }

  return data;
};

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

const getShownEquivalentForUserFields = (hiddenFields: UserField[]) =>
  userFields.filter((k) => !hiddenFields.includes(k as UserField)) as UserField[];
const getShownEquivalentForBlogFields = (hiddenFields: BlogField[]) =>
  blogFields.filter((k) => !hiddenFields.includes(k as BlogField)) as BlogField[];

it('Shown/hidden property prevents reading fields', async () => {
  const shallowFindTest = async () => {
    const findMany1 = await querySucceeds(bridg.blog.findMany(), 2);
    expect(findMany1[0].title).toBeUndefined();
    expect(findMany1[0].published).toBeUndefined();
    expect(findMany1[0].id).toBeTruthy();

    const findFirst1 = await querySucceeds(bridg.blog.findFirst());
    expect(findFirst1.title).toBeUndefined();
    expect(findFirst1.published).toBeUndefined();
    expect(findFirst1.id).toBeDefined();

    setRules({ blog: { find: { rule: true, hidden: ['id'] } } });
    const findMany2 = await querySucceeds(bridg.blog.findMany(), 2);
    expect(findMany2[0].title).toBeTruthy();
    expect(findMany2[0].published).toBeDefined();
    expect(findMany2[0].id).toBeUndefined();
  };
  const hiddenFields: (keyof Blog)[] = ['title', 'published'];
  // find.hidden
  setRules({ blog: { find: { rule: true, hidden: hiddenFields } } });
  await shallowFindTest();
  // model.hidden
  setRules({ blog: { find: true, hidden: hiddenFields } });
  await shallowFindTest();
  const shownFields = getShownEquivalentForBlogFields(hiddenFields);
  // find.shown
  setRules({
    blog: {
      find: { rule: true, shown: shownFields },
    },
  });
  await shallowFindTest();
  // model.shown
  setRules({ blog: { find: true, shown: shownFields } });

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
  const blogNestedHidden = ['title'] as BlogField[];
  const userNestedHidden = ['email'] as UserField[];
  setRules({
    blog: { find: { rule: true, hidden: blogNestedHidden } },
    user: { find: { rule: true, hidden: userNestedHidden } },
  });
  await nestedFindTest();
  setRules({
    blog: { find: true, hidden: blogNestedHidden },
    user: { find: true, hidden: userNestedHidden },
  });
  await nestedFindTest();
  const blogNestedShown = getShownEquivalentForBlogFields(blogNestedHidden);
  console.log('blog nested shown', blogNestedShown);

  const userNestedShown = getShownEquivalentForUserFields(userNestedHidden);
  console.log('usernestedshown', userNestedShown);

  setRules({
    blog: { find: true, shown: blogNestedShown },
    user: { find: true, shown: userNestedShown },
  });
  await nestedFindTest();
});

const manyUserWithBlogs = () => bridg.user.findMany({ include: { blogs: true } });
const firstUserWithBlogs = () => bridg.user.findFirst({ include: { blogs: true } });

it('Hidden property prevents/allows including relations', async () => {
  // hidden prevents querying
  setRules({ user: { find: { rule: true, hidden: ['blogs'] } }, blog: { find: true } });
  await queryFails(manyUserWithBlogs());
  await queryFails(firstUserWithBlogs());
  // works if relation is included in hidden
  setRules({ user: { find: { rule: true, hidden: [] } }, blog: { find: true } });
  const manyBlogs = await querySucceeds(manyUserWithBlogs());
  expect(manyBlogs?.at(0).blogs.length).toBe(2);
  const firstBlog = await querySucceeds(firstUserWithBlogs());
  expect(firstBlog.blogs.length).toBe(2);
});

it('Shown property prevents/allows including relations', async () => {
  // not in shown prevents querying
  setRules({ user: { find: { rule: true, shown: ['id'] } }, blog: { find: true } });
  await queryFails(manyUserWithBlogs());
  await queryFails(firstUserWithBlogs());
  // works if relation is included in hidden
  setRules({ user: { find: { rule: true, shown: ['blogs'] } }, blog: { find: true } });
  const manyBlogsShown = await querySucceeds(manyUserWithBlogs());
  expect(manyBlogsShown?.at(0).blogs.length).toBe(2);
  const firstBlogShown = await querySucceeds(firstUserWithBlogs());
  expect(firstBlogShown.blogs.length).toBe(2);
});

const userSelect = () => bridg.user.findFirst({ select: { email: true, name: true } });
const nestedUserSelect = () =>
  bridg.user.findFirst({ include: { blogs: { select: { body: true, id: true } } } });

it('Hidden property prevents/allows selecting fields', async () => {
  setRules({ user: { find: { rule: true, hidden: ['email'] } } });
  await queryFails(userSelect());
  setRules({ user: { find: { rule: true, hidden: ['createdAt'] } } });
  await querySucceeds(userSelect());
  setRules({
    user: { find: { rule: true, hidden: ['email'] } },
    blog: { find: { rule: true, hidden: ['body'] } },
  });
  await queryFails(nestedUserSelect());
  setRules({
    user: { find: { rule: true, hidden: ['email'] } },
    blog: { find: { rule: true, hidden: ['createdAt'] } },
  });
  const nestedRes = await querySucceeds(nestedUserSelect());

  expect(nestedRes.email).toBeUndefined();
  expect(nestedRes.blogs[0].body).toBeTruthy();
  expect(nestedRes.blogs[0].createdAt).toBeUndefined();
  expect(Object.keys(nestedRes.blogs[0]).length).toBe(2);
});

it('Shown property prevents/allows selecting fields', async () => {
  setRules({ user: { find: { rule: true, shown: ['id'] } } });
  await queryFails(userSelect());
  setRules({ user: { find: { rule: true, shown: ['email', 'name'] } } });
  await querySucceeds(userSelect());
  setRules({
    user: { find: { rule: true, shown: ['blogs'] } },
    blog: { find: { rule: true, shown: ['id'] } },
  });
  await queryFails(nestedUserSelect());
  setRules({
    user: { find: { rule: true, shown: ['blogs'] } },
    blog: { find: { rule: true, shown: ['body', 'id'] } },
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

it('Hidden property prevents querying by fields', async () => {
  setRules({ blog: { find: { rule: true, hidden: ['id'] } } });
  await testQueryByFields();
});

it('Shown property prevents querying by fields', async () => {
  setRules({ blog: { find: { rule: true, shown: getShownEquivalentForBlogFields(['id']) } } });
  await testQueryByFields();
});

it('Hidden/shown prevent updates from returning data', async () => {
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
      find: { rule: true, hidden: ['title', 'published'] },
      update: true,
    },
  });
  await shallowUpdateTest();
  setRules({
    blog: {
      find: { rule: true, shown: getShownEquivalentForBlogFields(['title', 'published']) },
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
      find: { rule: true, hidden: ['title', 'published'] },
      update: true,
    },
    user: {
      find: { rule: true, hidden: ['name'] },
      update: true,
    },
  });
  await nestedUpdateTest();

  setRules({
    blog: {
      find: { rule: true, shown: getShownEquivalentForBlogFields(['title', 'published']) },
      update: true,
    },
    user: {
      find: { rule: true, shown: getShownEquivalentForUserFields(['name']) },
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
            //  blog.title hidden
            update: { where: { id: testBlog1.id }, data: { title: 'edited2' } },
          },
        },
      })
    );
    await queryFails(
      bridg.user.update({
        where: { id: testUser.id },
        data: {
          email: 'edited2', // user.email hidden
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
      find: { rule: true, hidden: ['published'] },
      update: { rule: true, hidden: ['title'] },
    },
    user: {
      update: { rule: true, hidden: ['email'] },
    },
  });
  await updateTests();

  setRules({
    blog: {
      find: { rule: true, shown: getShownEquivalentForBlogFields(['published']) },
      update: { rule: true, shown: getShownEquivalentForBlogFields(['title']) },
    },
    user: {
      update: { rule: true, shown: getShownEquivalentForUserFields(['email']) },
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
              published: true, // hidden field
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
      find: { rule: true, hidden: ['title'] },
      create: { rule: true, hidden: ['published'] },
    },
    user: {
      find: { rule: true, hidden: ['email'] },
      create: { rule: true, hidden: ['name'] },
    },
  });
  await createTests();
  await resetDbData();
  await createFakeData();

  setRules({
    blog: {
      find: { rule: true, shown: getShownEquivalentForBlogFields(['title']) },
      create: { rule: true, shown: getShownEquivalentForBlogFields(['published']) },
    },
    user: {
      find: { rule: true, shown: getShownEquivalentForUserFields(['email']) },
      create: { rule: true, shown: getShownEquivalentForUserFields(['name']) },
    },
  });
  await createTests();
});

it('Cannot delete data by querying sensitive fields', async () => {
  const deleteViaSensitiveFields = async () => {
    await queryFails(bridg.blog.delete({ where: { id: testBlog1.id } }));
    await querySucceeds(bridg.blog.deleteMany({ where: { title: '' } }), 0);
    await querySucceeds(bridg.blog.deleteMany({ where: { title: testBlog1.title } }), 1);
    await resetDbData();
    await createFakeData();
    await querySucceeds(bridg.blog.deleteMany({ where: {} }), 2);
  };

  setRules({ blog: { delete: { rule: true, hidden: ['id'] } } });
  await deleteViaSensitiveFields();
  await resetDbData();
  await createFakeData();
  setRules({ blog: { delete: { rule: true, shown: getShownEquivalentForBlogFields(['id']) } } });
  await deleteViaSensitiveFields();
});

it('Hidden/shown respects method level fields over model level', async () => {
  const modelLevelTest = async () => {
    await queryFails(bridg.blog.findMany({ where: { id: testBlog1.id } }));
    await querySucceeds(bridg.blog.findMany({ where: { title: testBlog1.title } }));
  };

  setRules({ blog: { find: { rule: true, hidden: ['id'] }, hidden: ['title'] } });
  await modelLevelTest();
  setRules({
    blog: {
      find: { rule: true, shown: getShownEquivalentForBlogFields(['id']) },
      shown: getShownEquivalentForBlogFields(['title']),
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

  setRules({ blog: { find: { rule: true }, hidden: ['title'] } });
  await testModelProp();
  setRules({ blog: { find: { rule: true }, shown: getShownEquivalentForBlogFields(['title']) } });
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
    blog: { find: { rule: true }, update: { rule: true, hidden: ['title'] }, hidden: ['title'] },
  });
  await testMultiLevelProps();
  setRules({
    blog: {
      find: { rule: true },
      update: { rule: true, shown: getShownEquivalentForBlogFields(['title']) },
      shown: getShownEquivalentForBlogFields(['title']),
    },
  });
  await testMultiLevelProps();

  const testMultilevelCreate = async () => {
    await queryFails(bridg.user.findMany({ where: { email: testUser.email } }));
    await queryFails(bridg.user.create({ data: { email: 'test', name: 'test' } }));
    const res2 = await querySucceeds(bridg.user.create({ data: { email: 'test' } }));
    // respects user.hidden for returning data, since no find rule is available
    expect(res2.name).toBeDefined();
    expect(res2.email).toBeUndefined();
  };
  // user.create.hidden overrides user.hidden
  setRules({
    user: { default: true, hidden: ['email'], create: { rule: true, hidden: ['name'] } },
  });
  await testMultilevelCreate();
  await resetDbData();
  setRules({
    user: {
      default: true,
      shown: getShownEquivalentForUserFields(['email']),
      create: { rule: true, shown: getShownEquivalentForUserFields(['name']) },
    },
  });
  await testMultilevelCreate();
});

// test mixing them at different levels, ie: model.hidden, and model.method.shown
it('Model.shown gets overridden by method.hidden', async () => {
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
      shown: ['body'],
      find: {
        rule: true,
        hidden: ['id', 'createdAt'],
      },
    },
  });
  await runTest();
  setRules({
    blog: {
      hidden: ['body'],
      find: {
        rule: true,
        shown: getShownEquivalentForBlogFields(['id', 'createdAt']),
      },
    },
  });
  await runTest();
});
