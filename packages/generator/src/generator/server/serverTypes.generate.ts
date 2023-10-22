import strip from 'strip-comments';
import { uncapitalize } from '../../utils/string.util';
import { MODEL_REGEX } from '../ts-generation';

type RelationsForModel = Record<
  string,
  { acceptsWheres: boolean; model: string }
>;

// TODO: migrate to DMMF, instead of parsing schema ourself
export const generateSchemaRelations = (
  models: string[],
  schemaStr: string
) => {
  const commentsStripped = strip(schemaStr);
  const modelChunks = commentsStripped.match(/model\s?\w+\s?{.+?}/gs);
  const schemaRelations: Record<string, RelationsForModel> = {};

  modelChunks?.forEach((modelChunk) => {
    const modelLines = modelChunk.split('\n');
    const modelNameCap = modelLines[0].match(MODEL_REGEX)?.at(0);
    if (!modelNameCap)
      throw new Error(`Error parsing schema at line: ${modelLines[0]}`);
    const model = uncapitalize(modelNameCap);
    const modelFieldLines = modelLines
      .slice(1, modelLines.length - 1)
      .map((l) => l.trim())
      .filter((l) => !!l);

    const relations = modelFieldLines.reduce((acc, line) => {
      let acceptsWheres = false;
      let [field, fieldType] = line.split(/\s+/);
      if (fieldType.endsWith('[]')) {
        fieldType = fieldType.slice(0, fieldType.length - 2);
        acceptsWheres = true;
      } else if (fieldType.endsWith('?')) {
        fieldType = fieldType.slice(0, fieldType.length - 1);
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
  const modelRelations = generateSchemaRelations(models, schemaStr);

  return `
  const MODEL_RELATION_MAP: { [key in ModelName]: { [key: string]: { model: ModelName; acceptsWheres: boolean } } } = ${JSON.stringify(
    modelRelations,
    undefined,
    2
  )}

  declare type OptionalPromise<T> = T | Promise<T>;
  declare type RuleCallback<
    ReturnType,
    CreateInput = undefined
  > = CreateInput extends undefined
    ? (uid?: string) => OptionalPromise<ReturnType>
    : (uid?: string, body?: CreateInput) => OptionalPromise<ReturnType>;
  declare type RuleOrCallback<RuleOptions, CreateInput> =
    | RuleOptions
    | RuleCallback<RuleOptions, CreateInput>;
  declare type BridgRule<RuleOptions, CreateInput = undefined> =
    | RuleOrCallback<RuleOptions, CreateInput>
    | { rule: RuleOrCallback<RuleOptions, CreateInput> };
  declare type ModelRules<WhereInput, CreateInput> = Partial<{
    find: BridgRule<boolean | WhereInput>;
    update: BridgRule<boolean | WhereInput, CreateInput>;
    create: BridgRule<boolean, CreateInput>;
    delete: BridgRule<boolean | WhereInput>;
    default: BridgRule<boolean, CreateInput>;
  }>;

  export type DbRules = Partial<{${models.reduce(
    (acc, Model) =>
      `${acc}\n  ${uncapitalize(
        Model
      )}: ModelRules<Prisma.${Model}WhereInput, Prisma.${Model}UncheckedCreateInput>;`,
    `\n  default: boolean;`
  )}
  }>;
  
  const models = [${models.reduce(
    (acc, m) => `${acc}${acc ? ', ' : ''}'${uncapitalize(m)}'`,
    ``
  )}] as const;
  type ModelName = typeof models[number];
  `;
};
