// npx ts-node -O '{"module":"commonjs"}' ./index.ts
import { generateFilesFromSchemaPath } from './generate';

const pathToSchema = process.argv[2];
const outputLocation = process.argv[3] || './node_modules/bridg/tmp';

if (!pathToSchema) throw new Error(`Error, schema not provided`);
generateFilesFromSchemaPath(pathToSchema, outputLocation);
