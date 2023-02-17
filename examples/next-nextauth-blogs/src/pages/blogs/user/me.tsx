import BlogList from '@/pages/components/blogs/BlogList';
import { Blog } from '@prisma/client';
import { NextPage } from 'next';
import { useSession } from 'next-auth/react';
import db from 'bridg/app/client/db';

import { useEffect, useState } from 'react';

interface Props {}

const Blogs: NextPage<Props> = ({}) => {
  const userId = useSession().data?.user?.id;

  const [blogs, setBlogs] = useState<Blog[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const blogs = await db.blog.findMany({ where: { userId } });
      setBlogs(blogs);
    })();
  }, [userId]);

  return (
    <div>
      <h2>My Blogs:</h2>
      <BlogList blogs={blogs} />
    </div>
  );
};

export default Blogs;
