import path from 'path';
import { BridgConfigOptions } from 'src/generator/client/config.generate';
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
    onSubscriptionCreated?: (sub: any) => void;
    onSubscriptionEvent?: (args: any) => void;
  },
) => {
  const typedClient = withTypename(config.db);

  const { db, uid, rules, onSubscriptionEvent, onSubscriptionCreated } = config;
  let { model, func, args } = requestBody;
  args = args || {};
  if (!models.includes(model)) return { status: 401, data: { error: 'Unauthorized', model } };
  if (func === 'subscribe' && !onSubscriptionEvent)
    return { status: 500, data: { error: 'Subscribe callback not supplied', model } };

  const originalQuery = deepClone(args);

  let method = FUNC_METHOD_MAP[func];
  try {
    if (func === 'upsert') {
      const updateArgs = {
        where: args.where,
        data: args.update,
      };
      await applyRulesWheres(updateArgs, { model, method: 'update' }, { uid, rules });
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
    await applyRulesWheres(args, { model, method, func }, { uid, rules });
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
        data: { error: \`Error executing Bridg query: \$\{err?.message}\` },
      };
    }
  }

  let cleanedData;
  let queryArgs;
  let data;
  try {
    const beforeHook = rules[model]?.[method]?.before;
    queryArgs = beforeHook
      ? beforeHook(uid, args, { method: func, originalQuery, prisma: db })
      : args;

    if (func === 'subscribe') {
      if (queryArgs.where && whereReferencesRelations(queryArgs.where, model)) {
        return {
          status: 400,
          data: {
            error: \`Pulse does not support querying relational fields. Check your DB rule for \$\{model}.find\`,
          },
        };
      }
      const subscribeArgs = buildSubscribeArgs(queryArgs);
      const subscription = await db[model][func](subscribeArgs);
      onSubscriptionCreated?.(subscription);
      if (subscription instanceof Error) onSubscriptionEvent({ error: subscription });
      for await (const event of subscription) {
        const eventValueKeys = ['before', 'after', 'created', 'deleted'];
        const cleanedData = eventValueKeys.reduce((acc, key) => {
          if (key in event) {
            acc[key] = stripBlockedFields({ $kind: model, ...event[key] }, rules);
          }
          return acc;
        }, event);
        onSubscriptionEvent({ ...event, ...cleanedData });
      }
      return;
    } else {
      data = await typedClient[model][func](queryArgs);
      cleanedData = stripBlockedFields(data, rules);
    }
  } catch (error) {
    console.error(error);
    return { status: 500, message: 'Internal server error.' };
  }

  const afterHook = rules[model]?.[method]?.after;
  const resultData = afterHook
    ? await afterHook(uid, cleanedData, {
        method: func,
        queryExecuted: queryArgs,
        originalQuery,
        prisma: db,
      })
    : cleanedData;

  return { status: 200, data: resultData };
};

const applyRulesWheres = async (
  args: { where?: any; include?: any; data?: any; select?: any },
  options: {
    model: ModelName;
    acceptsWheres?: boolean;
    method: 'find' | 'create' | 'update' | 'delete';
    func?: PrismaFunction;
  },
  context: { uid?: string; rules: DbRules },
) => {
  const { uid, rules } = context;
  const { model, acceptsWheres = true, method, func } = options;
  const modelMethodValidator = rules[model]?.[method];
  const modelDefaultValidator = rules[model]?.default;
  // can't use "a || b || c", bc it would inadvertently skip "method:false" rules
  let queryValidator = modelMethodValidator ?? modelDefaultValidator ?? !!rules.default;
  let blockedFields: string[] = rules[model]?.blockedFields || [];
  let allowedFields: string[] = rules[model]?.allowedFields;

  if (typeof queryValidator === 'object' && 'rule' in queryValidator) {
    blockedFields = queryValidator.blockedFields || blockedFields;
    allowedFields = queryValidator.allowedFields || allowedFields;
    if (queryValidator.allowedFields && !queryValidator.blockedFields) {
      // method.allowedFields overrides model.blockedFields
      blockedFields = [];
    }

    queryValidator = queryValidator.rule;
  }
  allowedFields = allowedFields?.filter((key) => !blockedFields.includes(key));
  if (blockedFields.length || allowedFields?.length) {
    const keys = [
      ...Object.keys(args.where || {}),
      ...Object.keys(args.data || {}),
      ...Object.keys(args.include || {}),
      ...Object.keys(args.select || {}),
    ];
    const fieldsBeingAccessed = Array.from(new Set(keys));
    const queryHasIllegalFields = allowedFields
      ? !fieldsBeingAccessed.every((key) => allowedFields.includes(key))
      : fieldsBeingAccessed.some((key) => blockedFields.includes(key));
    if (queryHasIllegalFields) {
      throw { message: 'Unauthorized', data: { model } };
    }
  }

  let ruleWhereOrBool;
  if(typeof queryValidator !== 'boolean' && method === 'create') {
    if(typeof queryValidator !== 'function') {
      throw { message:  \`Invalid rule result for \${model}:\${method} - Create only accepts booleans\` }
    } else if(!args.data){
      throw { message: 'No data provided for .create or .createMany' }
    }

    console.log('args.data', args.data);
    
    if (Array.isArray(args.data)) {
      // if (!Array.isArray(args.data)) throw { message: 'createMany data must be an array' };
      console.log('createMany data', args.data);
      
      const ruleBoolArray = await Promise.all(
        args.data.map(async (data) => queryValidator(uid, data)),
      );
      console.log('arr results', ruleBoolArray);
      
      ruleWhereOrBool = !ruleBoolArray.some((result) => result !== true);
    } else {
      ruleWhereOrBool = await queryValidator(uid, args.data);
    }
  } else {
    ruleWhereOrBool =
      typeof queryValidator === 'function' ? await queryValidator(uid, args?.data) : queryValidator;
  }

  if (ruleWhereOrBool === false) throw { message: 'Unauthorized', data: { model } };
  if (typeof ruleWhereOrBool === 'object' && !acceptsWheres) {
    console.error(
      \`Rule error on nested model: "\${model}".  Cannot apply prisma where clauses to N-1 or 1-1 required relationships, only 1-N.
More info: https://github.com/prisma/prisma/issues/15837#issuecomment-1290404982

To fix this until issue is resolved: Change "\${model}" db rules to not rely on where clauses, OR for N-1 relationships, invert the include so the "\${model}" model is including the many table. (N-1 => 1-N)\`,
    );
    throw { message: 'Unauthorized', data: { model } };
    // don't accept wheres for create
  } else if (method !== 'create') {
    if (ruleWhereOrBool === true && !acceptsWheres) {
      delete args.where;
    } else {
      const rulesWhere = ruleWhereOrBool === true ? {} : ruleWhereOrBool;
      // Note: AND: [args.where, rulesWhere] breaks on findUnique, update, delete
      args.where = { ...(args?.where || {}), AND: [rulesWhere, ...(args?.where?.AND || [])] };
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
                mutationMethod,
              )
            ) {
              console.error(
                \`Nested \${mutationMethod} not yet supported in Bridg. Could violate database rules without further development.\`,
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
              context,
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

const stripBlockedFields = (data: {} | any[], rules: DbRules): any => {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) return data.map((item) => stripBlockedFields(item, rules));

  // recursively walk through data, and delete any blocked fields, checking models via the $kind property
  const deleteBlockedFieldsFromObj = (data: any) => {
    const cleaned: any = {};
    const model = data?.['$kind'];

    let blockedFields: string[] =
      rules[model]?.find?.blockedFields || rules[model]?.blockedFields || [];
    if (rules[model]?.find?.allowedFields && !rules[model]?.find?.blockedFields) blockedFields = [];
    blockedFields.push('$kind');
    let allowedFields: string[] | undefined =
      rules[model]?.find?.allowedFields || rules[model]?.allowedFields;
    allowedFields = allowedFields?.filter((key) => !blockedFields.includes(key));

    Object.keys(data).forEach((key) => {
      const legalKey = allowedFields ? allowedFields.includes(key) : !blockedFields.includes(key);
      if (legalKey) {
        const isNestedData =
          typeof data[key] === 'object' &&
          data[key] &&
          ('$kind' in data[key] || Array.isArray(data[key]));

        cleaned[key] = isNestedData ? stripBlockedFields(data[key], rules) : data[key];
      }
    });

    return cleaned;
  };

  return deleteBlockedFieldsFromObj(data);
};

const asArray = (item: Array | any) => (Array.isArray(item) ? item : [item]);
const buildSubscribeArgs = (queryArgs: {
  where: {}; // database rules
  update?: { after: {} };
  create?: {};
  delete?: {};
}) => {
  const applyRuleToAll = !queryArgs.update && !queryArgs.create && !queryArgs.delete;
  const where = queryArgs.where;
  const subscribeArgs = {};
  ['create', 'update', 'delete'].forEach((method) => {
    const methodArgs = queryArgs[method];
    let userQuery = method === 'update' ? methodArgs?.after || methodArgs : methodArgs;
    if (!userQuery && !applyRuleToAll) return;
    const queryWithRules = {
      ...userQuery,
      AND: [...(where?.AND || []), ...asArray(userQuery?.AND || [])],
    };

    subscribeArgs[method] = method === 'update' ? { after: queryWithRules } : queryWithRules;
  });
  return subscribeArgs;
};

const whereReferencesRelations = (where: any, model: ModelName) => {
  if (!where) return false;
  const modelRelations = MODEL_RELATION_MAP[model];
  const relationKeys = Object.keys(modelRelations);

  if (relationKeys.some((key) => where[key])) return true;
  if (where.OR?.some((orQuery) => whereReferencesRelations(orQuery, model))) return true;
  if (where.AND?.some((andQuery) => whereReferencesRelations(andQuery, model))) return true;

  return false;
};

const funcOptions = [
  'aggregate',
  'count',
  'create',
  'createMany',
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
  // pulse only
  'subscribe',
] as const;
type PrismaFunction = (typeof funcOptions)[number];

const FUNC_METHOD_MAP: {
  [key in PrismaFunction]: 'find' | 'create' | 'update' | 'delete';
} = {
  aggregate: 'find',
  count: 'find',
  create: 'create',
  createMany: 'create',
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
  // pulse only
  subscribe: 'find',
};

const withTypename = Prisma.defineExtension((client) => {
  type ModelKey = Exclude<keyof typeof client, \`\${string}\` | symbol>;
  type Result = { [K in ModelKey]: { $kind: { needs: {}; compute: () => K } } };

  const result = {} as Result;
  const modelKeys = Object.keys(client).filter((key) => !key.startsWith('$')) as ModelKey[];
  modelKeys.forEach((k) => {
    result[k] = { $kind: { needs: {}, compute: () => k as any } };
  });

  return client.$extends({ result });
});

// structuredClone unavailable in node<17.0.0
const deepClone = (obj, seen = new WeakMap()) => {
  if (obj === null || typeof obj !== 'object') return obj;
  // Handle circular references
  if (seen.has(obj)) return seen.get(obj);
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  const clone = Object.create(Object.getPrototypeOf(obj));
  seen.set(obj, clone);
  for (let key in obj) clone[key] = deepClone(obj[key], seen);
  return clone;
};
`;

const getPulseExports = (withPulse: boolean) =>
  withPulse
    ? `
const withPulseClient = (client: PrismaClient, apiKey) => client.$extends(withPulse({ apiKey }));
export type PulseSubscribe<M extends ModelName> = ReturnType<
  typeof withPulseClient
>[M]['subscribe'];`
    : `export type PulseSubscribe<T> = undefined;`;

export const generateHandlerFile = ({
  bridgConfig,
  outputLocation,
  prismaLocation = `@prisma/client`,
}: {
  bridgConfig: BridgConfigOptions;
  outputLocation: string;
  prismaLocation?: string;
}) => {
  const withPulse = !!bridgConfig.pulse;
  const handlerPath = path.join(outputLocation, 'server', 'request-handler.ts');
  const prismaImportPath = prismaLocation
    ? getRelativeImportPath(handlerPath, prismaLocation)
    : `@prisma/client`;

  const isEdge = `${bridgConfig.edge}` === 'true';
  const fileContent = `// @ts-nocheck
  import { Prisma, PrismaClient } from '${prismaImportPath}${isEdge ? '/edge' : ''}';
  ${withPulse ? `import { withPulse } from '@prisma/extension-pulse';` : ''}
  ${HANDLER_TEMPLATE}
  ${getPulseExports(withPulse)}`;

  writeFileSafely(handlerPath, fileContent);

  return fileContent;
};
