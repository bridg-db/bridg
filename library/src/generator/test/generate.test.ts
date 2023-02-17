import { expect, it } from 'vitest';
import { parseModelNamesFromSchema } from '../generate';
import { readFileAsString } from '../../utils/file.util';
import { generateSchemaRelations } from '../server/serverTypes.generate';
import strip from 'strip-comments';

const schema1 = readFileAsString('library/generator/test/examples/schema1.prisma');
const schema2 = readFileAsString('library/generator/test/examples/schema2.prisma');
const schema3 = readFileAsString('library/generator/test/examples/schema3.prisma');

it('parses model names', () => {
  expect(parseModelNamesFromSchema(schema1)).toStrictEqual(['User', 'Blog']);
  expect(parseModelNamesFromSchema(schema2)).toStrictEqual(['User', 'Blog', 'Post']);
  expect(parseModelNamesFromSchema(schema3)).toStrictEqual(['User', 'Blog', 'Post', 'Comment', 'Error']);
});

it('strips comments', () => {
  const base = `// hello\nworld\n//hi`;
  expect(strip(base)).toBe(`\nworld\n`);
});

it('generates model relations', () => {
  const models1 = parseModelNamesFromSchema(schema1);
  const models2 = parseModelNamesFromSchema(schema2);
  const models3 = parseModelNamesFromSchema(schema3);
  const rel1 = generateSchemaRelations(models1, schema1);
  const rel2 = generateSchemaRelations(models2, schema2);
  const rel3 = generateSchemaRelations(models3, schema3);

  expect(rel1).toStrictEqual({
    user: { blogs: { acceptsWheres: true, model: 'blog' } },
    blog: { user: { acceptsWheres: false, model: 'user' } },
  });
  expect(rel2).toStrictEqual({
    user: { blogs: { acceptsWheres: true, model: 'blog' } },
    blog: { user: { acceptsWheres: false, model: 'user' } },
    post: {},
  });
  expect(rel3).toStrictEqual({
    user: { blogs: { acceptsWheres: true, model: 'blog' } },
    blog: { user: { acceptsWheres: false, model: 'user' } },
    post: { comments: { acceptsWheres: true, model: 'comment' } },
    comment: { post: { acceptsWheres: false, model: 'post' } },
    error: {},
  });
});
// TODO: rules system integration tests
