import { useAsync } from '@/useAsync';
import db from 'bridg';
import { DbRules } from 'bridg/server/request-handler';
import { NextPage } from 'next';

const BridgExample: NextPage = ({}) => {
  const [data] = useAsync(() =>
    // Query your DB from the frontend 😎
    db.user.findMany({
      // filter your results
      where: { email: {} },
      // include related data
      include: { blogs: { where: {} } },
    }),
  );

  return data === undefined ? <GetStarted /> : <pre>{JSON.stringify(data, null, 1)}</pre>;
};

// DB rules protect against unauthorized access
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
