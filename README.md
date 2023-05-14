# Bridg - Query your DB directly from the frontend

[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg)](https://discord.gg/zHCvaJS4P4)

Bridg let's you query your database from the client, like Firebase or Supabase, but with the power and type-safety of Prisma.

```tsx
<input
  placeholder="Search for blogs.."
  onChange={async (e) => {
    const query = e.target.value;
    const blogs = await db.blog.findMany({ where: { title: { contains: query } } });
    setSearchResults(blogs);
  }}
/>
```

[Getting Started](#getting-started)  
[Querying Your Database](#querying-your-database)  
[Protecting Your Data](#database-rules)

### Supported Databases

MongoDB, Postgres, MySQL (& Planetscale), SQLite, Microsoft SQL Server, Azure SQL, MariaDB, AWS Aurora, CockroachDB

## Getting started

### Example Projects

[Next.js (basic)](https://github.com/JoeRoddy/bridg-example-nextjs) Simple Next.js example with SQLite database ([Codesandbox](https://codesandbox.io/p/sandbox/inspiring-lake-e7w5cg?file=%2Fsrc%2Fpages%2Findex.tsx))

[Next.js (blogging app)](https://github.com/JoeRoddy/bridg-example-nextjs-auth-blogs) - Next.js, next-auth authentication, CRUD examples, SQLite

[create-react-app (serverless)](https://github.com/JoeRoddy/bridg-example-cra) - CRA + Postgres + Netlify function (for Bridg)

[React Native](https://github.com/JoeRoddy/bridg-example-expo) - Expo App + Postgres + Netlify

[Vue.js](https://github.com/JoeRoddy/bridg-example-nuxt) - Simple Vue / Nuxt example with SQLite database ([Codesandbox](https://codesandbox.io/p/sandbox/bridg-example-nuxt-dcwcs3?file=%2Fcomponents%2FTutorial.vue&selection=%5B%7B%22endColumn%22%3A14%2C%22endLineNumber%22%3A12%2C%22startColumn%22%3A14%2C%22startLineNumber%22%3A12%7D%5D))

_Want an example project for your favorite framework? Feel free to [create an issue](https://github.com/JoeRoddy/bridg/issues/new), or a PR with a sample._

### Add Bridg to an existing project

1. [Configure your project to use Prisma ](https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project/relational-databases-typescript-postgres)
   - Add the `extendedWhereUnique` preview feature to your `schema.prisma`

```ts
generator client {
  provider        = "your-client"
  previewFeatures = ["extendedWhereUnique"]
}
```

2. Install Bridg: `npm install bridg`
3. Add the following script to your `package.json` :

```json
{
  "scripts": {
    "generate": "npx prisma generate && npm explore bridg -- npm run generate"
  }
}
```

4. Generate the client: `npm run generate`
   - This will need to be ran any time you change your DB schema
5. Expose an API endpoint at `/api/bridg` to handle requests:

```ts
// Example Next.js API handler, translate to your JS API framework of choice
import { handleRequest } from 'bridg/server/request-handler';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// allows all requests, don't ship like this, ya dingus
const rules = { default: true };

export default async function handler(req, res) {
  // Mock authentication, replace with any auth system you want
  const userId = 'authenticated-user-id';

  // pass the request (req.body), your prisma client (db),
  // the user making the request (uid), and your database rules (rules)
  const { data, status } = await handleRequest(req.body, { db, uid: userId, rules });

  return res.status(status).json(data);
}
```

### Note on applications with separate server / client:

This library has yet to be tested with apps running a server & client as separate projects, but it should 🤷‍♂️ work. You would want to install Bridg and Prisma on your server, run the `generate` script, and copy the Bridg client (`node_modules/bridg/index.js & index.d.ts`) and Prisma types to your client application.

## Querying Your Database

Bridg is built on top of Prisma, you can check out the basics of executing CRUD queries [here](https://www.prisma.io/docs/concepts/components/prisma-client/crud).

The [Prisma documentation](https://www.prisma.io/docs/getting-started) is excellent and is highly recommended if you haven't used Prisma in the past.

For security reasons, some functionality ([like upserts](https://github.com/JoeRoddy/bridg/issues/1)) aren't available, but I'm working towards full compatibility with Prisma.

Executing queries works like so:

```ts
import db from 'bridg';

const data = await db.tableName.crudMethod(args);
```

The following are simplified examples. If you're thinking _"I wonder if I could do X with this.."_, the answer is probably yes. You will just need to search for "pagination with Prisma", or for whatever you're trying to achieve.

### Creating Data:

```ts
// create a single db record
const createdUser = await db.user.create({
  data: {
    name: 'John',
    email: 'johndoe@gmail.com',
  },
});

// create multiple records at once:
const creationCount = await db.user.createMany({
  data: [
    { name: 'John', email: 'johndoe@gmail.com' },
    { name: 'Sam', email: 'sam.johnson@outlook.com' },
    // ..., ...,
  ],
});

// create a user, and create a relational blog for them
const createdUser = await db.user.create({
  data: {
    name: 'John',
    email: 'johndoe@gmail.com',
    blogs: {
      create: {
        title: 'My first blog',
        body: 'And that was my first blog, it was a short one..',
      },
    },
  },
});
```

### Reading Data:

```ts
// all records within a table:
const users = await db.user.findMany();

// all records that satisfy a where clause:
const users = await db.user.findMany({ where: { profileIsPublic: true } });

// get the first record that satisfies a where clause:
const user = await db.user.findFirst({ where: { email: 'johndoe@gmail.com' } });

// enforce that only one record could ever exist (must pass a unique column id):
const user = await db.user.findUnique({ where: { id: 'some-id' } });

// do the same thing, but throw an error if the data is missing
const user = await db.user.findUniqueOrThrow({ where: { id: 'some-id' } });
```

### Including Relational Data:

```ts
// all users and a list of all their blogs:
const users = await db.user.findMany({ include: { blogs: true } });

// where clauses can be applied to relational data:
const users = await db.user.findMany({
  include: {
    blogs: { where: { published: true } },
  },
});

// nest all blogs, and all comments on blogs. its just relations all the way down.
const users = await db.user.findMany({
  include: {
    blogs: {
      include: { comments: true },
    },
  },
});
```

For more details on advanced querying, filtering and sorting, [check out this page from the Prisma docs.](https://www.prisma.io/docs/concepts/components/prisma-client/crud#get-the-first-record-that-matches-a-specific-criteria)

### Updating data:

```ts
// update a single record
const updatedData = await db.blog.update({
  where: { id: 'some-id' }, // must use a unique db key to use .update
  data: { title: 'New Blog title' },
});

// update many records
const updateCount = await db.blog.updateMany({
  where: { authorId: userId },
  data: { isPublished: true },
});
```

### Deleting data:

```ts
// delete a single record.  must use a unique db key to use .delete
const deletedBlog = await db.blog.delete({ where: { id: 'some-id' } });

// delete many records
const deleteCount = await db.blog.deleteMany({ where: { isPublished: false } });
```

## Database Rules

> If you want to ignore this during development, you can set your database rules to the following to allow all requests (this is not secure):
>
> ```ts
> export const rules: DbRules = { default: true };
> ```

Because your database is now available on the frontend, that means anyone who can access your website will have access to your database. Fortunately, we can create custom rules to prevent our queries from being used nefariously 🥷.

Your rules could look something like the following:

```ts
export const rules: DbRules = {
  user: {
    find: { profileIsPublic: true }, // only allow reads on public profiles
    update: (uid, data) => ({ id: uid }), // update only if its being done by the user
    create: (uid, data) => {
      // prevent the user from starting themself at level 99
      if (data.level !== 1) return false;
      return true; // otherwise allow creation
    },
    delete: false, // never authorize any calls to delete users
  },
  // table2: {},
  // table3: {},...
  blog: {
    // model default, used if model.method not provided
    default: true,
  }
  // global default, used if model.method and model.default aren't provided
  // defaults to 'false' if not provided. set to 'true' only in development
  default: false,
};
```

As you can see, your rules will basically look like:

```ts
{
    tableName: {
        find: validator,
        delete: validator,
    }
}
```

**NOTE: If you don't provide a rule for a property, it will default to preventing those requests.**

In the above example, all `update` and `create` requests will fail. Since they weren't provided, they default to `false`.

The properties available to create rules for are:

- `find`: authorizes reading data (.findMany, .findFirst, .findFirstOrThrow, .findUnique, .findUniqueOrThrow, .aggregate, .count, .groupBy)
- `update`: authorizes updates (.update, .updateMany)
- `create`: authorizes creating data (.create, .createMany)
- `delete`: authorizes deleting data (.delete, .deleteMany)

### What is a validator?

Validators control whether a particular request will be allowed to execute or not.

They can be provided in three ways:

1. **boolean** - use a boolean when you always know whether a certain request should go through or be blocked

   ```ts
   tableName {
       find: false, // blocks all reads on a model
       create: true // allows any creation for a model
   }
   ```

2) **where clause** - You can also apply a Prisma where clause for the given model. This clause will be required to be true, along with whatever input is passed from the client request.

   note: `create` does not accept where clauses

   ```ts
   blog {
       // allow reads only on blogs where isPublished = true
       find: { isPublished: true }
   }
   ```

3) **callback function** - The most powerful option is a callback function. This will allow you to dynamically authorize requests based on the context of the request. You can also pass an `async` function, and make as many async calls as you want in the validator.

   **args:**

   `uid`: the id of the user making the request

   `data`: the body data from the request (only available on update, create)

   **return value:** `boolean` | `where clause`

   Your callback function should either return a Prisma Where object for the corresponding table, or a boolean indicating whether the request should resolve or not.

Example use of callbacks:

```ts
const rules = {
  blog: {
    // where clause: allow reads if the blog is published OR if the user authored the blog
    find: (uid) => ({ OR: [{ isPublished: true }, { authorId: uid }] }),

    // prevent the user from setting their own vote count
    create: (uid, data) => (data.voteCount === 0 ? true : false),

    // make an async call to determine if request should resolve
    // note: this should USUALLY be done via a relational query,
    // which only takes 1 trip to the db, but they are not always practical
    delete: async (uid) => {
      const userMakingRequest = await db.user.findFirst({ where: { id: uid } });
      return userMakingRequest.isAdmin ? true : false;
    },

    // you can run literally any javascript you want, anything..
    update: async (uid) => {
      const isTheSunShining = await someWeatherApi.sunIsOut();
      const philliesWinWorldSeries = Math.random() < 0.000001;
      return isTheSunShining && philliesWinWorldSeries;
    },
  },
};
```

### Rules stress testing

There may be undiscovered edgecases where an attacker could circumvent our database rules and access data that they shouldn't be allowed to. Here's a [previous example](https://github.com/JoeRoddy/bridg/issues/2) for reference.

If you stumble upon something like this, please 🙏 [create an issue](https://github.com/JoeRoddy/bridg/issues/new) with a detailed example, so it can be fixed.
