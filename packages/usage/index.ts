import { withPulse } from '@prisma/extension-pulse';
import { PrismaClient } from './prisma/prisma';

const PULSE_API_KEY = process.env.PULSE_API_KEY as string;
const prisma = new PrismaClient().$extends(withPulse({ apiKey: PULSE_API_KEY }));

async function main() {
  const prismaUsers = await prisma.user.findMany({ where: {} });
  console.log('standard user query', prismaUsers);

  const subscription = await prisma.user.subscribe({
    update: { after: {} },
    // create: { after: {} },
    // delete: { before: {} },
  });

  if (subscription instanceof Error) throw subscription;

  for await (const event of subscription) {
    console.log('User update event', event);
  }
}

main().finally(() => prisma.$disconnect());
