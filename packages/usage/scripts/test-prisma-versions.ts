// TODO: 5.1.0 fails because model.count() doesn't work for some reason, investigate
//
// RUN WITH NPM NOT YARN, WON'T WORK WITH YARN
// ❌ yarn test:prisma-versions
// ✅ npm run test:prisma-versions
import { execSync } from 'child_process';

const execSyncNoOut = (cmd: string) => execSync(cmd, { stdio: 'pipe' }).toString();

const getRecentPrismaVersions = () => {
  const versionsOutput = execSyncNoOut(`npm run prisma:versions`);
  const versionsArrDirty = versionsOutput.split(',');
  // ["\n  '1.25.1'", ...] => ["1.25.1", ...]
  const prismaVersions = versionsArrDirty
    .map((dirty) => dirty.match(/'(\d+\.\d+\.\d+)'/)?.at(1))
    .filter((v): v is string => !!v);

  return prismaVersions.slice(prismaVersions.indexOf('5.0.0'));
};

// TEST A PARTICULAR VERSION:
// const PRISMA_VERSIONS = ['5.0.0'];
const PRISMA_VERSIONS = getRecentPrismaVersions();
const success: string[] = [];
const failed: string[] = [];

export const prepareEnv = async (prismaVersion: string) => {
  console.log('\nSTARTING TESTS FOR PRISMA VERSION:', prismaVersion);
  console.log('----------------------------------------');

  execSyncNoOut(`VERSION=${prismaVersion} npm run prisma:install`);
  console.log('client installed');

  execSyncNoOut(`npm run test:prepare-base`);
  console.log('schema pushed, client generated');

  console.log('starting tests...');

  try {
    execSyncNoOut(`npm run test:base`);
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
