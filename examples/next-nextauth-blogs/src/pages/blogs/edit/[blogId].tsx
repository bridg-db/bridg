import BlogForm from '@/pages/components/blogs/BlogForm';
import { Blog } from '@prisma/client';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import db from 'bridg/app/client/db';

import { useEffect, useState } from 'react';

interface Props {}

const EditBlogPage: NextPage<Props> = ({}) => {
  const router = useRouter();
  const blogId = useRouter().query.blogId as string;
  const [blog, setBlog] = useState<Blog>();
  useEffect(() => {
    if (!blogId) return;
    (async () => {
      const blog = await db.blog.findFirst({ where: { id: blogId } });
      setBlog(blog);
    })();
  }, [blogId]);

  return blog ? (
    <div>
      <BlogForm
        onSubmit={async (data) => {
          await db.blog.updateMany({ where: { id: blogId }, data });
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
