import { Prisma } from '@prisma/client';
import { handleRequest } from './handler';
import { PrismaClient } from '@prisma/client';
import { getRules } from './test-rules';

declare const prisma: unique symbol;
type PrismaPromise<A> = Promise<A> & { [prisma]: true };

const client = new PrismaClient();

async function exec({ model, args, func = 'findMany' }: { model: string; args?: {}; func: string }) {
  const rules = getRules();

  // @ts-ignore
  return handleRequest({ model, args, func }, { db: client, rules, uid: '' }).then(async (res) => {
    if (res.status !== 200)
      throw new Error(`Bridg query on model "${model}"${res?.data?.error && `: ${res?.data?.error}`}`);

    return res.data;
  });
}

const userClient = {
  aggregate: <T extends Prisma.UserAggregateArgs>(
    args: Prisma.Subset<T, Prisma.UserAggregateArgs>,
    // @ts-ignore
  ): PrismaPromise<Prisma.GetUserAggregateType<T>> => exec({ func: 'aggregate', model: 'user', args }),
  create: <T extends Prisma.UserCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserCreateArgs>,
  ): Promise<Prisma.Prisma__UserClient<Prisma.UserGetPayload<T>>> => exec({ func: 'create', model: 'user', args }),
  count: <T extends Prisma.UserCountArgs>(
    args?: Prisma.Subset<T, Prisma.UserCountArgs>,
  ): PrismaPromise<
    T extends Prisma._Record<'select', any>
      ? T['select'] extends true
        ? number
        : Prisma.GetScalarType<T['select'], Prisma.UserCountAggregateOutputType>
      : number
    // @ts-ignore
  > => exec({ func: 'count', model: 'user', args }),
  delete: <T extends Prisma.UserDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserDeleteArgs>,
    // @ts-ignore
  ): Prisma.Prisma__UserClient<Prisma.UserGetPayload<T>> => exec({ func: 'delete', model: 'user', args }),
  deleteMany: <T extends Prisma.UserDeleteManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.UserDeleteManyArgs>,
    // @ts-ignore
  ): PrismaPromise<Prisma.BatchPayload> => exec({ func: 'deleteMany', model: 'user', args }),
  findFirst: <T extends Prisma.UserFindFirstArgs>(
    args?: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>,
  ): Prisma.Prisma__UserClient<Prisma.UserGetPayload<T> | null, null> =>
    // @ts-ignore
    exec({ func: 'findFirst', model: 'user', args }),
  findFirstOrThrow: <T extends Prisma.UserFindFirstOrThrowArgs>(
    args?: Prisma.SelectSubset<T, Prisma.UserFindFirstOrThrowArgs>,
    // @ts-ignore
  ): PrismaPromise<Array<Prisma.UserGetPayload<T>>> => exec({ func: 'findFirstOrThrow', model: 'user', args }),
  findMany: <T extends Prisma.UserFindManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>,
    // @ts-ignore
  ): PrismaPromise<Array<Prisma.UserGetPayload<T>>> => exec({ func: 'findMany', model: 'user', args }),
  findUnique: <T extends Prisma.UserFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>,
  ): Prisma.Prisma__UserClient<Prisma.UserGetPayload<T> | null, null> =>
    // @ts-ignore
    exec({ func: 'findUnique', model: 'user', args }),
  findUniqueOrThrow: <T extends Prisma.UserFindUniqueOrThrowArgs>(
    args?: Prisma.SelectSubset<T, Prisma.UserFindUniqueOrThrowArgs>,
  ): Prisma.Prisma__UserClient<Prisma.UserGetPayload<T>> =>
    // @ts-ignore
    exec({ func: 'findUniqueOrThrow', model: 'user', args }),
  groupBy: (args?: Prisma.UserGroupByArgs) => exec({ func: 'groupBy', model: 'user', args }),
  update: <T extends Prisma.UserUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>,
  ): Prisma.Prisma__UserClient<Prisma.UserGetPayload<T>> =>
    // @ts-ignore
    exec({ func: 'update', model: 'user', args }),
  updateMany: <T extends Prisma.UserUpdateManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserUpdateManyArgs>,
  ): PrismaPromise<Prisma.BatchPayload> =>
    // @ts-ignore
    exec({ func: 'updateMany', model: 'user', args }),
  // upsert: <T extends Prisma.UserUpsertArgs>(
  //     args: Prisma.SelectSubset<T, Prisma.UserUpsertArgs>,
  // ): Prisma.Prisma__UserClient<Prisma.UserGetPayload<T>> =>
  //     // @ts-ignore
  //     exec({ func: 'upsert', model: 'user', args }),
};

const blogClient = {
  aggregate: <T extends Prisma.BlogAggregateArgs>(
    args: Prisma.Subset<T, Prisma.BlogAggregateArgs>,
    // @ts-ignore
  ): PrismaPromise<Prisma.GetBlogAggregateType<T>> => exec({ func: 'aggregate', model: 'blog', args }),
  create: <T extends Prisma.BlogCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.BlogCreateArgs>,
  ): Promise<Prisma.Prisma__BlogClient<Prisma.BlogGetPayload<T>>> => exec({ func: 'create', model: 'blog', args }),
  count: <T extends Prisma.BlogCountArgs>(
    args?: Prisma.Subset<T, Prisma.BlogCountArgs>,
  ): PrismaPromise<
    T extends Prisma._Record<'select', any>
      ? T['select'] extends true
        ? number
        : Prisma.GetScalarType<T['select'], Prisma.BlogCountAggregateOutputType>
      : number
    // @ts-ignore
  > => exec({ func: 'count', model: 'blog', args }),
  delete: <T extends Prisma.BlogDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.BlogDeleteArgs>,
    // @ts-ignore
  ): Prisma.Prisma__BlogClient<Prisma.BlogGetPayload<T>> => exec({ func: 'delete', model: 'blog', args }),
  deleteMany: <T extends Prisma.BlogDeleteManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.BlogDeleteManyArgs>,
    // @ts-ignore
  ): PrismaPromise<Prisma.BatchPayload> => exec({ func: 'deleteMany', model: 'blog', args }),
  findFirst: <T extends Prisma.BlogFindFirstArgs>(
    args?: Prisma.SelectSubset<T, Prisma.BlogFindFirstArgs>,
  ): Prisma.Prisma__BlogClient<Prisma.BlogGetPayload<T> | null, null> =>
    // @ts-ignore
    exec({ func: 'findFirst', model: 'blog', args }),
  findFirstOrThrow: <T extends Prisma.BlogFindFirstOrThrowArgs>(
    args?: Prisma.SelectSubset<T, Prisma.BlogFindFirstOrThrowArgs>,
    // @ts-ignore
  ): PrismaPromise<Array<Prisma.BlogGetPayload<T>>> => exec({ func: 'findFirstOrThrow', model: 'blog', args }),
  findMany: <T extends Prisma.BlogFindManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.BlogFindManyArgs>,
    // @ts-ignore
  ): PrismaPromise<Array<Prisma.BlogGetPayload<T>>> => exec({ func: 'findMany', model: 'blog', args }),
  findUnique: <T extends Prisma.BlogFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.BlogFindUniqueArgs>,
  ): Prisma.Prisma__BlogClient<Prisma.BlogGetPayload<T> | null, null> =>
    // @ts-ignore
    exec({ func: 'findUnique', model: 'blog', args }),
  findUniqueOrThrow: <T extends Prisma.BlogFindUniqueOrThrowArgs>(
    args?: Prisma.SelectSubset<T, Prisma.BlogFindUniqueOrThrowArgs>,
  ): Prisma.Prisma__BlogClient<Prisma.BlogGetPayload<T>> =>
    // @ts-ignore
    exec({ func: 'findUniqueOrThrow', model: 'blog', args }),
  groupBy: (args?: Prisma.BlogGroupByArgs) => exec({ func: 'groupBy', model: 'blog', args }),
  update: <T extends Prisma.BlogUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.BlogUpdateArgs>,
  ): Prisma.Prisma__BlogClient<Prisma.BlogGetPayload<T>> =>
    // @ts-ignore
    exec({ func: 'update', model: 'blog', args }),
  updateMany: <T extends Prisma.BlogUpdateManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.BlogUpdateManyArgs>,
  ): PrismaPromise<Prisma.BatchPayload> =>
    // @ts-ignore
    exec({ func: 'updateMany', model: 'blog', args }),
  // upsert: <T extends Prisma.BlogUpsertArgs>(
  //     args: Prisma.SelectSubset<T, Prisma.BlogUpsertArgs>,
  // ): Prisma.Prisma__BlogClient<Prisma.BlogGetPayload<T>> =>
  //     // @ts-ignore
  //     exec({ func: 'upsert', model: 'blog', args }),
};

const commentClient = {
  aggregate: <T extends Prisma.CommentAggregateArgs>(
    args: Prisma.Subset<T, Prisma.CommentAggregateArgs>,
    // @ts-ignore
  ): PrismaPromise<Prisma.GetCommentAggregateType<T>> => exec({ func: 'aggregate', model: 'comment', args }),
  create: <T extends Prisma.CommentCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.CommentCreateArgs>,
  ): Promise<Prisma.Prisma__CommentClient<Prisma.CommentGetPayload<T>>> =>
    exec({ func: 'create', model: 'comment', args }),
  count: <T extends Prisma.CommentCountArgs>(
    args?: Prisma.Subset<T, Prisma.CommentCountArgs>,
  ): PrismaPromise<
    T extends Prisma._Record<'select', any>
      ? T['select'] extends true
        ? number
        : Prisma.GetScalarType<T['select'], Prisma.CommentCountAggregateOutputType>
      : number
    // @ts-ignore
  > => exec({ func: 'count', model: 'comment', args }),
  delete: <T extends Prisma.CommentDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.CommentDeleteArgs>,
    // @ts-ignore
  ): Prisma.Prisma__CommentClient<Prisma.CommentGetPayload<T>> => exec({ func: 'delete', model: 'comment', args }),
  deleteMany: <T extends Prisma.CommentDeleteManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.CommentDeleteManyArgs>,
    // @ts-ignore
  ): PrismaPromise<Prisma.BatchPayload> => exec({ func: 'deleteMany', model: 'comment', args }),
  findFirst: <T extends Prisma.CommentFindFirstArgs>(
    args?: Prisma.SelectSubset<T, Prisma.CommentFindFirstArgs>,
  ): Prisma.Prisma__CommentClient<Prisma.CommentGetPayload<T> | null, null> =>
    // @ts-ignore
    exec({ func: 'findFirst', model: 'comment', args }),
  findFirstOrThrow: <T extends Prisma.CommentFindFirstOrThrowArgs>(
    args?: Prisma.SelectSubset<T, Prisma.CommentFindFirstOrThrowArgs>,
    // @ts-ignore
  ): PrismaPromise<Array<Prisma.CommentGetPayload<T>>> => exec({ func: 'findFirstOrThrow', model: 'comment', args }),
  findMany: <T extends Prisma.CommentFindManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.CommentFindManyArgs>,
    // @ts-ignore
  ): PrismaPromise<Array<Prisma.CommentGetPayload<T>>> => exec({ func: 'findMany', model: 'comment', args }),
  findUnique: <T extends Prisma.CommentFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.CommentFindUniqueArgs>,
  ): Prisma.Prisma__CommentClient<Prisma.CommentGetPayload<T> | null, null> =>
    // @ts-ignore
    exec({ func: 'findUnique', model: 'comment', args }),
  findUniqueOrThrow: <T extends Prisma.CommentFindUniqueOrThrowArgs>(
    args?: Prisma.SelectSubset<T, Prisma.CommentFindUniqueOrThrowArgs>,
  ): Prisma.Prisma__CommentClient<Prisma.CommentGetPayload<T>> =>
    // @ts-ignore
    exec({ func: 'findUniqueOrThrow', model: 'comment', args }),
  groupBy: (args?: Prisma.CommentGroupByArgs) => exec({ func: 'groupBy', model: 'comment', args }),
  update: <T extends Prisma.CommentUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.CommentUpdateArgs>,
  ): Prisma.Prisma__CommentClient<Prisma.CommentGetPayload<T>> =>
    // @ts-ignore
    exec({ func: 'update', model: 'comment', args }),
  updateMany: <T extends Prisma.CommentUpdateManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.CommentUpdateManyArgs>,
  ): PrismaPromise<Prisma.BatchPayload> =>
    // @ts-ignore
    exec({ func: 'updateMany', model: 'comment', args }),
  // upsert: <T extends Prisma.CommentUpsertArgs>(
  //     args: Prisma.SelectSubset<T, Prisma.CommentUpsertArgs>,
  // ): Prisma.Prisma__CommentClient<Prisma.CommentGetPayload<T>> =>
  //     // @ts-ignore
  //     exec({ func: 'upsert', model: 'comment', args }),
};

export default {
  user: userClient,
  blog: blogClient,
  comment: commentClient,
};
