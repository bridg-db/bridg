import { handleRequest } from '../generated/bridg/server/request-handler';
import prisma from '../utils/prisma';
import { getRules } from '../utils/test-rules';

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
