import { beforeEach, it } from '@jest/globals';
import bridg from '../../generated/bridg/index';
import { Blog, User } from '../../generated/prisma';
import { deleteDbData, seedDbData } from '../../utils/prisma.test-util';
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
