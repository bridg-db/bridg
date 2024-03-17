# Contributing to Bridg

Thank you for being interested enough in this project to open this 😉

I need all the help I can get, so if you spot anything you think you can improve, any PR's or even just opened issues would be extremely appreciated.

## Getting Started

1. Install Node.js `>=16.13` minimum, [latest LTS is recommended](https://nodejs.org/en/about/releases/)

   - Recommended: use [`nvm`](https://github.com/nvm-sh/nvm) for managing Node.js versions

1. Install [`pnpm`](https://pnpm.io/) (for installing npm dependencies, using pnpm workspaces)
1. Install [`ts-node`](https://github.com/TypeStrong/ts-node) (for running Node.js scripts written in TypeScript)

Copy paste these commands to install the global dependencies:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
nvm install --lts
npm install --global pnpm@8 ts-node
```

## How this repo works

This repo consists of two packages [/packages/generator](./packages/generator/) and [/packages/usage](./packages/usage)

### Generator

[/packages/generator](./packages/generator/) is the main package, this get's installed on a user's machine when they `npm install bridg`.

This is a [prisma generator](https://www.prisma.io/docs/concepts/components/prisma-schema/generators), it runs a code generation step whenever the user runs `npx prisma generate`

The Bridg generator creates Typescript files based on the user's Prisma schema, then compiles those files into JavaScript and `.d.ts` files

Any new features, or changes to existing functionality will be made in this package.

### Usage

[/packages/usage](./packages/usage/) is a test environment / playground for generating Bridg clients, for ensuring that generation and DB rules are working properly

## Running Tests

The main test suite is located at [`./packages/usage/__tests__/`](./packages/usage/__tests__/)

To run tests:

```shell
cd packages/usage

# regen bridg test clients, if you've made changes to generator code
npm run test:prepare

# runs all tests
npm run test

# run integration tests (fast)
npm run test:int

# run only pulse tests (long running, requires Prisma Pulse API key)
npm run test:pulse

# install every version (5+) of Prisma, and run integration tests
# ensures that changes don't break for previous versions of Prisma
npm run test:prisma-versions
```

## CLA

Pull Request authors must sign a contributor license agreement (CLA). Prisma has offered to let us to use their [CLA](https://cla-assistant.io/prisma/prisma) for this.

For now, this must be done manually, but in the future, this will be added as an automated step whenever you open your first PR.
