import { DbRules } from 'bridg/app/server/request-handler';

export const dbRules: DbRules = {
  blog: {
    get: true,
    patch: (uid) => ({ userId: uid }),
    post: (uid, data) => data?.title === 'hiya',
    delete: (uid) => ({ userId: uid }),
  },
  user: {
    get: true,
    patch: (uid) => ({ id: uid }),
    post: true,
    delete: false,
  },
};
