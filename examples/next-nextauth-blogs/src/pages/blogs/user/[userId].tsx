import { Blog, User } from '@prisma/client';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import db from 'bridg/app/client/db';
import { useEffect, useState } from 'react';

import BlogList from '@/pages/components/blogs/BlogList';

interface Props {}

const Blogs: NextPage<Props> = ({}) => {
  const router = useRouter();
  const userId = router.query.userId as string;
  const [user, setUser] = useState<User & { blogs: Blog[] }>();

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { blogs: { where: { published: true } } },
      });
      if (!user) return router.push('/404');

      setUser(user);
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
