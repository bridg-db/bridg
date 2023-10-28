import path from 'path';

import { getRelativeImportPath, writeFileSafely } from '../../utils/file.util';
import { uncapitalize } from '../../utils/string.util';

export const generateServerTypes = (models: string[]) => {
  models = models || [];

  return `
  type HideableProps<ModelWhereInput> = (keyof Omit<ModelWhereInput, 'AND' | 'OR' | 'NOT'>)[];
  type WhitelistOption<ModelWhereInput> =
    | { shown: HideableProps<ModelWhereInput>; hidden?: never }
    | { hidden: HideableProps<ModelWhereInput>; shown?: never }
    | {};
  declare type OptionalPromise<T> = T | Promise<T>;
  declare type RuleCallback<ReturnType, CreateInput = undefined> = CreateInput extends undefined
    ? (uid?: string) => OptionalPromise<ReturnType>
    : (uid?: string, body?: CreateInput) => OptionalPromise<ReturnType>;
  declare type RuleOrCallback<RuleOptions, CreateInput> =
    | RuleOptions
    | RuleCallback<RuleOptions, CreateInput>;
  declare type BridgRule<ModelWhereInput, RuleOptions, CreateInput = undefined> =
    | RuleOrCallback<RuleOptions, CreateInput>
    | ({ rule: RuleOrCallback<RuleOptions, CreateInput> } & WhitelistOption<ModelWhereInput>);
  declare type ModelRules<WhereInput, CreateInput> = Partial<
    {
      find: BridgRule<WhereInput, boolean | WhereInput>;
      update: BridgRule<WhereInput, boolean | WhereInput, CreateInput>;
      create: BridgRule<WhereInput, boolean, CreateInput>;
      delete: BridgRule<WhereInput, boolean | WhereInput>;
      default: BridgRule<WhereInput, boolean, CreateInput>;
    } & WhitelistOption<WhereInput>
  >;

  export type DbRules = Partial<{${models.reduce(
    (acc, Model) =>
      `${acc}\n  ${uncapitalize(
        Model
      )}: ModelRules<Prisma.${Model}WhereInput, Prisma.${Model}UncheckedCreateInput>;`,
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
