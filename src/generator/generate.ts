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
  const models = parseModelNamesFromSchema(schemaStr);

  generateClientDbFile(models, outputLocation);
  generateHandler(models, schemaStr, outputLocation);
};
