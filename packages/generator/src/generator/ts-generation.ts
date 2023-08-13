import strip from 'strip-comments';
import { readFileAsString } from '../utils/file.util';
import { generateClientDbFile } from './client/clientDb.generate';
import generateHandler from './server/requestHandler.generate';

export const MODEL_REGEX = /(?<=model\s)\w+(?=\s?{)/gis;
export const parseModelNamesFromSchema = (prismaSchema: string) =>
  prismaSchema.match(MODEL_REGEX)?.map((m) => m.trim()) || [];

export const generateBridgTsFiles = (
  pathToSchema: string,
  outputLocation: string,
  apiLoctation: string,
) =>
  generateFiles(readFileAsString(pathToSchema), outputLocation, apiLoctation);

export const generateFiles = (
  schemaStr: string,
  outputLocation: string,
  apiLocation: string,
) => {
  if (!schemaStr) throw new Error(`Schema not provided`);
  //   if (!schemaStr.match(/.+["']extendedWhereUnique["'].+/g)) {
  //     console.error(`ERROR: Ensure you've added 'extendedWhereUnique' to your schema.prisma:

  // generator client {
  //     provider        = "your-provider"
  //     previewFeatures = ["extendedWhereUnique"]
  // }`)
  //   }

  schemaStr = strip(schemaStr);
  const models = parseModelNamesFromSchema(schemaStr);
  generateClientDbFile(models, outputLocation, apiLocation);
  generateHandler(models, schemaStr, outputLocation);
};
