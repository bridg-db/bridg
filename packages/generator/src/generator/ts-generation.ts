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
import { BridgConfigOptions, generateBridgConfigFile } from './client/config.generate';
import { generateModelRelationsFile } from './server/modelRelations.generate';
import { generateHandlerFile } from './server/requestHandler.generate';
import { generateServerIndexTypesFile } from './server/serverTypes.generate';

export const MODEL_REGEX = /(?<=model\s)\w+(?=\s?{)/gis;
export const parseModelNamesFromSchema = (prismaSchema: string) =>
  prismaSchema.match(MODEL_REGEX)?.map((m) => m.trim()) || [];

export const generateBridgTsFiles = (options: GeneratorOptions, outputLocation: string) =>
  generateFiles({
    schemaStr: readFileAsString(options.schemaPath),
    modelNames: options.dmmf.datamodel.models.map((m) => m.name),
    outputLocation,
    prismaLocation:
      options.otherGenerators.find((g) => g.name === 'client')?.output?.value || undefined,
    bridgConfig: options.generator.config as BridgConfigOptions,
  });

export const generateFiles = ({
  schemaStr,
  modelNames,
  outputLocation,
  prismaLocation,
  bridgConfig = {},
}: {
  schemaStr: string;
  modelNames: string[];
  outputLocation: string;
  prismaLocation?: string;
  bridgConfig?: BridgConfigOptions;
}) => {
  if (!schemaStr) throw new Error(`Schema not provided`);
  //   if (!schemaStr.match(/.+["']extendedWhereUnique["'].+/g)) {
  //     console.error(`ERROR: Ensure you've added 'extendedWhereUnique' to your schema.prisma:

  // generator client {
  //     provider        = "your-provider"
  //     previewFeatures = ["extendedWhereUnique"]
  // }`)
  //   }

  schemaStr = strip(schemaStr);

  generateClientDbFile({ modelNames, outputLocation, prismaLocation });
  // server
  generateHandlerFile({ bridgConfig, outputLocation, prismaLocation });
  generateModelRelationsFile({ modelNames, schemaStr, outputLocation });
  generateServerIndexTypesFile({ modelNames, outputLocation, prismaLocation });
  generateBridgConfigFile({ bridgConfig, outputLocation });
};

export const generateRulesFile = (options: GeneratorOptions, outputRoot: string) => {
  const rulesLocation = path.join(options.schemaPath, '..', 'rules.ts');
  const modelNames = options.dmmf.datamodel.models.map((m) => m.name);
  if (!modelNames.length || existsSync(rulesLocation)) return;
  const importPath = getRelativeImportPath(rulesLocation, `${outputRoot}/request-handler`);
  const rulesFileContent = `import { DbRules } from '${importPath}';

// https://github.com/joeroddy/bridg#database-rules
export const rules: DbRules = {
  // global default, allow/block non-specified queries, set to true only in development
  default: false, 
  // tableName: false | true,       - block/allow all queries on a table${modelNames
    .map(
      (m, i) =>
        `\n\t${uncapitalize(m)}: {
    ${
      i === 0 ? '// find: (uid) => ({ id: uid }) - query based authorization\n\t\t' : ''
    }find: (uid) => false,
    update: (uid, data) => false,
    create: (uid, data) => false,
    delete: (uid) => false,
  },`
    )
    .join('')}
};`;

  writeFileSafely(rulesLocation, rulesFileContent);
  const rulesWritePath = getRelativePathWithLeadingDot(process.cwd(), rulesLocation);

  console.log(`\n🥳 Generated Bridg rules file at: ${rulesWritePath}\n`);
};
