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

The mobile app can keep `vettechcompanion://auth/callback`; the web dashboard needs the exact `/auth/callback` URLs above so Google login does not fall back to the mobile deep link.

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

## Referral / Partner Tracking Phase 1

Phase 1 adds the foundations for the partner referral system without changing mobile subscription gating or RevenueCat purchase behavior.

### Supabase setup

Run this SQL in the existing Vet Tech Companion Supabase project:

```sql
-- file: supabase/referral_phase1.sql
```

The migration creates:

- `partners`
- `partner_users`
- `partner_link_clicks`
- `user_partner_attributions`
- `partner_attribution_audit_log`
- `revenuecat_events`
- `partner_commission_events`
- `partner_payouts`

It also enables RLS and grants service-role access for server-side admin/API operations.

### Create the first test partner

1. Open `/admin/partners` with an approved admin account.
2. Create a partner such as:
   - Partner name: `Sasha`
   - Public slug: `sasha`
   - Referral code: `SASHA`
   - Status: `active`
3. Open the generated dashboard at `/admin/partners/sasha`.

### Test the referral URL

Open:

```text
https://vettechcompanion.com/r/sasha
```

or locally:

```text
http://localhost:3000/r/sasha
```

The page records a row in `partner_link_clicks` and builds store links with partner context. Android includes a Play Store `referrer` payload with `partner`, `partner_slug`, and `click_id` so the next phase can connect Google Play Install Referrer to a Supabase user after sign-in.

### Outside-code configuration still needed later

- Run `supabase/referral_phase1.sql` in Supabase before using the admin screens.
- Add App Store Connect campaign/provider tokens to each partner if you want Apple aggregate campaign analytics.
- Android Install Referrer support still requires a mobile-app phase.
- RevenueCat webhook processing and commission ledger automation are prepared in schema only; they are not active yet.
- Partner Portal authentication is prepared through `partner_users`, but the read-only partner portal UI is a later phase.


## RevenueCat Webhook Phase 3

Phase 3 stores RevenueCat subscription lifecycle webhooks in `public.revenuecat_events` for audit/debugging and later commission processing. It does not create partner commission rows yet.

### Environment variables

Set these on Vercel and locally:

```text
REVENUECAT_WEBHOOK_AUTH_TOKEN=your-secret-authorization-value
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
```

Never expose either value to the browser or mobile app.

### Supabase setup

Run the Phase 1 SQL for a new database, then run the Phase 3 migration against an existing database:

```sql
-- file: supabase/revenuecat_phase3.sql
```

The RevenueCat event table deduplicates by `revenuecat_event_id`. It intentionally does not deduplicate by `transaction_id` because multiple lifecycle events can reference the same transaction.

### RevenueCat dashboard setup

Create a webhook integration in RevenueCat pointing to:

```text
https://vettechcompanion.com/api/revenuecat/webhook
```

Set the RevenueCat authorization header to the same value stored in `REVENUECAT_WEBHOOK_AUTH_TOKEN`. Send sandbox and production events so testing data remains visible but separable from future financial reporting.
