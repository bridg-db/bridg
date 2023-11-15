import { Prisma } from '../generated/prisma';

const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

export const deleteDbData = async () => {
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.$disconnect();
};

export const TEST_TITLE = 'TEST_BLOG';
export const TEST_TITLE_2 = 'TEST_BLOG_2';

export const seedDbData = async ({
  userData,
  blogData,
}: { userData?: Prisma.UserCreateInput; blogData?: Prisma.BlogUncheckedUpdateInput } = {}) => {
  const testUser = await prisma.user.create({
    data: userData || { email: 'johndoe@gmail.com', name: 'John Doe' },
  });

  const blogCreate = {
    userId: testUser.id,
    ...(blogData || {
      body: 'hello world test blog body',
      comments: { create: { body: 'test-comment' } },
    }),
  };
  const testBlog1 = await prisma.blog.create({
    data: { title: TEST_TITLE, ...blogCreate },
  });
  const testBlog2 = await prisma.blog.create({
    data: { title: TEST_TITLE_2, ...blogCreate },
  });

  return { testUser, testBlog1, testBlog2 };
};

export default prisma;
