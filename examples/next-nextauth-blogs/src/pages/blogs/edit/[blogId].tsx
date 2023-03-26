import BlogForm from '@/pages/components/blogs/BlogForm';
import { Blog } from '@prisma/client';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import db from 'bridg/app/client/db';

import { useEffect, useState } from 'react';

interface Props {}

const EditBlogPage: NextPage<Props> = ({}) => {
  const router = useRouter();
  const blogId = router.query.blogId as string;
  const [blog, setBlog] = useState<Blog>();
  useEffect(() => {
    if (!blogId) return;
    (async () => {
      const blog = await db.blog.findUnique({ where: { id: blogId } });
      if (!blog) return router.push('/404');
      setBlog(blog);
    })();
  }, [blogId]);

  return blog ? (
    <div>
      <BlogForm
        onSubmit={async (data) => {
          await db.blog.update({ where: { id: blogId }, data });
          router.push(`/blogs/${blog.id}`);
        }}
        onCancel={() => router.push(`/blogs/${blog.id}`)}
        defaultValues={{ title: blog.title, body: blog.body || '', published: blog.published }}
      />
    </div>
  ) : (
    <p>loading..</p>
  );
};

export default EditBlogPage;
