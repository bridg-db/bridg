import { Blog, User } from '@prisma/client';
import { NextPage } from 'next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import db from 'bridg/app/client/db';
import { useEffect, useState } from 'react';

interface Props {}

const BlogPage: NextPage<Props> = ({}) => {
  const router = useRouter();
  const session = useSession();
  const blogId = useRouter().query.blogId as string;
  const [blog, setBlog] = useState<Blog & { user: User | null }>();

  useEffect(() => {
    if (!blogId) return;
    (async () => {
      const blog = await db.blog.findFirst({ where: { id: blogId as string }, include: { user: true } });
      setBlog(blog);
    })();
  }, [blogId]);

  if (!blog) return <p>loading..</p>;

  return (
    <div>
      <h3>{blog.title}</h3>
      <i>{!blog.published && 'Not'} Published</i>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {blog.user && (
          <>
            Author:
            {blog.user.image && <img style={{ height: 30, width: 30, borderRadius: 15 }} src={blog.user.image} />}
            <a href={`/blogs/user/${blog.user.id}`}>{blog.user.name}</a>
          </>
        )}
      </div>
      <p>{blog.body}</p>
      {blog.userId === session.data?.user?.id && (
        <>
          <button onClick={() => router.push(`/blogs/edit/${blogId}`)}>Edit</button>
          <button
            onClick={async () => {
              await db.blog.deleteMany({ where: { id: blogId } });
              router.push('/blogs');
            }}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
};

export default BlogPage;
