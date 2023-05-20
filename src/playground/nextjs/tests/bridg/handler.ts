import { Prisma, PrismaClient } from '@prisma/client';

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
  },
) => {
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
      // @ts-expect-error - catch err 'Record to update not found.'
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
      return { status: 401, data: { error: `Unauthorized Bridg query on model: ${err?.data?.model}` } };
    } else {
      return { status: 400, data: { error: `Error executing Bridg query: ${err?.message}` } };
    }
  }

  let data;
  try {
    // @ts-expect-error
    data = await db[model][func](args);
  } catch (error) {
    console.error(error);
    return { status: 500, message: 'Internal server error.' };
  }

  return { status: 200, data };
};

const applyRulesWheres = async (
  args: { where?: any; include?: any; data?: any },
  options: { model: ModelName; acceptsWheres?: boolean; method: 'find' | 'create' | 'update' | 'delete' },
  context: { uid?: string; rules: DbRules },
) => {
  const { uid, rules } = context;
  const { model, acceptsWheres = true, method } = options;
  const modelMethodValidator = rules[model]?.[method];
  const modelDefaultValidator = rules[model]?.default;
  // can't use "a || b || c", bc it would inadvertently skip "method:false" rules
  const queryValidator = modelMethodValidator ?? modelDefaultValidator ?? !!rules.default;
  const ruleWhereOrBool = typeof queryValidator === 'function' ? await queryValidator(uid, args?.data) : queryValidator;
  if (ruleWhereOrBool === false) throw { message: 'Unauthorized', data: { model } };
  if (typeof ruleWhereOrBool === 'object' && !acceptsWheres) {
    console.error(
      `Rule error on nested model: "${model}".  Cannot apply prisma where clauses to N-1 or 1-1 required relationships, only 1-N.
More info: https://github.com/prisma/prisma/issues/15837#issuecomment-1290404982

To fix this until issue is resolved: Change "${model}" db rules to not rely on where clauses, OR for N-1 relationships, invert the include so the "${model}" model is including the many table. (N-1 => 1-N)`,
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
            if (!['connect', 'create', 'delete', 'deleteMany', 'update', 'updateMany'].includes(mutationMethod)) {
              console.error(
                `Nested ${mutationMethod} not yet supported in Bridg. Could violate database rules without further development.`,
              );
              throw Error();
            }
            const method = mutationMethod === 'connect' ? 'update' : FUNC_METHOD_MAP[mutationMethod as PrismaFunction];
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

            await applyRulesWheres(nestedArgs, { ...modelRelations[relationName], method }, context);

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
type PrismaFunction = (typeof funcOptions)[number];

const FUNC_METHOD_MAP: { [key in PrismaFunction]: 'find' | 'create' | 'update' | 'delete' } = {
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

const MODEL_RELATION_MAP: { [key in ModelName]: { [key: string]: { model: ModelName; acceptsWheres: boolean } } } = {
  user: {
    blogs: {
      acceptsWheres: true,
      model: 'blog',
    },
  },
  blog: {
    user: {
      acceptsWheres: true,
      model: 'user',
    },
    comments: {
      acceptsWheres: true,
      model: 'comment',
    },
  },
  comment: {
    blog: {
      acceptsWheres: true,
      model: 'blog',
    },
  },
};

type OptionalPromise<T> = T | Promise<T>;

type RuleCallback<ReturnType, CreateInput = undefined> = CreateInput extends undefined
  ? (uid?: string) => OptionalPromise<ReturnType>
  : (uid?: string, body?: CreateInput) => OptionalPromise<ReturnType>;

type ModelRules<WhereInput, CreateInput> = Partial<{
  find: boolean | WhereInput | RuleCallback<boolean | WhereInput>;
  update: boolean | WhereInput | RuleCallback<boolean | WhereInput, CreateInput>;
  create: boolean | RuleCallback<boolean, CreateInput>;
  delete: boolean | WhereInput | RuleCallback<boolean | WhereInput>;
  default: boolean | RuleCallback<boolean, CreateInput>;
}>;

export type DbRules = Partial<{
  default: boolean;
  user: ModelRules<Prisma.UserWhereInput, Prisma.UserUncheckedCreateInput>;
  blog: ModelRules<Prisma.BlogWhereInput, Prisma.BlogUncheckedCreateInput>;
  comment: ModelRules<Prisma.CommentWhereInput, Prisma.CommentUncheckedCreateInput>;
}>;

const models = ['user', 'blog', 'comment'] as const;
type ModelName = (typeof models)[number];
