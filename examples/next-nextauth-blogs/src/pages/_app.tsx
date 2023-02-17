import { Session } from 'next-auth';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps<{ session: Session }>) {
  return (
    <SessionProvider session={session}>
      <Header />
      <Component {...pageProps} />
    </SessionProvider>
  );
}

const Header = () => {
  const session = useSession();
  const router = useRouter();

  return (
    <>
      <div style={{ display: 'flex', gap: 10 }}>
        <Link href="/blogs">All Blogs</Link>
        {session.status === 'authenticated' ? (
          <>
            <Link href="/blogs/user/me">My Blogs</Link>
            <Link href="/blogs/create">Create New Blog</Link>
            {session.data.user?.email}
            <button onClick={() => signOut()}>Sign out</button>
          </>
        ) : (
          <button onClick={() => router.push(`/api/auth/signin`)}>Login</button>
        )}
      </div>
      <hr />
    </>
  );
};
