import { MODEL_REGEX } from '../generate';
import { capitalize, uncapitalize } from '../../utils/string.util';
import strip from 'strip-comments';

type RelationsForModel = Record<string, { acceptsWheres: boolean; model: string }>;
type SchemaRelations = Record<string, RelationsForModel>;

export const generateSchemaRelations = (models: string[], schemaStr: string) => {
  const commentsStripped = strip(schemaStr);
  const modelChunks = commentsStripped.match(/model\s?\w+\s?{.+?}/gs);
  const schemaRelations: SchemaRelations = {};

  modelChunks?.forEach((modelChunk) => {
    const modelLines = modelChunk.split('\n');
    const modelNameCap = modelLines[0].match(MODEL_REGEX)?.at(0);
    if (!modelNameCap) throw new Error(`Error parsing schema at line: ${modelLines[0]}`);
    const model = uncapitalize(modelNameCap);
    const modelFieldLines = modelLines
      .slice(1, modelLines.length - 1)
      .map((l) => l.trim())
      .filter((l) => !!l);

    const relations = modelFieldLines.reduce((acc, line) => {
      let acceptsWheres = false;
      let [field, fieldType] = line.split(/\s+/);
      fieldType =
        fieldType.charAt(fieldType.length - 1) === '?' ? fieldType.substring(0, fieldType.length - 1) : fieldType;

      if (fieldType.endsWith('[]')) {
        fieldType = fieldType.slice(0, fieldType.length - 2);
        acceptsWheres = true;
      }

      if (!models.includes(fieldType)) return acc;

      acc[field] = { acceptsWheres, model: uncapitalize(fieldType) };
      return acc;
    }, {} as RelationsForModel);
    schemaRelations[model] = relations;
  });

  return schemaRelations;
};

export const generateServerTypes = (models: string[], schemaStr: string) => {
  models = models || [];
  const innerRules = models.reduce((acc, m) => {
    const Model = capitalize(m);
    return `${acc}\n  ${uncapitalize(
      m,
    )}: MethodRulesObject<Prisma.${Model}WhereInput, Prisma.${Model}UncheckedCreateInput>;`;
  }, ``);
  const modelRelations = generateSchemaRelations(models, schemaStr);

  return `
  const MODEL_RELATION_MAP: { [key in Model]: { [key: string]: { model: Model; acceptsWheres: boolean } } } = ${JSON.stringify(
    modelRelations,
    undefined,
    2,
  )}

  type OptionalPromise<T> = T | Promise<T>;
  type MethodRulesObject<WhereInput, CreateInput> = Partial<{
    find: boolean | WhereInput | ((uid?: string) => OptionalPromise<boolean | WhereInput>);
    update: boolean | WhereInput | ((uid?: string, body?: CreateInput) => OptionalPromise<boolean | WhereInput>);
    create: boolean | ((uid?: string, body?: CreateInput) => OptionalPromise<boolean>);
    delete: boolean | WhereInput | ((uid?: string) => OptionalPromise<boolean | WhereInput>);
  }>;
  
  export type DbRules = Partial<{${innerRules}
  }>;
  
  const models = [${models.reduce((acc, m) => `${acc}${acc ? ', ' : ''}'${uncapitalize(m)}'`, ``)}] as const;
  type Model = typeof models[number];
  `;
};
