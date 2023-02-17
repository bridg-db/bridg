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

  const applyRulesWheres = (args: { where?: any; include?: any; data?: any }, model: Model, acceptsWheres = true) => {
    const queryValidator = rules[model]?.[method] || false;
    const ruleWhereOrBool = typeof queryValidator === 'function' ? queryValidator(uid, args?.data) : queryValidator;
    if (ruleWhereOrBool === false) throw new Error('Unauthorized');
    if (typeof ruleWhereOrBool === 'object' && !acceptsWheres) {
      console.log(
        \`Rule error on nested model: "\${model}".  Cannot apply prisma where clauses to N-1 or 1-1 relationships, only 1-N.\nMore info: https://github.com/prisma/prisma/issues/16049\n
To fix this until issue is resolved: Change "\${model}" read rules to not rely on where clauses, OR for N-1 relationships, invert the include so the "\${model}" model is including the many table. (N-1 => 1-N)\`,
      );
      throw new Error('Unauthorized');
    }
    else if (method !== 'post') {
      if (ruleWhereOrBool === true && !acceptsWheres) {
        delete args.where;
      } else {
        const rulesWhere = ruleWhereOrBool === true ? {} : ruleWhereOrBool;
        args.where = { AND: [rulesWhere, args?.where || {}] };
      }
    }
    if (args.include) {
      args.include &&
        Object.keys(args.include).forEach((relationName: string) => {
          const m = MODEL_RELATION_MAP[model][relationName];
          const relationInclude = args.include[relationName];
          if (relationInclude === false) return true;
          else if (relationInclude === true) {
            args.include[relationName] = { where: {} };
            return applyRulesWheres(args.include[relationName], m.model, m.acceptsWheres);
          }
          return applyRulesWheres(relationInclude, m.model, m.acceptsWheres);
        });
    }
  };

  try {
    applyRulesWheres(args, model);
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
