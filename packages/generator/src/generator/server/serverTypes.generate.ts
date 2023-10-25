import path from 'path';

import { getRelativeImportPath, writeFileSafely } from '../../utils/file.util';
import { uncapitalize } from '../../utils/string.util';

export const generateServerTypes = (models: string[]) => {
  models = models || [];

  return `
  declare type OptionalPromise<T> = T | Promise<T>;
  declare type RuleCallback<ReturnType, CreateInput = undefined> = CreateInput extends undefined
    ? (uid?: string) => OptionalPromise<ReturnType>
    : (uid?: string, body?: CreateInput) => OptionalPromise<ReturnType>;
  declare type RuleOrCallback<RuleOptions, CreateInput> =
    | RuleOptions
    | RuleCallback<RuleOptions, CreateInput>;
  declare type BridgRule<Model, RuleOptions, CreateInput = undefined> =
    | RuleOrCallback<RuleOptions, CreateInput>
    | {
        rule: RuleOrCallback<RuleOptions, CreateInput>;
        hidden?: (keyof Model)[];
      };
  declare type ModelRules<Model, WhereInput, CreateInput> = Partial<{
    find: BridgRule<Model, boolean | WhereInput>;
    update: BridgRule<Model, boolean | WhereInput, CreateInput>;
    create: BridgRule<Model, boolean, CreateInput>;
    delete: BridgRule<Model, boolean | WhereInput>;
    default: BridgRule<Model, boolean, CreateInput>;
    hidden?: string[];
  }>;

  // TODO: investigate getting input types via generics, so we only have to send the model name:
  // https://github.com/prisma/prisma/issues/6980
  export type DbRules = Partial<{${models.reduce(
    (acc, Model) =>
      `${acc}\n  ${uncapitalize(
        Model
      )}: ModelRules<${Model}, Prisma.${Model}WhereInput, Prisma.${Model}UncheckedCreateInput>;`,
    `\n  default: boolean;`
  )}
  }>;
  
  export const models = [${models.reduce(
    (acc, m) => `${acc}${acc ? ', ' : ''}'${uncapitalize(m)}'`,
    ``
  )}] as const;
  // TODO: get this from Prisma
  // export type ClientModelName = Uncapitalize<Prisma.ModelName>;
  // still need the JS array though? so no point?
  export type ModelName = typeof models[number];
  `;
};

export const generateServerIndexTypesFile = ({
  modelNames,
  outputLocation,
  prismaLocation = `@prisma/client`,
}: {
  modelNames: string[];
  outputLocation: string;
  prismaLocation?: string;
}) => {
  const types = generateServerTypes(modelNames);
  const filePath = path.join(outputLocation, 'server', 'index.ts');
  const prismaImportPath = prismaLocation
    ? getRelativeImportPath(filePath, prismaLocation)
    : `@prisma/client`;

  // { Prisma, User, Model2, Model3 }
  const importStatement = `import { Prisma, ${modelNames.join(', ')} } from '${prismaImportPath}';`;
  const fileContent = `${importStatement}${types}`;

  writeFileSafely(filePath, fileContent);

  return fileContent;
};
