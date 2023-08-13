const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

export const resetDbData = async () => {
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.$disconnect();
};

export default prisma;
