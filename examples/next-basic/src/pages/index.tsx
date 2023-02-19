import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import db from 'bridg/app/client/db';
import { DbRules } from 'bridg/app/server/request-handler';

const BridgExample: NextPage = ({}) => {
  const [data, setData] = useState({});

  useEffect(() => {
    (async () => {
      // Query your DB from the frontend 😎
      const data = await db.user.findMany({
        // filter your results
        where: {
          email: { contains: '@prisma.io' },
        },
        // include related data
        include: { blogs: true },
      });

      setData(data);
    })();
  }, []);

  return data === undefined ? <GetStarted /> : <pre>{JSON.stringify(data, null, 1)}</pre>;
};

export const dbRules: DbRules = {
  blog: {
    get: true,
    patch: (uid) => ({ userId: uid }),
    post: (uid, data) => data?.title === 'This blog title is allowed',
    delete: (uid) => ({ userId: uid }),
  },
  user: {
    get: true,
    patch: (uid) => ({ id: uid }),
    post: true,
    delete: false,
  },
};

export default BridgExample;

const GetStarted = () => <div>Fetch some data to get started</div>;
