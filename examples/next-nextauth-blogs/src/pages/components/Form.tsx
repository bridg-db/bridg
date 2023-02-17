import { useState } from 'react';

interface Props {
  defaultValues?: any;
  onSubmit: (data: any) => void;
  onCancel?: () => void;
}

const BlogForm = ({ defaultValues, onSubmit, onCancel }: Props) => {
  const [title, setTitle] = useState(defaultValues?.title || '');
  const [body, setBody] = useState(defaultValues?.body || '');
  const [published, setPublished] = useState(defaultValues?.published || false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        onSubmit({ title, body, published });
      }}
    >
      <label>title</label>
      <br />
      <input type="text" className="" onChange={(e) => setTitle(e.target.value)} value={title} />
      <br />
      <label>body</label>
      <br />
      <input type="text" className="" onChange={(e) => setBody(e.target.value)} value={body} />
      <br />
      <label>published</label>
      <input type="checkbox" className="" onChange={(e) => setPublished(e.target.checked)} checked={published} />
      <br />
      {onCancel && <button onClick={onCancel}>cancel</button>}
      <button type="submit">save</button>
    </form>
  );
};
export default BlogForm;
