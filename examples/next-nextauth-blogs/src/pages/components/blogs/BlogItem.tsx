import { Blog } from '@prisma/client';
import Link from 'next/link';

const BlogItem = ({ blog }: { blog: Blog }) => (
  <div key={blog.id}>
    <Link href={`/blogs/${blog.id}`}>
      <h3>{blog.title}</h3>
    </Link>
    <p>{blog.body}</p>
  </div>
);

export default BlogItem;
