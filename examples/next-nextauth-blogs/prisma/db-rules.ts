import { DbRules } from 'prisma-ui/app/server/request-handler';

export const dbRules: DbRules = {
  blog: {
    get: (uid) => true,
    patch: (uid, data) => {
      console.log('patch');

      if (data?.userId && uid !== data.userId) return false;
      return true;
    },
    post: (uid, data) => {
      console.log('post');

      return !!data?.userId;
    },
    delete: (uid) => {
      console.log('delete');

      return { userId: uid };
    },
  },
  user: {
    get: true,
    patch: (uid) => ({ id: uid }),
    post: true,
    delete: () => {
      console.log('user delete');

      return false;
    },
  },
  session: {
    get: true,
    patch: (uid) => ({ id: uid }),
    post: (uid) => {
      console.log('user delete');

      return false;
    },
    delete: (uid) => {
      console.log('user delete');

      return false;
    },
  },
};
