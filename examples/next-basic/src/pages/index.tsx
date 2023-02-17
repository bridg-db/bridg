import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import db from 'bridg/app/client/db';

interface Props {}

const Name: NextPage<Props> = ({}) => {
  const [data, setData] = useState({});
  useEffect(() => {
    (async () => {
      const data = await db.blog.findMany({ include: { user: true } });

      setData(data);
    })();
  }, []);

  return data === undefined ? <GetStarted /> : <pre>{JSON.stringify(data, null, 1)}</pre>;
};
export default Name;

const GetStarted = () => <div>Fetch some data to get started</div>;
