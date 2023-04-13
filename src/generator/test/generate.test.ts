import { expect, it } from 'vitest';
import { parseModelNamesFromSchema } from '../generate';
import { readFileAsString } from '../../utils/file.util';
import { generateSchemaRelations } from '../server/serverTypes.generate';
import strip from 'strip-comments';

const schema1 = readFileAsString('src/generator/test/examples/schema1.prisma');
const schema2 = readFileAsString('src/generator/test/examples/schema2.prisma');
const schema3 = readFileAsString('src/generator/test/examples/schema3.prisma');
const schema4 = readFileAsString('src/generator/test/examples/schema4.prisma');

it('parses model names', () => {
  expect(parseModelNamesFromSchema(schema1)).toStrictEqual(['User', 'Blog']);
  expect(parseModelNamesFromSchema(schema2)).toStrictEqual(['User', 'Blog', 'Post']);
  expect(parseModelNamesFromSchema(schema3)).toStrictEqual(['User', 'Blog', 'Post', 'Comment', 'Error']);
});

it('strips comments', () => {
  const base = `// hello\nworld\n//hi`;
  expect(strip(base)).toBe(`\nworld\n`);
});

it('generates model relations', async () => {
  const models1 = parseModelNamesFromSchema(schema1);
  const models2 = parseModelNamesFromSchema(schema2);
  const models3 = parseModelNamesFromSchema(schema3);
  const models4 = parseModelNamesFromSchema(schema4);
  const rel1 = generateSchemaRelations(models1, schema1);
  const rel2 = generateSchemaRelations(models2, schema2);
  const rel3 = generateSchemaRelations(models3, schema3);
  const rel4 = generateSchemaRelations(models4, schema4);

  expect(rel4).toStrictEqual({
    user: {
      optionalOneToOne: { acceptsWheres: true, model: 'optionalOneToOne' },
      requiredOneToOne: { acceptsWheres: false, model: 'requiredOneToOne' },
      optionalOneToMany: { acceptsWheres: true, model: 'oneToManyOptional' },
      requiredOnetoMany: { acceptsWheres: true, model: 'oneToManyRequired' },
    },
    oneToManyOptional: { user: { acceptsWheres: true, model: 'user' } },
    oneToManyRequired: { user: { acceptsWheres: false, model: 'user' } },
    // 1-1s can only be required from 1 side, the other side can accept wheres
    requiredOneToOne: { user: { acceptsWheres: true, model: 'user' } },
    optionalOneToOne: { user: { acceptsWheres: true, model: 'user' } },
  });

  expect(rel1).toStrictEqual({
    user: { blogs: { acceptsWheres: true, model: 'blog' } },
    blog: { user: { acceptsWheres: true, model: 'user' } },
  });
  expect(rel2).toStrictEqual({
    user: { blogs: { acceptsWheres: true, model: 'blog' } },
    blog: { user: { acceptsWheres: true, model: 'user' } },
    post: {},
  });
  expect(rel3).toStrictEqual({
    user: { blogs: { acceptsWheres: true, model: 'blog' } },
    blog: { user: { acceptsWheres: true, model: 'user' } },
    post: { comments: { acceptsWheres: true, model: 'comment' } },
    comment: { post: { acceptsWheres: true, model: 'post' } },
    error: {},
  });
});
// TODO: rules system integration tests
