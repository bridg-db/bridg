// npx ts-node -O '{"module":"commonjs"}' ./index.ts
import { generateFilesFromSchemaPath } from './generate';

const getArgValue = (arg: string, args: string[]) => {
  const index = args.indexOf(`--${arg}`);
  return index > -1 ? args[index + 1] : null;
};

const [pathToSchema, ...args] = process.argv.slice(2);
const outputLocation = getArgValue('outdir', args) || './node_modules/bridg/tmp';
const apiLocation = getArgValue('api', args) || '/api/bridg';
console.log('path to schema: ', pathToSchema);
console.log('output location: ', outputLocation);
console.log('api location: ', apiLocation);

if (!pathToSchema) throw new Error(`Error, schema not provided`);
generateFilesFromSchemaPath(pathToSchema, outputLocation, apiLocation);
