import type { NextApiRequest, NextApiResponse } from 'next';

import db from 'prisma/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  const result = await db.user.create({
    data: { email: 'nice', blogs: { create: [{ title: 'blog 1' }, { title: 'blog 2' }] } },
    include: { blogs: true },
  });

  if (result) return res.status(200).json(result);
}
