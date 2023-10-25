import path from 'path';
import strip from 'strip-comments';
import { writeFileSafely } from '../../utils/file.util';
import { uncapitalize } from '../../utils/string.util';
import { MODEL_REGEX } from '../ts-generation';

type RelationsForModel = Record<string, { acceptsWheres: boolean; model: string }>;

// TODO: migrate to DMMF, instead of parsing schema ourself
export const generateSchemaRelations = (models: string[], schemaStr: string) => {
  const commentsStripped = strip(schemaStr);
  const modelChunks = commentsStripped.match(/model\s?\w+\s?{.+?}/gs);
  const schemaRelations: Record<string, RelationsForModel> = {};

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

export const generateModelRelations = (models: string[], schemaStr: string) => {
  models = models || [];
  const modelRelations = generateSchemaRelations(models, schemaStr);

  return `
    import { ModelName } from '.';

    export const MODEL_RELATION_MAP: { [key in ModelName]: { [key: string]: { model: ModelName; acceptsWheres: boolean } } } = ${JSON.stringify(
      modelRelations,
      undefined,
      2
    )}
    `;
};

export const generateModelRelationsFile = ({
  modelNames,
  schemaStr,
  outputLocation,
}: {
  modelNames: string[];
  schemaStr: string;
  outputLocation: string;
}) => {
  const filePath = path.join(outputLocation, 'server', 'model-relations.ts');
  const fileContents = generateModelRelations(modelNames, schemaStr);
  writeFileSafely(filePath, fileContents);

  return fileContents;
};
