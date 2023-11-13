import { withPulse } from '@prisma/extension-pulse';
import { PrismaClient } from './__tests__/generated/prisma-pulse';

const PULSE_API_KEY = process.env.PULSE_API_KEY as string;
const prisma = new PrismaClient().$extends(withPulse({ apiKey: PULSE_API_KEY }));

let subs: any[] = [];

const USER_EMAIL = 'example@gmail.com';
async function main() {
  const subscription = await prisma.user.subscribe({
    update: { after: { email: USER_EMAIL } },
    create: { after: { email: USER_EMAIL } },
    delete: { before: { email: USER_EMAIL } },
  });
  subs.push(subscription);

  if (subscription instanceof Error) throw subscription;

  for await (const event of subscription) {
    console.log('User update event', event);
  }
}

setTimeout(async () => {
  const u = await prisma.user.create({
    data: {
      email: USER_EMAIL,
      blogs: {
        create: {
          title: 'hello',
        },
      },
    },
  });
  await prisma.user.update({ where: { id: u.id }, data: { name: 'john' } });
  await prisma.user.deleteMany();
}, 2000);

main().finally(() => {
  subs.forEach((s) => s?.stop());
  prisma.$disconnect();
});
