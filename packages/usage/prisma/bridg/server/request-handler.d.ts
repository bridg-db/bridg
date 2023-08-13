import { Prisma, PrismaClient } from '@prisma/client';
export declare const handleRequest: (requestBody: {
    model: ModelName;
    func: PrismaFunction;
    args?: any;
}, config: {
    db: PrismaClient;
    rules: DbRules;
    uid?: string;
}) => Promise<{
    status: number;
    data: any;
    message?: undefined;
} | {
    status: number;
    message: string;
    data?: undefined;
}>;
declare const funcOptions: readonly ["aggregate", "count", "create", "delete", "deleteMany", "findFirst", "findFirstOrThrow", "findMany", "findUnique", "findUniqueOrThrow", "groupBy", "update", "updateMany", "upsert"];
declare type PrismaFunction = (typeof funcOptions)[number];
declare type OptionalPromise<T> = T | Promise<T>;
declare type RuleCallback<ReturnType, CreateInput = undefined> = CreateInput extends undefined ? (uid?: string) => OptionalPromise<ReturnType> : (uid?: string, body?: CreateInput) => OptionalPromise<ReturnType>;
declare type ModelRules<WhereInput, CreateInput> = Partial<{
    find: boolean | WhereInput | RuleCallback<boolean | WhereInput>;
    update: boolean | WhereInput | RuleCallback<boolean | WhereInput, CreateInput>;
    create: boolean | RuleCallback<boolean, CreateInput>;
    delete: boolean | WhereInput | RuleCallback<boolean | WhereInput>;
    default: boolean | RuleCallback<boolean, CreateInput>;
}>;
export declare type DbRules = Partial<{
    default: boolean;
    user: ModelRules<Prisma.UserWhereInput, Prisma.UserUncheckedCreateInput>;
    blog: ModelRules<Prisma.BlogWhereInput, Prisma.BlogUncheckedCreateInput>;
    comment: ModelRules<Prisma.CommentWhereInput, Prisma.CommentUncheckedCreateInput>;
}>;
declare const models: readonly ["user", "blog", "comment"];
declare type ModelName = typeof models[number];
export {};
