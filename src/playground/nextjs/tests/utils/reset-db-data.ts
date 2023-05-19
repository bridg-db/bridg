import prisma from '../../prisma/db';

export const resetDbData = async () => {
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.comment.deleteMany();
};
