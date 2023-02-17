// npx ts-node -O '{"module":"commonjs"}' ./index.ts
import { generateFilesFromSchemaPath } from './generate';

const pathToSchema = process.argv[2];
if (!pathToSchema) throw new Error(`Error, schema not provided ${pathToSchema}`);
generateFilesFromSchemaPath(pathToSchema);
