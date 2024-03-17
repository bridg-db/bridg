import { beforeEach, expect, it } from '@jest/globals';
import bridg from '../../generated/bridg';
import { Blog, User } from '../../generated/prisma';
import prisma, { deleteDbData, seedDbData } from '../../utils/prisma.test-util';
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

it('Upsert queries correctly use update, then create rules', async () => {
  // FAIL
  // first fails to update nonexistent record, falls back to create
  setRules({ blog: { update: true, create: false } });
  await queryFails(
    bridg.blog.upsert({
      where: { id: 'nonexistent' },
      update: {},
      create: { title: 'hello' },
    }),
  );
  // fails immediately when trying to update
  setRules({ blog: { update: false, create: true } });
  await queryFails(
    bridg.blog.upsert({
      where: { id: testBlog1.id },
      update: {},
      create: { title: 'hello' },
    }),
  );
  // SUCCESS
  setRules({ blog: { update: { id: 'nonexistent!!' }, create: true } });
  const newBlog = await querySucceeds(
    bridg.blog.upsert({
      where: { id: 'nonexistent' },
      update: {},
      create: { title: 'hello' },
    }),
  );
  expect(newBlog.title).toBe('hello');
  setRules({ blog: { update: true, create: false } });
  const editedBlog = await querySucceeds(
    bridg.blog.upsert({
      where: { id: testBlog1.id },
      update: { body: 'edited-body' },
      create: { title: 'hello' },
    }),
  );
  expect(editedBlog.body).toBe('edited-body');
  expect(editedBlog.id).toBe(testBlog1.id);
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
