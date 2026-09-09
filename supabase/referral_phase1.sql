-- Phase 1 referral and partner tracking foundations for Vet Tech Companion.
-- Run this in the existing Supabase project used by the mobile app and admin website.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  group_name text,
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  android_referrer_code text not null unique,
  ios_campaign_token text,
  ios_provider_token text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'manager', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, partner_id)
);

create table if not exists public.partner_link_clicks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  click_id uuid not null unique default gen_random_uuid(),
  platform_detected text not null default 'unknown' check (platform_detected in ('android', 'ios', 'desktop', 'unknown')),
  destination text not null default 'landing' check (destination in ('landing', 'google_play', 'app_store')),
  landing_url text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_partner_attributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete restrict,
  first_click_id uuid references public.partner_link_clicks(click_id) on delete set null,
  platform text not null default 'unknown' check (platform in ('android', 'ios', 'web', 'unknown')),
  source text not null check (source in ('google_play_install_referrer', 'ios_referral_code', 'ios_universal_link', 'web_pre_registration', 'partner_code', 'admin_manual', 'import')),
  attribution_confidence text not null default 'medium' check (attribution_confidence in ('strong', 'medium', 'manual', 'aggregate_only')),
  commission_model text check (commission_model in ('annual', 'monthly')),
  first_paid_transaction_at timestamptz,
  commission_eligibility_start timestamptz,
  commission_eligibility_end timestamptz,
  monthly_commission_payments_count integer not null default 0,
  annual_commission_satisfied boolean not null default false,
  locked boolean not null default true,
  attributed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_attribution_audit_log (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid references public.user_partner_attributions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  old_partner_id uuid references public.partners(id) on delete set null,
  new_partner_id uuid references public.partners(id) on delete set null,
  changed_by_admin_id uuid references auth.users(id) on delete set null,
  reason text not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.revenuecat_events (
  id uuid primary key default gen_random_uuid(),
  revenuecat_event_id text not null unique,
  transaction_id text,
  original_transaction_id text,
  app_user_id text,
  original_app_user_id text,
  aliases jsonb not null default '[]'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  environment text not null check (environment in ('production', 'sandbox')),
  event_type text not null,
  period_type text,
  is_trial_conversion boolean,
  store text,
  product_id text,
  plan_type text check (plan_type in ('monthly', 'annual', 'unknown')),
  price numeric(12, 2),
  currency text,
  purchased_at timestamptz,
  expiration_at timestamptz,
  event_timestamp timestamptz,
  cancellation_reason text,
  expiration_reason text,
  is_refund_event boolean not null default false,
  subscriber_attributes jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  raw_event jsonb not null default '{}'::jsonb
);

create table if not exists public.partner_commission_events (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  revenuecat_event_id text references public.revenuecat_events(revenuecat_event_id) on delete restrict,
  transaction_id text,
  original_transaction_id text,
  platform text not null default 'unknown' check (platform in ('android', 'ios', 'web', 'unknown')),
  plan_type text not null check (plan_type in ('monthly', 'annual')),
  transaction_date timestamptz not null,
  payout_period_year integer not null,
  payout_period_month integer not null check (payout_period_month between 1 and 12),
  commission_amount numeric(12, 2) not null,
  commission_type text not null check (commission_type in ('annual_first_paid_transaction', 'monthly_paid_period', 'refund_reversal', 'manual_adjustment')),
  eligibility_start timestamptz,
  eligibility_end timestamptz,
  monthly_payment_number integer,
  status text not null default 'pending' check (status in ('pending', 'eligible', 'paid', 'reversed', 'void')),
  reversal_of uuid references public.partner_commission_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique nulls not distinct (revenuecat_event_id, commission_type)
);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  period_year integer not null,
  period_month integer not null check (period_month between 1 and 12),
  amount numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'void')),
  paid_at timestamptz,
  paid_by_admin_id uuid references auth.users(id) on delete set null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, period_year, period_month)
);

alter table public.partners enable row level security;
alter table public.partner_users enable row level security;
alter table public.partner_link_clicks enable row level security;
alter table public.user_partner_attributions enable row level security;
alter table public.partner_attribution_audit_log enable row level security;
alter table public.revenuecat_events enable row level security;
alter table public.partner_commission_events enable row level security;
alter table public.partner_payouts enable row level security;

drop policy if exists "Admins can read all partners" on public.partners;
create policy "Admins can read all partners" on public.partners for select using (
  exists (select 1 from public.admin_users where user_id = auth.uid() and is_active = true)
);

drop policy if exists "Partner users can read own partners" on public.partners;
create policy "Partner users can read own partners" on public.partners for select using (
  exists (select 1 from public.partner_users where user_id = auth.uid() and partner_id = partners.id and is_active = true)
);

drop policy if exists "Partner users can read own authorization" on public.partner_users;
create policy "Partner users can read own authorization" on public.partner_users for select using (auth.uid() = user_id);

drop policy if exists "Users can read own partner attribution" on public.user_partner_attributions;
create policy "Users can read own partner attribution" on public.user_partner_attributions for select using (auth.uid() = user_id);

drop policy if exists "Partner users can read own payouts" on public.partner_payouts;
create policy "Partner users can read own payouts" on public.partner_payouts for select using (
  exists (select 1 from public.partner_users where user_id = auth.uid() and partner_id = partner_payouts.partner_id and is_active = true)
);

create index if not exists partners_slug_idx on public.partners(slug);
create index if not exists partners_status_idx on public.partners(status);
create index if not exists partner_users_user_id_idx on public.partner_users(user_id);
create index if not exists partner_users_partner_id_idx on public.partner_users(partner_id);
create index if not exists partner_link_clicks_partner_created_idx on public.partner_link_clicks(partner_id, created_at desc);
create index if not exists partner_link_clicks_click_id_idx on public.partner_link_clicks(click_id);
create index if not exists user_partner_attributions_partner_idx on public.user_partner_attributions(partner_id);
create unique index if not exists user_partner_attributions_first_click_id_unique
  on public.user_partner_attributions(first_click_id)
  where first_click_id is not null;
create index if not exists revenuecat_events_user_env_idx on public.revenuecat_events(user_id, environment);
create index if not exists revenuecat_events_transaction_idx on public.revenuecat_events(transaction_id);
create index if not exists revenuecat_events_received_idx on public.revenuecat_events(received_at desc);
create index if not exists revenuecat_events_app_user_id_idx on public.revenuecat_events(app_user_id);
create index if not exists revenuecat_events_product_plan_idx on public.revenuecat_events(product_id, plan_type);
create index if not exists revenuecat_events_environment_idx on public.revenuecat_events(environment);
create index if not exists revenuecat_events_event_type_idx on public.revenuecat_events(event_type);
create index if not exists partner_commission_partner_period_idx on public.partner_commission_events(partner_id, payout_period_year, payout_period_month);
create index if not exists partner_payouts_partner_period_idx on public.partner_payouts(partner_id, period_year, period_month);

grant select, insert, update on public.partners to service_role;
grant select, insert, update, delete on public.partner_users to service_role;
grant select, insert, update, delete on public.partner_link_clicks to service_role;
grant select, insert, update, delete on public.user_partner_attributions to service_role;
grant select, insert, update, delete on public.partner_attribution_audit_log to service_role;
grant select, insert, update, delete on public.revenuecat_events to service_role;
grant select, insert, update, delete on public.partner_commission_events to service_role;
grant select, insert, update, delete on public.partner_payouts to service_role;

notify pgrst, 'reload schema';


