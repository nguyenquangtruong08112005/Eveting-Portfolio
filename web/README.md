This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Social Authentication Setup

To enable Google or Facebook authentication in the web client, set the corresponding public environment variables in `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id_here
```

> **Security Note:** Never put private client secrets (e.g. `FACEBOOK_APP_SECRET` or Google Client Secret) in `.env.local` or any `NEXT_PUBLIC_*` variables. The browser client only uses public App / Client IDs.

### Developer Console Prerequisites

1. **Google Identity Services (Google Cloud Console):**
   - Go to **Google Cloud Console** > **APIs & Services** > **Credentials**.
   - Create or select an **OAuth 2.0 Client ID** of type **Web Application**.
   - Under **Authorized JavaScript origins**, add your local dev URL (e.g. `http://localhost:3001`) and production domain.
   - Copy the Client ID and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

2. **Facebook JS SDK (Meta for Developers Console):**
   - Go to **Meta for Developers** > **My Apps** > Select or create your App.
   - Go to **App Settings** > **Basic** and add **App Domains** (e.g. `localhost`).
   - Enable **Facebook Login** product, and under **Settings**, configure **Valid OAuth Redirect URIs** and allowed domains (e.g. `http://localhost:3001/`).
   - Copy the App ID and set `NEXT_PUBLIC_FACEBOOK_APP_ID`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
