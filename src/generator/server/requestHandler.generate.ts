import { generateServerTypes } from './serverTypes.generate';
import { writeFileSafely } from '../../utils/file.util';

const HANDLER_TEMPLATE = `import { Prisma, PrismaClient } from '@prisma/client';

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
  if (!models.includes(model)) return { status: 401, data: { error: 'Unauthorized' } };
  args = args || {};
  const { db, uid, rules } = config;
  const method = FUNC_METHOD_MAP[func];

  const applyRulesWheres = async (
    args: { where?: any; include?: any; data?: any },
    options: { model: ModelName; acceptsWheres?: boolean; method: 'find' | 'create' | 'update' | 'delete' },
  ) => {
    const { model, acceptsWheres = true, method } = options;
    const modelMethodValidator = rules[model]?.[method];
    const modelDefaultValidator = rules[model]?.default;
    // can't use "a || b || c", bc it would inadvertently skip "method:false" rules
    const queryValidator =
      modelMethodValidator !== undefined
        ? modelMethodValidator
        : modelDefaultValidator !== undefined
        ? modelDefaultValidator
        : !!rules.default;
    const ruleWhereOrBool =
      typeof queryValidator === 'function' ? await queryValidator(uid, args?.data) : queryValidator;
    if (ruleWhereOrBool === false) throw new Error('Unauthorized');
    if (typeof ruleWhereOrBool === 'object' && !acceptsWheres) {
      console.log(
        \`Rule error on nested model: "\${model}".  Cannot apply prisma where clauses to N-1 or 1-1 relationships, only 1-N.
More info: https://github.com/prisma/prisma/issues/16049

To fix this until issue is resolved: Change "\${model}" read rules to not rely on where clauses, OR for N-1 relationships, invert the include so the "\${model}" model is including the many table. (N-1 => 1-N)\`,
      );
      throw new Error('Unauthorized');
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
            return applyRulesWheres(args.include[relationName], { ...m, method: 'find' });
          } else {
            return applyRulesWheres(relationInclude, { ...m, method: 'find' });
          }
        }),
      );
    }

    // Handle nested creation / connection
    if (args.data && method === 'create') {
      const relationNames = Object.keys(modelRelations);
      const relationsInDataProp = Object.keys(args.data).filter((key) => relationNames.includes(key));
      await Promise.all(
        relationsInDataProp
          .map((relationName) => {
            // mutationMethod: create | connect | connectOrCreate
            return Object.keys(args.data[relationName]).map((mutationMethod) => {
              const m = modelRelations[relationName];
              const method = mutationMethod === 'connect' ? 'update' : 'create';
              if (mutationMethod === 'connectOrCreate') {
                // TODO: decide how to authorize connectOrCreate, it's via create for now
                console.log('connectOrCreate not yet supported in Bridg, could violate database rules');
                throw Error('');
              }

              return applyRulesWheres({ data: args.data[relationName][mutationMethod] }, { ...m, method });
            });
          })
          .flat(),
      );
    }
  };

  try {
    await applyRulesWheres(args, { model, method });
  } catch (err: any) {
    return { status: 401, data: { error: 'Unauthorized' } };
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
  // 'upsert',
] as const;
type PrismaFunction = typeof funcOptions[number];

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
  // upsert: 'update',
}`;

// Currently this is just a static file with no templating,
// just generating it now bc its likely we'll need to template it eventually
const generateHandlerFile = (models: string[], schemaStr: string, outputLocation: string) => {
  const types = generateServerTypes(models, schemaStr);
  const fileContent = `${HANDLER_TEMPLATE}\n${types}`;

  writeFileSafely(`${outputLocation}/server/request-handler.ts`, fileContent);
};

export default generateHandlerFile;
