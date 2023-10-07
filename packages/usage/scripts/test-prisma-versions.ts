import { execSync } from 'child_process';

const getRecentPrismaVersions = () => {
  const versionsOutput = execSyncNoOut(`npm run prisma:versions`);
  const versionsArrDirty = versionsOutput.split(',');
  // ["\n  '1.25.1'", ...] => ["1.25.1", ...]
  const prismaVersions = versionsArrDirty
    .map((dirty) => dirty.match(/'(\d+\.\d+\.\d+)'/)?.at(1))
    .filter((v): v is string => !!v);

  return prismaVersions.slice(prismaVersions.indexOf('5.0.0'));
};

const PRISMA_VERSIONS = getRecentPrismaVersions();
// const PRISMA_VERSIONS = ['5.3.0', '5.4.0'];
const success: string[] = [];
const failed: string[] = [];

export const prepareEnv = async (prismaVersion: string) => {
  console.log('\nSTARTING TESTS FOR PRISMA VERSION:', prismaVersion);
  console.log('----------------------------------------');

  execSyncNoOut(`VERSION=${prismaVersion} npm run prisma:install`);
  // systemSync(`pnpm install @prisma/client@${prismaVersion}`);
  console.log('client installed');

  execSyncNoOut(`npm run test:prepare`);
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
