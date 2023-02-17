# Bridg - NextJS + next-auth

### Up and Running

This repository is for demonstration purposes. NextJS is not required to use Bridg. Bridg is compatible with any JS or TS frontend project.

1.  `git clone https://github.com/JoeRoddy/bridg-examples-next-with-auth.git` and cd into directory
2.  `npm install`
3.  `npm run generate`
4.  Configure an OAuth provider for authentication with [NextAuth.js](https://next-auth.js.org/).

    For Github, as an example:

    - Visit https://github.com/settings/developers
    - Select "Oauth Apps"
    - Click "New OAuth App"
    - Set Homepage URL to: http://localhost:3000
    - Set callback URL to: http://localhost:3000/api/auth/callback/github
    - Add the given Client ID and secret to [...nextauth.ts](./src/pages/api/auth/%5B...nextauth%5D.ts) or configure them as environment variables in `.env.local`

5.  `npm run dev`
