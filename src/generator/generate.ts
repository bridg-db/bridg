import { generateClientDbFile } from '../generator/client/clientDb.generate';
import { readFileAsString } from '../utils/file.util';
import generateHandler from './server/requestHandler.generate';

export const MODEL_REGEX = /(?<=model\s)\w+(?=\s?{)/gis;
export const parseModelNamesFromSchema = (prismaSchema: string) =>
  prismaSchema.match(MODEL_REGEX)?.map((m) => m.trim()) || [];

export const generateFilesFromSchemaPath = (pathToSchema: string, outputLocation: string) =>
  generateFiles(readFileAsString(pathToSchema), outputLocation);

export const generateFiles = (schemaStr: string, outputLocation: string) => {
  if (!schemaStr) throw new Error(`Schema not provided`);
  if (!schemaStr.match(/.+["']extendedWhereUnique["'].+/g)) {
    console.error(`ERROR: Ensure you've added 'extendedWhereUnique' to your schema.prisma:

generator client {
    provider        = "your-provider"
    previewFeatures = ["extendedWhereUnique"]
}`);
  }
  const models = parseModelNamesFromSchema(schemaStr);

  generateClientDbFile(models, outputLocation);
  generateHandler(models, schemaStr, outputLocation);
};
