import { Blog, User } from '@prisma/client';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import db from 'bridg/app/client/db';
import { useEffect, useState } from 'react';

import BlogList from '@/pages/components/blogs/BlogList';

interface Props {}

const Blogs: NextPage<Props> = ({}) => {
  const userId = useRouter().query.userId as string;
  const [user, setUser] = useState<User & { blogs: Blog[] }>();

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const data = await db.user.findMany({
        where: { id: userId },
        include: { blogs: { where: { published: true } } },
      });

      setUser(data?.at(0));
    })();
  }, [userId]);

  return (
    <div>
      <h2>{user?.name}'s Blogs:</h2>
      {user?.blogs && <BlogList blogs={user?.blogs} />}
    </div>
  );
};

export default Blogs;
