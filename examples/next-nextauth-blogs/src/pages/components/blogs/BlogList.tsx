import BlogItem from '@/pages/components/blogs/BlogItem';
import { Blog } from '@prisma/client';

const BlogList = ({ blogs }: { blogs: Blog[] }) => (
  <>
    {blogs.map((b) => (
      <BlogItem blog={b} key={b.id} />
    ))}
  </>
);

export default BlogList;
