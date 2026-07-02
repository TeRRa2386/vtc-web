# Vet Tech Companion Web

Next.js App Router website and admin operations dashboard for Vet Tech Companion.

## Areas

- Public website: home, support, account deletion, privacy policy, terms, FAQ, tester guide, and app updates.
- Private admin dashboard: `/admin` with protected operations for support tickets, account deletion requests, feature requests, users, announcements, and statistics.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style reusable UI components
- Framer Motion
- Supabase Auth and Database
- Vercel-ready deployment

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://wkrclhsyypvixgunsgeg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

Important: `SUPABASE_SERVICE_ROLE_KEY` must only exist on the server/Vercel environment. Never expose it in browser code.

## Supabase Setup

Run this SQL in Supabase SQL Editor:

```text
supabase/admin_dashboard.sql
```

Then create an admin auth user in Supabase Auth and add that user to `public.admin_users`:

```sql
insert into public.admin_users (user_id, email, role, is_active)
values ('AUTH_USER_UUID', 'admin@example.com', 'owner', true);
```

Supported admin roles:

- `owner`
- `admin`
- `support`
- `viewer`

## Supabase Auth Redirect URLs

In Supabase Dashboard > Authentication > URL Configuration, add the web callback URLs:

```text
http://127.0.0.1:3000/auth/callback
http://localhost:3000/auth/callback
https://YOUR-VERCEL-DOMAIN/auth/callback
https://vettechcompanion.com/auth/callback
```

The mobile app can keep `vettechcompanion://auth/callback`; the web dashboard needs the `/auth/callback` URLs above so Google login does not fall back to the mobile deep link.

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/admin/login
```

## Vercel Deployment

1. Push this project to a Git repository.
2. Import it in Vercel.
3. Add the environment variables listed above.
4. Deploy.

## Mobile App Integration

The mobile app can fetch active announcements from:

```text
GET /api/announcements?platform=ios
GET /api/announcements?platform=android
```

The endpoint returns active, non-expired announcements targeted to `all` or the requested platform.

## Security Notes

- Admin access is controlled by `public.admin_users`.
- Admin pages validate the current Supabase Auth session server-side.
- Privileged operations use server routes and the service role key only on the server.
- The dashboard does not permanently delete account data yet. Account deletion requests can be tracked and marked, and true deletion should be added behind explicit confirmation logic.
