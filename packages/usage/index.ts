import { PrismaClient } from '@prisma/client';

// import prisma from './__tests__/utils/prisma';

const prisma = new PrismaClient();

const go = async () => {
  const u = await prisma.user.findFirst();
  console.log('u', u);
};

go()
  .then()
  .catch(console.error)
  .finally(async () => {
    prisma.$disconnect();
  });
