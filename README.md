# Bridg - ALPHA

## Use your Prisma client on any frontend. Seriously.

Bridg let's you query your existing database from the client, like Firebase or an equivalent BaaS (Backend as a service).

### Supported Databases:

Postgres, MySQL, SQLite, SQL Server, Mongo, CockroachDB

**Note:** Bridg is **not** ready for production. There are known vulnerabilities with database rules. If you stumble upon a vulnerability, please create an issue so it can be addressed.

### Example Projects:

These examples are for demonstration purposes only. NextJS and React are not required to use this library. Bridg is compatible with any JS or TS frontend project.

[NextJS barebones setup](./examples/next-basic/)

[Blogging app](./examples/next-nextauth-blogs/) - NextJS w/ next-auth authentication

### Querying Your Database:

Bridg is built on top of Prisma, you can check out the basics of executing CRUD queries [here](https://www.prisma.io/docs/concepts/components/prisma-client/crud).

The [Prisma documentation](https://www.prisma.io/docs/getting-started) is excellent and is highly recommended if you haven't used Prisma in the past.

### Wtf are these db rules for?

Because your database is now available on the frontend, that means anyone who can access your website will have direct access to your database. Fortunately, we can create custom rules to prevent our queries from being used nefariously 🥷.

Your rules could look something like the following:

```ts
export const rules: DbRules = {
  user: {
    get: { profileIsPublic: true }, // only allow reads on public profiles
    patch: (uid, data) => ({ id: uid }), // update only if its being done by the user
    post: (uid, data) => {
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
        get: validator,
        delete: validator
    }
}
```

**NOTE: If you don't provide a rule for a method, it will default to preventing those requests.**

In the above example, all `patch` (update) and `post` (create) requests will fail. Since they weren't provided, they default to `false`.

The methods available to create rules for are:

- `get`: authorizes reading of data
- `patch`: authorizes updates
- `post`: authorizes creating data
- `delete`: authorizes deleting data

### What is a validator?

Validators control whether a particular request will be allowed to execute or not.

They can be provided in three ways:

**boolean** - use a boolean when you always know whether a certain request should go through or be blocked

```ts
tableName {
    get: false, // blocks all reads on a model
    post: true // allows any creation for a model
}
```

**where clause** - You can also apply a Prisma where clause for the given model. This clause will be required to be true, along with whatever input is passed from the client request.

note: `post` does not accept where clauses

```ts
blog {
    // allow reads only on blogs where isPublished = true
    get: { isPublished: true }
}
```

**callback function** - The most powerful option is a callback function. This will allow you to dynamically authorize requests based on the context of the request.

**args:**

`uid`: the id of the user making the request

`data`: the body data from the request (only available on patch, post)

**return value:** `boolean` | `where clause`

Your callback function should either return a Prisma Where object for the corresponding table, or a boolean indicating whether the request should resolve or not.

Example:

```ts
blog {
    // allow reads if the blog is published OR if it's the user's own blog
    get: (uid) => ({ OR: [{ isPublished: true }, {authorId: uid}]})
    // prevent the user from setting their own vote count
    post: (uid, data) => {
        if(data.voteCount === 0) {
            return true;
        } else {
            return false;
        }
    }
}
```
