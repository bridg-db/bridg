# Bridg - Query your DB directly from the frontend

_Prisma on your UI_

Bridg let's you query your existing database from the client, like Firebase or Supabase, but with the power and type-safety of Prisma.

### Note

This library is **not** ready for production. There are known vulnerabilities with database rules. If you stumble upon a vulnerability, please 🙏 create an issue with an example so I can address it.

### Querying Your Database:

Bridg is built on top of Prisma, you can check out the basics of executing CRUD queries [here](https://www.prisma.io/docs/concepts/components/prisma-client/crud).

The [Prisma documentation](https://www.prisma.io/docs/getting-started) is excellent and is highly recommended if you haven't used Prisma in the past.

## Getting started

### Example Projects:

These examples are for demonstration purposes only. NextJS and React are not required to use this library. Bridg is compatible with any JS or TS frontend project.

[NextJS barebones setup](./examples/next-basic/) - Simple NextJS example with SQLite database

- [Codesandbox for this^ project](https://codesandbox.io/p/github/JoeRoddy/bridg-examples-nextjs/draft/laughing-alex?f[…]6s78wfs%2522%255D%252C%2522hideCodeEditor%2522%253Afalse%257D)

[Blogging app](./examples/next-nextauth-blogs/) - NextJS, next-auth authentication, CRUD examples, SQLite

_Want an example project for your favorite framework? Feel free to create an issue, or a PR with a sample. Bridg **should**_ 🤷‍♂️ _work with any JS framework._

### Wtf are these db rules for?

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
};
```

As you can see your rules will basically look like:

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

- `find`: authorizes reading of data
- `update`: authorizes updates
- `create`: authorizes creating data
- `delete`: authorizes deleting data

### What is a validator?

Validators control whether a particular request will be allowed to execute or not.

They can be provided in three ways:

**boolean** - use a boolean when you always know whether a certain request should go through or be blocked

```ts
tableName {
    find: false, // blocks all reads on a model
    create: true // allows any creation for a model
}
```

**where clause** - You can also apply a Prisma where clause for the given model. This clause will be required to be true, along with whatever input is passed from the client request.

note: `create` does not accept where clauses

```ts
blog {
    // allow reads only on blogs where isPublished = true
    find: { isPublished: true }
}
```

**callback function** - The most powerful option is a callback function. This will allow you to dynamically authorize requests based on the context of the request. You can also pass an `async` function, and make as many async calls as you want in the validator.

**args:**

`uid`: the id of the user making the request

`data`: the body data from the request (only available on update, create)

**return value:** `boolean` | `where clause`

Your callback function should either return a Prisma Where object for the corresponding table, or a boolean indicating whether the request should resolve or not.

Example:

```ts
blog {
    // allow reads if the blog is published OR if the user authored the blog
    find: (uid) => ({ OR: [{ isPublished: true }, {authorId: uid}]})
    // prevent the user from setting their own vote count
    create: (uid, data) => {
        if(data.voteCount === 0) {
            return true;
        } else {
            return false;
        }
    },
    // make an async call to determine if request should resolve
    // note: this should USUALLY be done via a relational query
    delete: async (uid) => {
        const user = await db.user.findFirst({ where: {id: uid }});
        return user.isAdmin ? true : false;
    }
}
```
