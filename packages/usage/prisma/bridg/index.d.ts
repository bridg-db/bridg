import { Prisma } from '@prisma/client';
export declare const exec: ({ model, args, func }: {
    model: string;
    args?: {};
    func: string;
}) => Promise<any>;
declare type BridgModel<PrismaDelegate> = Omit<PrismaDelegate, 'createMany' | 'fields'>;
declare const bridg: {
    user: BridgModel<Prisma.UserDelegate<import("@prisma/client/runtime/library").DefaultArgs>>;
    blog: BridgModel<Prisma.BlogDelegate<import("@prisma/client/runtime/library").DefaultArgs>>;
    comment: BridgModel<Prisma.CommentDelegate<import("@prisma/client/runtime/library").DefaultArgs>>;
};
export default bridg;
