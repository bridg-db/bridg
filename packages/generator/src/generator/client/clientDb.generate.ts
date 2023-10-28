import path from 'path';
import { getRelativeImportPath, writeFileSafely } from '../../utils/file.util';
import { capitalize, uncapitalize } from '../../utils/string.util';

const generateExports = (models: string[]) => {
  const exports = models.reduce(
    (acc, model) => `${acc}\n  ${uncapitalize(model)}:${uncapitalize(model)}Client,`,
    ``
  );

  return `\nconst bridg = {${exports}\n};\nexport default bridg;`;
};

const getHead = (apiLocation = '/api/bridg') => `
   
export const exec = ({ model, args, func = 'findMany' }: { model: string; args?: {}; func: string }) =>
  fetch('${apiLocation}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, args, func }),
  }).then(async (res) => {
   const json = await res.json();
   if (res.status !== 200) throw new Error(json?.error || '');

   return json;
  });

const generateClient = (
  model: string
): Record<string, (args: any) => void> => ({
   aggregate: (args)  => exec({ func: 'aggregate', model, args }),
   count: (args)  => exec({ func: 'count', model, args }),
   create: (args)  => exec({ func: 'create', model, args }),
   delete: (args)  => exec({ func: 'delete', model, args }),
   deleteMany: (args)  => exec({ func: 'deleteMany', model, args }),
   findFirst: (args)  => exec({ func: 'findFirst', model, args }),
   findFirstOrThrow: (args)  => exec({ func: 'findFirstOrThrow', model, args }),
   findMany: (args)  => exec({ func: 'findMany', model, args }),
   findUnique: (args)  => exec({ func: 'findUnique', model, args }),
   findUniqueOrThrow: (args)  => exec({ func: 'findUniqueOrThrow', model, args }),
   groupBy: (args)  => exec({ func: 'groupBy', model, args }),
   update: (args)  => exec({ func: 'update', model, args }),
   updateMany: (args)  => exec({ func: 'updateMany', model, args }),
   upsert: (args)  => exec({ func: 'upsert', model, args }),
});

type BridgModel<PrismaDelegate> = Omit<PrismaDelegate, 'createMany'|'fields'>
`;

const MODEL_TEMPLATE = `const *{model}Client = generateClient('*{model}') as BridgModel<Prisma.*{Model}Delegate>;\n`;

const genModelClient = (model: string) =>
  MODEL_TEMPLATE.replaceAll(`*{model}`, uncapitalize(model)).replaceAll(
    `*{Model}`,
    capitalize(model)
  );

export const generateClientDbFile = ({
  modelNames,
  outputLocation,
  apiLocation,
  prismaLocation,
}: {
  modelNames: string[];
  outputLocation: string;
  apiLocation: string;
  prismaLocation?: string;
}) => {
  const filePath = path.join(outputLocation, 'index.ts');

  const prismaImportPath = prismaLocation
    ? getRelativeImportPath(filePath, prismaLocation)
    : `@prisma/client`;

  const importStatement = `import { Prisma } from '${prismaImportPath}';`;
  const modelClients = modelNames.reduce((acc, model) => `${acc}${genModelClient(model)}`, ``);
  const clientDbCode = `${importStatement}${getHead(apiLocation)}${modelClients}${generateExports(
    modelNames
  )}`;

  //   writeFileSafely(`${'./node_modules/bridg/dist/package'}/client/db.ts`, clientDbCode);
  writeFileSafely(`${outputLocation}/index.ts`, clientDbCode);
  return clientDbCode;
};
