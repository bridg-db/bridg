import path from 'path';

import { getRelativeImportPath, writeFileSafely } from '../../utils/file.util';
import { uncapitalize } from '../../utils/string.util';

export const generateServerTypes = (models: string[]) => {
  models = models || [];

  return `
  type MethodTypes = 'find' | 'update' | 'create' | 'delete';
  type FindMethods =
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'aggregate'
    | 'count'
    | 'groupBy';
  type UpdateMethods = 'update' | 'updateMany' | 'upsert';
  type CreateMethods = 'create' | 'createMany' | 'upsert';
  type DeleteMethods = 'delete' | 'deleteMany';
  
  type HideableProps<ModelWhereInput> = (keyof Omit<ModelWhereInput, 'AND' | 'OR' | 'NOT'>)[];
  type WhitelistOption<ModelWhereInput> =
    | { allowedFields: HideableProps<ModelWhereInput>; blockedFields?: never }
    | { blockedFields: HideableProps<ModelWhereInput>; allowedFields?: never }
    | {};
  declare type OptionalPromise<T> = T | Promise<T>;
  declare type RuleCallback<ReturnType, CreateInput = undefined> = CreateInput extends undefined
    ? (uid?: string) => OptionalPromise<ReturnType>
    : (uid?: string, body?: CreateInput) => OptionalPromise<ReturnType>;
  declare type RuleOrCallback<RuleOptions, CreateInput> =
    | RuleOptions
    | RuleCallback<RuleOptions, CreateInput>;
  declare type BridgRule<Methods, ModelWhereInput, RuleOptions, CreateInput = undefined> =
    | RuleOrCallback<RuleOptions, CreateInput>
    | ({
        rule: RuleOrCallback<RuleOptions, CreateInput>;
        // TODO: callback typing
        before?: (uid: string, query: any, ctx: { method: Methods; originalQuery: any }) => any;
        after?: (
          uid: string,
          data: any,
          ctx: { method: Methods; queryExecuted: any; originalQuery: any }
        ) => any;
      } & WhitelistOption<ModelWhereInput>);
  declare type ModelRules<WhereInput, CreateInput> = Partial<
    {
      find: BridgRule<FindMethods, WhereInput, boolean | WhereInput>;
      update: BridgRule<UpdateMethods, WhereInput, boolean | WhereInput, CreateInput>;
      create: BridgRule<CreateMethods, WhereInput, boolean, CreateInput>;
      delete: BridgRule<DeleteMethods, WhereInput, boolean | WhereInput>;
      default: BridgRule<undefined, WhereInput, boolean, CreateInput>;
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
