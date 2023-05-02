import { writeFileSafely } from '../../utils/file.util';
import { capitalize, uncapitalize } from '../../utils/string.util';

const generateExports = (models: string[]) => {
  const exports = models.reduce((acc, model) => `${acc}\n  ${uncapitalize(model)}:${uncapitalize(model)}Client,`, ``);

  return `\nexport default {${exports}\n};`;
};

const getHead = (apiLocation = '/api/bridg') => `
  import { Prisma } from '@prisma/client';
  
  declare const prisma: unique symbol;
  type PrismaPromise<A> = Promise<A> & { [prisma]: true };
  
  export const exec = ({ model, args, func = 'findMany' }: { model: string; args?: {}; func: string }) =>
  fetch('${apiLocation}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, args, func }),
  }).then(async (res) => {
    const json = await res.json();
    if (res.status !== 200) throw new Error(\`Bridg query on model "\${model}"\${json.error && \`: \${json.error}\`}\`);

    return json;
  });
  `;

const MODEL_TEMPLATE = `
const *{model}Client = {
    aggregate: <T extends Prisma.*{Model}AggregateArgs>(
        args: Prisma.Subset<T, Prisma.*{Model}AggregateArgs>,
        // @ts-ignore
    ): PrismaPromise<Prisma.Get*{Model}AggregateType<T>> => exec({ func: 'aggregate', model: '*{model}', args }),
    create: <T extends Prisma.*{Model}CreateArgs>(
      args: Prisma.SelectSubset<T, Prisma.*{Model}CreateArgs>,
    ): Promise<Prisma.Prisma__*{Model}Client<Prisma.*{Model}GetPayload<T>>> => exec({ func: 'create', model: '*{model}', args }),
    count: <T extends Prisma.*{Model}CountArgs>(
        args?: Prisma.Subset<T, Prisma.*{Model}CountArgs>,
    ): PrismaPromise<
        T extends Prisma._Record<'select', any>
        ? T['select'] extends true
            ? number
            : Prisma.GetScalarType<T['select'], Prisma.*{Model}CountAggregateOutputType>
        : number
        // @ts-ignore
    > => exec({ func: 'count', model: '*{model}', args }),
    delete: <T extends Prisma.*{Model}DeleteArgs>(
        args: Prisma.SelectSubset<T, Prisma.*{Model}DeleteArgs>,
        // @ts-ignore
    ): Prisma.Prisma__*{Model}Client<Prisma.*{Model}GetPayload<T>> => exec({ func: 'delete', model: '*{model}', args }),
    deleteMany: <T extends Prisma.*{Model}DeleteManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.*{Model}DeleteManyArgs>,
        // @ts-ignore
    ): PrismaPromise<Prisma.BatchPayload> => exec({ func: 'deleteMany', model: '*{model}', args }),
    findFirst: <T extends Prisma.*{Model}FindFirstArgs>(
        args?: Prisma.SelectSubset<T, Prisma.*{Model}FindFirstArgs>,
    ): Prisma.Prisma__*{Model}Client<Prisma.*{Model}GetPayload<T> | null, null> =>
        // @ts-ignore
        exec({ func: 'findFirst', model: '*{model}', args }),
    findFirstOrThrow: <T extends Prisma.*{Model}FindFirstOrThrowArgs>(
        args?: Prisma.SelectSubset<T, Prisma.*{Model}FindFirstOrThrowArgs>,
        // @ts-ignore
    ): PrismaPromise<Array<Prisma.*{Model}GetPayload<T>>> => exec({ func: 'findFirstOrThrow', model: '*{model}', args }),
    findMany: <T extends Prisma.*{Model}FindManyArgs>(
        args?: Prisma.SelectSubset<T, Prisma.*{Model}FindManyArgs>,
        // @ts-ignore
    ): PrismaPromise<Array<Prisma.*{Model}GetPayload<T>>> => exec({ func: 'findMany', model: '*{model}', args }),
    findUnique: <T extends Prisma.*{Model}FindUniqueArgs>(
        args: Prisma.SelectSubset<T, Prisma.*{Model}FindUniqueArgs>,
    ): Prisma.Prisma__*{Model}Client<Prisma.*{Model}GetPayload<T> | null, null> =>
        // @ts-ignore
        exec({ func: 'findUnique', model: '*{model}', args }),
    findUniqueOrThrow: <T extends Prisma.*{Model}FindUniqueOrThrowArgs>(
        args?: Prisma.SelectSubset<T, Prisma.*{Model}FindUniqueOrThrowArgs>,
    ): Prisma.Prisma__*{Model}Client<Prisma.*{Model}GetPayload<T>> =>
        // @ts-ignore
        exec({ func: 'findUniqueOrThrow', model: '*{model}', args }),
    groupBy: (args?: Prisma.*{Model}GroupByArgs) => exec({ func: 'groupBy', model: '*{model}', args }),
    update: <T extends Prisma.*{Model}UpdateArgs>(
        args: Prisma.SelectSubset<T, Prisma.*{Model}UpdateArgs>,
    ): Prisma.Prisma__*{Model}Client<Prisma.*{Model}GetPayload<T>> =>
        // @ts-ignore
        exec({ func: 'update', model: '*{model}', args }),
    updateMany: <T extends Prisma.*{Model}UpdateManyArgs>(
        args: Prisma.SelectSubset<T, Prisma.*{Model}UpdateManyArgs>,
    ): PrismaPromise<Prisma.BatchPayload> =>
        // @ts-ignore
        exec({ func: 'updateMany', model: '*{model}', args }),
    // upsert: <T extends Prisma.*{Model}UpsertArgs>(
    //     args: Prisma.SelectSubset<T, Prisma.*{Model}UpsertArgs>,
    // ): Prisma.Prisma__*{Model}Client<Prisma.*{Model}GetPayload<T>> =>
    //     // @ts-ignore
    //     exec({ func: 'upsert', model: '*{model}', args }),
  };  
  `;

const genModelClient = (model: string) =>
  MODEL_TEMPLATE.replaceAll(`*{model}`, uncapitalize(model)).replaceAll(`*{Model}`, capitalize(model));

export const generateClientDbFile = (models: string[], outputLocation: string, apiLocation: string) => {
  const modelClients = models.reduce((acc, model) => `${acc}${genModelClient(model)}`, ``);
  const clientDbCode = `${getHead(apiLocation)}${modelClients}${generateExports(models)}`;

  //   writeFileSafely(`${'./node_modules/bridg/dist/package'}/client/db.ts`, clientDbCode);
  writeFileSafely(`${outputLocation}/client/db.ts`, clientDbCode);
  return clientDbCode;
};
