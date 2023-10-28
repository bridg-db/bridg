import path from 'path';
import { getRelativeImportPath, writeFileSafely } from '../../utils/file.util';

const HANDLER_TEMPLATE = `
import { DbRules, ModelName, models } from '.';
import { MODEL_RELATION_MAP } from './model-relations';

export const handleRequest = async (
  requestBody: {
    model: ModelName;
    func: PrismaFunction;
    args?: any;
  },
  config: {
    db: PrismaClient;
    rules: DbRules;
    uid?: string;
  }
) => {
  const typedClient = withTypename(config.db);

  let { model, func, args } = requestBody;
  if (!models.includes(model)) return { status: 401, data: { error: 'Unauthorized', model } };
  args = args || {};
  const { db, uid, rules } = config;
  let method = FUNC_METHOD_MAP[func];

  try {
    if (func === 'upsert') {
      const updateArgs = {
        where: args.where,
        data: args.update,
      };
      await applyRulesWheres(updateArgs, { model, method: 'update' }, { uid, rules });
      // @ts-ignore - catch err 'Record to update not found.'
      const updateData = await db[model].update(updateArgs).catch(() => {});
      if (updateData) {
        return { status: 200, data: updateData };
      } else {
        // no data updated, continue as a .create query
        func = 'create';
        args = { data: args.create };
        method = 'create';
      }
    }

    await applyRulesWheres(args, { model, method }, { uid, rules });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') {
      return {
        status: 401,
        data: {
          error: \`Unauthorized Bridg query on model: \${err?.data?.model}\`,
        },
      };
    } else {
      return {
        status: 400,
        data: { error: \`Error executing Bridg query: \${err?.message}\` },
      };
    }
  }

  let cleanedData;
  try {
    // @ts-ignore
    const data = await typedClient[model][func](args);
    cleanedData = stripHiddenFields(data, rules);
  } catch (error) {
    console.error(error);
    return { status: 500, message: 'Internal server error.' };
  }

  return { status: 200, data: cleanedData };
};

const applyRulesWheres = async (
  args: { where?: any; include?: any; data?: any; select?: any },
  options: {
    model: ModelName;
    acceptsWheres?: boolean;
    method: 'find' | 'create' | 'update' | 'delete';
  },
  context: { uid?: string; rules: DbRules }
) => {
  const { uid, rules } = context;
  const { model, acceptsWheres = true, method } = options;
  const modelMethodValidator = rules[model]?.[method];
  const modelDefaultValidator = rules[model]?.default;
  // can't use "a || b || c", bc it would inadvertently skip "method:false" rules
  let queryValidator = modelMethodValidator ?? modelDefaultValidator ?? !!rules.default;
  // @ts-ignore
  let hiddenFields: string[] = rules[model]?.hidden || [];
  // @ts-ignore
  let shownFields: string[] = rules[model]?.shown;

  if (typeof queryValidator === 'object' && 'rule' in queryValidator) {
    // @ts-ignore
    hiddenFields = queryValidator.hidden || hiddenFields;
    // @ts-ignore
    shownFields = queryValidator.shown || shownFields;
    // @ts-ignore
    if(queryValidator.shown && !queryValidator.hidden) {
      // method.shown overrides model.hidden
      hiddenFields = [];
    }

    queryValidator = queryValidator.rule;
  }
  shownFields = shownFields?.filter((key) => !hiddenFields.includes(key));
  if (hiddenFields.length || shownFields?.length) {
    const keys = [...Object.keys(args.where || {}), ...Object.keys(args.data || {}), ...Object.keys(args.include || {}), ...Object.keys(args.select || {}),];
    const fieldsBeingAccessed = Array.from(new Set(keys));
    const queryHasIllegalFields = shownFields ? 
      !fieldsBeingAccessed.every((key) => shownFields.includes(key)) : 
      fieldsBeingAccessed.some((key) => hiddenFields.includes(key));
    if (queryHasIllegalFields) {
      throw { message: 'Unauthorized', data: { model } };
    }
  }

  const ruleWhereOrBool =
    typeof queryValidator === 'function' ? await queryValidator(uid, args?.data) : queryValidator;
  if (ruleWhereOrBool === false) throw { message: 'Unauthorized', data: { model } };
  if (typeof ruleWhereOrBool === 'object' && !acceptsWheres) {
    console.error(
      \`Rule error on nested model: "\${model}".  Cannot apply prisma where clauses to N-1 or 1-1 required relationships, only 1-N.
More info: https://github.com/prisma/prisma/issues/15837#issuecomment-1290404982

To fix this until issue is resolved: Change "\${model}" db rules to not rely on where clauses, OR for N-1 relationships, invert the include so the "\${model}" model is including the many table. (N-1 => 1-N)\`
    );
    throw { message: 'Unauthorized', data: { model } };
    // don't accept wheres for create
  } else if (method !== 'create') {
    if (ruleWhereOrBool === true && !acceptsWheres) {
      delete args.where;
    } else {
      const rulesWhere = ruleWhereOrBool === true ? {} : ruleWhereOrBool;
      // Note: AND: [args.where, rulesWhere] breaks on findUnique, update, delete
      args.where = { ...(args?.where || {}), AND: [rulesWhere] };
    }
  }
  const modelRelations = MODEL_RELATION_MAP[model];
  if (args.include) {
    await Promise.all(
      Object.keys(args.include).map((relationName: string) => {
        const m = modelRelations[relationName];
        const relationInclude = args.include[relationName];
        if (relationInclude === false) return true;
        else if (relationInclude === true) {
          args.include[relationName] = { where: {} };
          return applyRulesWheres(args.include[relationName], { ...m, method: 'find' }, context);
        } else {
          return applyRulesWheres(relationInclude, { ...m, method: 'find' }, context);
        }
      }),
    );
  } 

  // Handle relational data mutations
  if (args.data && ['create', 'update'].includes(method)) {
    const relationNames = Object.keys(modelRelations);
    const relationsInDataProp = Object.keys(args.data).filter((key) => relationNames.includes(key));
    await Promise.all(
      relationsInDataProp
        .map((relationName) => {
          // mutationMethod: create | connect | connectOrCreate | delete | deleteMany | disconnect
          // | set | update | updateMany | upsert | push (mongo only)
          return Object.keys(args.data[relationName]).map(async (mutationMethod) => {
            // disabled: connectOrCreate, set / disconnect (no wheres), upsert
            if (
              !['connect', 'create', 'delete', 'deleteMany', 'update', 'updateMany'].includes(
                mutationMethod
              )
            ) {
              console.error(
                \`Nested \${mutationMethod} not yet supported in Bridg. Could violate database rules without further development.\`
              );
              throw Error();
            }
            const method =
              mutationMethod === 'connect'
                ? 'update'
                : FUNC_METHOD_MAP[mutationMethod as PrismaFunction];
            if (!method) throw Error();
            const mutationMethodValue = args.data[relationName][mutationMethod];

            // diff data input for each nested method, for create/connect, its direct data,
            // for delete/deleteMany, its a direct where,
            // for update/updateMany its { where:{}, data:{} }
            const argType = ['update', 'updateMany'].includes(mutationMethod)
              ? 'WHERE_AND_DATA'
              : ['create', 'connect'].includes(mutationMethod)
              ? 'DATA'
              : ['delete', 'deleteMany'].includes(mutationMethod)
              ? 'WHERE'
              : null;
            if (!argType) throw Error('invalid argType');

            const nestedArgs = {
              WHERE_AND_DATA: mutationMethodValue,
              WHERE: { where: mutationMethodValue },
              DATA: { data: mutationMethodValue },
            }[argType];

            await applyRulesWheres(
              nestedArgs,
              { ...modelRelations[relationName], method },
              context
            );

            const computedArgs = {
              WHERE_AND_DATA: nestedArgs,
              WHERE: nestedArgs.where,
              DATA: nestedArgs.data,
            }[argType];

            args.data[relationName][mutationMethod] = computedArgs;
          });
        })
        .flat(),
    );
  }
};

const stripHiddenFields = (data: {} | any[], rules: DbRules): any => {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) return data.map((item) => stripHiddenFields(item, rules));

  // recursively walk through data, and delete any hidden fields, checking models via the $kind property
  const deleteHiddenFieldsFromObj = (data: any) => {
    const cleaned: any = {};
    const model = data?.['$kind'];

    // @ts-ignore
    let hiddenFields: string[] = rules[model]?.find?.hidden || rules[model]?.hidden || [];
    // @ts-ignore
    if(rules[model]?.find?.shown && !rules[model]?.find?.hidden) hiddenFields = [];
    hiddenFields.push('$kind');
    // @ts-ignore
    let shownFields: string[] | undefined = rules[model]?.find?.shown || rules[model]?.shown;
    shownFields = shownFields?.filter((key) => !hiddenFields.includes(key));

    Object.keys(data).forEach((key) => {
      const legalKey = shownFields ? shownFields.includes(key) : !hiddenFields.includes(key);
      if (legalKey) {
        const isNestedData =
          typeof data[key] === 'object' &&
          data[key] &&
          ('$kind' in data[key] || Array.isArray(data[key]));

        cleaned[key] = isNestedData ? stripHiddenFields(data[key], rules) : data[key];
      }
    });

    return cleaned;
  };

  return deleteHiddenFieldsFromObj(data);
};

const funcOptions = [
  'aggregate',
  'count',
  'create',
  'delete',
  'deleteMany',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'groupBy',
  'update',
  'updateMany',
  'upsert',
] as const;
type PrismaFunction = typeof funcOptions[number];

const FUNC_METHOD_MAP: {
  [key in PrismaFunction]: 'find' | 'create' | 'update' | 'delete';
} = {
  aggregate: 'find',
  count: 'find',
  create: 'create',
  delete: 'delete',
  deleteMany: 'delete',
  findFirst: 'find',
  findFirstOrThrow: 'find',
  findMany: 'find',
  findUnique: 'find',
  findUniqueOrThrow: 'find',
  groupBy: 'find',
  update: 'update',
  updateMany: 'update',
  upsert: 'update',
};

const withTypename = Prisma.defineExtension((client) => {
  type ModelKey = Exclude<keyof typeof client, \`\${string}\` | symbol>;
  type Result = { [K in ModelKey]: { $kind: { needs: {}; compute: () => K } } };

  const result = {} as Result;
  const modelKeys = Object.keys(client).filter((key) => !key.startsWith('$')) as ModelKey[];
  modelKeys.forEach((k) => {
    // @ts-ignore
    result[k] = { $kind: { needs: {}, compute: () => k as any } };
  });

  return client.$extends({ result });
});
`;

const generateHandlerFile = ({
  outputLocation,
  prismaLocation = `@prisma/client`,
}: {
  outputLocation: string;
  prismaLocation?: string;
}) => {
  const handlerPath = path.join(outputLocation, 'server', 'request-handler.ts');
  const prismaImportPath = prismaLocation
    ? getRelativeImportPath(handlerPath, prismaLocation)
    : `@prisma/client`;
  const fileContent = `import { Prisma, PrismaClient } from '${prismaImportPath}';${HANDLER_TEMPLATE}`;
  writeFileSafely(handlerPath, fileContent);

  return fileContent;
};

export default generateHandlerFile;
