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
        include: { blogs: { where: {} } },
      });

      setData(data);
    })();
  }, []);

  return data === undefined ? <GetStarted /> : <pre>{JSON.stringify(data, null, 1)}</pre>;
};

export const dbRules: DbRules = {
  blog: {
    find: true,
    update: (uid) => ({ userId: uid }),
    create: (uid, data) => data?.title === 'This blog title is allowed',
    delete: (uid) => ({ userId: uid }),
  },
  user: {
    find: true,
    update: (uid) => ({ id: uid }),
    create: true,
    delete: false,
  },
};

export default BridgExample;

const GetStarted = () => <div>Fetch some data to get started</div>;
