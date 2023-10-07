import { GeneratorOptions } from '@prisma/generator-helper';
import { existsSync } from 'fs';
import path from 'path';
import strip from 'strip-comments';
import {
  getRelativeImportPath,
  getRelativePathWithLeadingDot,
  readFileAsString,
  writeFileSafely,
} from '../utils/file.util';
import { uncapitalize } from '../utils/string.util';
import { generateClientDbFile } from './client/clientDb.generate';
import generateHandler from './server/requestHandler.generate';

export const MODEL_REGEX = /(?<=model\s)\w+(?=\s?{)/gis;
export const parseModelNamesFromSchema = (prismaSchema: string) =>
  prismaSchema.match(MODEL_REGEX)?.map((m) => m.trim()) || [];

export const generateBridgTsFiles = (
  pathToSchema: string,
  outputLocation: string,
  apiLoctation: string
) =>
  generateFiles(readFileAsString(pathToSchema), outputLocation, apiLoctation);

export const generateFiles = (
  schemaStr: string,
  outputLocation: string,
  apiLocation: string
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

export const generateRulesFile = (
  options: GeneratorOptions,
  outputRoot: string
) => {
  const rulesLocation = path.join(options.schemaPath, '..', 'rules.ts');
  const models = options.dmmf.datamodel.models.map((m) => m.name);
  if (!models.length || existsSync(rulesLocation)) return;
  const importPath = getRelativeImportPath(
    rulesLocation,
    `${outputRoot}/server/request-handler`
  );
  const rulesFileContent = `import { DbRules } from '${importPath}';

// https://github.com/joeroddy/bridg#database-rules
export const rules: DbRules = {
  // global default, allow/block non-specified queries, set to true only in development
  default: false, 
  // tableName: false | true,       - block/allow all queries on a table${models
    .map(
      (m, i) =>
        `\n\t${uncapitalize(m)}: {
    ${
      i === 0
        ? '// find: (uid) => ({ id: uid }) - query based authorization\n\t\t'
        : ''
    }find: (uid) => false,
    update: (uid, data) => false,
    create: (uid, data) => false,
    delete: (uid) => false,
  },`
    )
    .join('')}
};`;

  writeFileSafely(rulesLocation, rulesFileContent);
  const rulesWritePath = getRelativePathWithLeadingDot(
    process.cwd(),
    rulesLocation
  );

  console.log(`\n🥳 Generated Bridg rules file at: ${rulesWritePath}\n`);
};
