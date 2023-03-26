import { generateServerTypes } from './serverTypes.generate';
import { writeFileSafely } from '../../utils/file.util';

const HANDLER_TEMPLATE = `import { Prisma, PrismaClient } from '@prisma/client';

export const handleRequest = async (
  requestBody: {
    model: Model;
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
    options: { model: Model; acceptsWheres?: boolean; method: 'get' | 'post' | 'patch' | 'delete' },
  ) => {
    const { model, acceptsWheres, method } = options;
    const queryValidator = rules[model]?.[method] || false;
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
    } else if (method !== 'post') {
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
            return applyRulesWheres(args.include[relationName], { ...m, method: 'get' });
          } else {
            return applyRulesWheres(relationInclude, { ...m, method: 'get' });
          }
        }),
      );
    }

    // Handle nested creation / connection
    if (args.data && method === 'post') {
      const relationNames = Object.keys(modelRelations);
      const relationsInDataProp = Object.keys(args.data).filter((key) => relationNames.includes(key));
      await Promise.all(
        relationsInDataProp
          .map((relationName) => {
            // mutationMethod: create | connect | connectOrCreate
            return Object.keys(args.data[relationName]).map((mutationMethod) => {
              const m = modelRelations[relationName];
              const method = mutationMethod === 'connect' ? 'patch' : 'post';
              if (mutationMethod === 'connectOrCreate') {
                // TODO: decide how to authorize connectOrCreate, it's via post for now
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
  'upsert',
] as const;
type PrismaFunction = typeof funcOptions[number];

const FUNC_METHOD_MAP: { [key in PrismaFunction]: 'get' | 'post' | 'patch' | 'delete' } = {
  aggregate: 'get',
  count: 'get',
  create: 'post',
  delete: 'delete',
  deleteMany: 'delete',
  findFirst: 'get',
  findFirstOrThrow: 'get',
  findMany: 'get',
  findUnique: 'get',
  findUniqueOrThrow: 'get',
  groupBy: 'get',
  update: 'get',
  updateMany: 'get',
  upsert: 'get',
};
`;

// Currently this is just a static file with no templating,
// just generating it now bc its likely we'll need to template it eventually
const generateHandlerFile = (models: string[], schemaStr: string) => {
  const types = generateServerTypes(models, schemaStr);
  const fileContent = `${HANDLER_TEMPLATE}\n${types}`;

  // writeFileSafely(`./node_modules/bridg/dist/package/server/request-handler.ts`, HANDLER_TEMPLATE);
  writeFileSafely(`./node_modules/bridg/tmp/server/request-handler.ts`, fileContent);
};

export default generateHandlerFile;
