# Bridg - Query your DB directly from the frontend

[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg)](https://discord.gg/zHCvaJS4P4)

Bridg let's you <u>securely</u> query your database from the client, like Firebase or Supabase, but with the power and type-safety of Prisma.

```tsx
<input
  placeholder="Search for blogs.."
  onChange={async (e) => {
    const query = e.target.value;
    const blogs = await bridg.blog.findMany({
      where: { title: { contains: query } },
    });
    setSearchResults(blogs);
  }}
/>
```

### Demo Video

[![Watch the video](https://img.youtube.com/vi/lxe9PvnWAeY/default.jpg)](https://youtu.be/lxe9PvnWAeY)

### Links

[Getting Started](#getting-started)  
[Querying Your Database](#querying-your-database)  
[Realtime Data](#realtime-data)  
[Protecting Your Data](#database-rules)

### Supported Databases

MongoDB, Postgres, MySQL (& Planetscale), SQLite, Microsoft SQL Server, Azure SQL, MariaDB, AWS Aurora, CockroachDB

## Getting started

### Example Projects

- [Next.js (basic)](https://github.com/JoeRoddy/bridg-example-nextjs) Simple Next.js example with SQLite database ([Codesandbox](https://codesandbox.io/p/sandbox/inspiring-lake-e7w5cg?file=%2Fsrc%2Fpages%2Findex.tsx))
- [Next.js (blogging app)](https://github.com/JoeRoddy/bridg-example-nextjs-auth-blogs) - Next.js, next-auth authentication, CRUD examples, SQLite
- [create-react-app (serverless)](https://github.com/JoeRoddy/bridg-example-cra) - CRA + Postgres + Netlify function (for Bridg)
- [React Native](https://github.com/JoeRoddy/bridg-expo-2) - Expo App + Postgres + Netlify
- [Vue.js](https://github.com/JoeRoddy/bridg-example-nuxt) - Simple Vue / Nuxt example with SQLite database

_Want an example project for your favorite framework? Feel free to [create an issue](https://github.com/JoeRoddy/bridg/issues/new), or a PR with a sample._

### Add Bridg to an existing project

1. [Configure your project to use Prisma ](https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project/relational-databases-typescript-postgres) (Bridg currently requires prisma `5.0.0` or later.)
   ```shell
   npm i -D prisma
   npm i @prisma/client
   npx prisma init --datasource-provider sqlite
   # opts: postgresql, mysql, sqlite, sqlserver, mongodb, cockroachdb
   ```
2. Install Bridg: `npm install bridg`
3. Add the Bridg generator to your `schema.prisma` :

   ```ts
   generator client {
     provider = "prisma-client-js"
   }

   // Add this UNDER your prisma client
   generator bridg {
     provider = "bridg"
   }
   ```

4. Generate your clients: `npx prisma generate`
5. Expose an API endpoint at `/api/bridg` or configure a [custom endpoint](#Generator-Options) to handle requests:

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
     const { data, status } = await handleRequest(req.body, {
       db,
       uid: userId,
       rules,
     });

     return res.status(status).json(data);
   }
   ```

You should be good to go! Try using the Bridg client on your frontend:

```tsx
// some frontend file
import bridg from 'bridg';

const CreateBlogButton = ({ blog }) => (
  <button onClick={() => bridg.blog.create({ data: blog })}>Create Blog</button>
);
```

### Generator Options

```ts
generator bridg {
  provider = "bridg"
  // customize Bridg client output location
  output   = "/custom/client/path" // (defaults to node_modules/bridg)
  // customize api endpoint Bridg will send queries to
  api      = "https://example.com/api/bridg" // (defaults to /api/bridg)
}
```

### Note on applications with separate server / client:

This library has yet to be tested with apps running a server & client as separate projects, but it should 🤷‍♂️ work. You would want to install Bridg and Prisma on your server, run the `generate` script, and copy the Bridg client (`node_modules/bridg/index.js & index.d.ts`) and Prisma types to your client application.

## Querying Your Database

Bridg is built on top of Prisma, you can check out the basics of executing CRUD queries [here](https://www.prisma.io/docs/concepts/components/prisma-client/crud).

The [Prisma documentation](https://www.prisma.io/docs/getting-started) is excellent and is highly recommended if you haven't used Prisma in the past.

For security reasons, some functionality isn't available, but I'm working towards full compatibility with Prisma. Currently `upsert`, `connectOrCreate`, `set`, and `disconnect` are unavailable inside of nested queries.

Executing queries works like so:

```ts
import db from 'bridg';

const data = await bridg.tableName.crudMethod(args);
```

The following are simplified examples. If you're thinking _"I wonder if I could do X with this.."_, the answer is probably yes. You will just need to search for "pagination with Prisma", or for whatever you're trying to achieve.

### Creating Data:

```ts
// create a single db record
const createdUser = await bridg.user.create({
  data: {
    name: 'John',
    email: 'johndoe@gmail.com',
  },
});

// create multiple records at once:
const creationCount = await bridg.user.createMany({
  data: [
    { name: 'John', email: 'johndoe@gmail.com' },
    { name: 'Sam', email: 'sam.johnson@outlook.com' },
    // ..., ...,
  ],
});

// create a user, and create a relational blog for them
const createdUser = await bridg.user.create({
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
const users = await bridg.user.findMany();

// all records that satisfy a where clause:
const users = await bridg.user.findMany({ where: { profileIsPublic: true } });

// get the first record that satisfies a where clause:
const user = await bridg.user.findFirst({ where: { email: 'johndoe@gmail.com' } });

// enforce that only one record could ever exist (must pass a unique column id):
const user = await bridg.user.findUnique({ where: { id: 'some-id' } });

// do the same thing, but throw an error if the data is missing
const user = await bridg.user.findUniqueOrThrow({ where: { id: 'some-id' } });
```

### Including Relational Data:

```ts
// all users and a list of all their blogs:
const users = await bridg.user.findMany({ include: { blogs: true } });

// where clauses can be applied to relational data:
const users = await bridg.user.findMany({
  include: {
    blogs: { where: { published: true } },
  },
});

// nest all blogs, and all comments on blogs. its just relations all the way down.
const users = await bridg.user.findMany({
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
const updatedData = await bridg.blog.update({
  where: { id: 'some-id' }, // must use a unique db key to use .update
  data: { title: 'New Blog title' },
});

// update many records
const updateCount = await bridg.blog.updateMany({
  where: { authorId: userId },
  data: { isPublished: true },
});
```

### Deleting data:

```ts
// delete a single record.  must use a unique db key to use .delete
const deletedBlog = await bridg.blog.delete({ where: { id: 'some-id' } });

// delete many records
const deleteCount = await bridg.blog.deleteMany({ where: { isPublished: false } });
```

## Realtime Data

Bridg supports listening to realtime Database events via [Prisma's Pulse extension](https://www.prisma.io/data-platform/pulse).

```ts
const subscription = await bridg.message.subscribe({
  create: {
    after: { conversationId: 'convo-id' },
  },
});

for await (const event of subscription) {
  const newMsg = event.after;
  setMessages([...messages, newMsg]);
}
```

[Example chat app with realtime events](https://github.com/JoeRoddy/pulse-chat-demo/)

Setting this up at the moment is somewhat cumbersome. Making this easier is a big priority.

For setup instructions, see [this comment](https://github.com/JoeRoddy/bridg/pull/57#issue-1991638858)

## Database Rules

> If you want to ignore this during development, you can set your database rules to the following to allow all requests (this is not secure):
>
> ```ts
> export const rules: DbRules = { default: true };
> ```

Because your database is now available on the frontend, that means anyone who can access your website will have access to your database. Fortunately, we can create custom rules to prevent our queries from being used nefariously 🥷.

Your rules could look something like the following:

```ts
import { type DbRules } from 'bridg/server';

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
- `update`: authorizes updates (.update, .updateMany, .upsert)
- `create`: authorizes creating data (.create, .createMany, .upsert)
- `delete`: authorizes deleting data (.delete, .deleteMany)

Note: .upsert uses `update` rules, if no data is updated, it will use `create` rules for creation

### What is a validator?

Validators control whether a particular request will be allowed to execute or not.

They can be provided in four ways:

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
         const userMakingRequest = await prisma.user.findFirst({ where: { id: uid } });
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

4) **Rule object** - For advanced use cases, you can pass any of the above via a `rule` property in an object.

   ```ts
   blog {
     find: {
       rule: true // OR whereClause OR callback
     }
   }
   // this is equivalent to:
   blog {
     find: true
   }
   ```

   This allows the use of extra features built into Bridg's rules, like blacklisting fields, and query lifecycle hooks:

   ```ts
   user {
     find: {
       rule: (uid) => !!uid,
       blockedFields: ['password'],
       // OR you can whitelist fields instead:
       allowedFields: ['id', 'email', 'name'],
       // run some code BEFORE a query is executed:
       before: (uid, queryArgs, context) => {
         // eg: bridg.blog.findMany({ where: { name: 'Jim' } });
         // queryArgs = { where: { name: 'Jim' } } + any additional where clauses from rules
         // context = { method: 'findMany', originalQuery: queryBeforeRulesApplied }

         // whatever we return will be the new arguments for the query.
         // be careful not to overwrite the where clauses applied from your rules!
         return {
           ...queryArgs,
           where: { ...queryArgs.where, profileIsPublic: true },
           include: { ...queryArgs.include, posts: true }
         }
       },
       // modify the result data AFTER the query has been executed:
       after: (uid, data, context) => {
         // we can do anything here, like mimic the 'blockedFields' functionality!
         delete data.password;

         // whatever we return will be sent to the client
         return data;
       }
     },
     // each method can have their own blockedFields:
     update: {
      rule: (uid) => ({ userId: uid }),
      blockedFields: [], // users can update their password, just not read them
     }
   }
   ```

### Rules stress testing

There may be undiscovered edgecases where an attacker could circumvent our database rules and access data that they shouldn't be allowed to. Here's a [previous example](https://github.com/JoeRoddy/bridg/issues/2) for reference.

If you stumble upon something like this, please 🙏 [create an issue](https://github.com/JoeRoddy/bridg/issues/new) with a detailed example, so it can be fixed.
