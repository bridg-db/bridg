import { handleRequest } from '../generated/bridg/server/request-handler';
import prisma from '../utils/prisma.test-util';
import { getRules } from '../utils/rules.test-util';

export const mockFetch = jest.fn().mockImplementation((api: string, args: any) => {
  return new Promise(async (fetchResolve) => {
    const rules = getRules();

    const bridgRes = await handleRequest(JSON.parse(args.body), {
      uid: '',
      rules,
      db: prisma,
    });

    fetchResolve({
      status: bridgRes.status,
      json: () => Promise.resolve(bridgRes.data),
    });
  });
});
