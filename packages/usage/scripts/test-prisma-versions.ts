import { execSync } from 'child_process';

const PRISMA_VERSIONS = ['5.0.0', '5.1.0', '5.1.1'];

const success: string[] = [];
const failed: string[] = [];

export const prepareEnv = async (prismaVersion: string) => {
  console.log('\nSTARTING TESTS FOR PRISMA VERSION:', prismaVersion);
  console.log('----------------------------------------');

  execSyncNoOut(`VERSION=5.0.0 npm run prisma:install`);
  // systemSync(`pnpm install @prisma/client@${prismaVersion}`);
  console.log('client installed');

  execSyncNoOut(
    `npx prisma db push --schema=__tests__/__fixtures__/test.prisma;`
  );
  console.log('schema pushed, client generated');

  console.log('starting tests...');

  try {
    execSyncNoOut(`npm run test`);
  } catch (err) {
    console.log('Tests failed.');
    failed.push(prismaVersion);
    return;
  }
  console.log('Tests successful!');

  success.push(prismaVersion);
};

PRISMA_VERSIONS.forEach((version) => {
  try {
    prepareEnv(version);
  } catch {
    console.log('Tests failed.');
    failed.push(version);
  }
});

console.log('success:', success);
console.log('failed:', failed);

function execSyncNoOut(cmd: string) {
  return execSync(cmd, { stdio: 'pipe' }).toString();
  // try {
  //   return execSync(cmd, { stdio: 'pipe' }).toString();
  // } catch (error: any) {
  //   // console.log('ERROR:', error);
  //   // error.status; // Might be 127 in your example.
  //   // error.message; // Holds the message you typically want.
  //   // error.stderr; // Holds the stderr output. Use `.toString()`.
  //   // error.stdout; // Holds the stdout output. Use `.toString()`.
  //   throw error.message;
  // }
}
