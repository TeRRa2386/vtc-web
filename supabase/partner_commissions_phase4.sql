-- Phase 4 partner commission engine.
-- Adds commission profiles, improves immutable ledger support, and prepares manual monthly payouts.

create table if not exists public.partner_commission_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete restrict,
  attribution_id uuid references public.user_partner_attributions(id) on delete set null,
  commission_model text not null check (commission_model in ('monthly', 'annual')),
  first_paid_revenuecat_event_id text references public.revenuecat_events(revenuecat_event_id) on delete restrict,
  first_paid_transaction_id text not null,
  first_paid_at timestamptz not null,
  eligibility_start timestamptz not null,
  eligibility_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partner_commission_profiles enable row level security;

alter table public.partner_commission_events
  add column if not exists commission_profile_id uuid references public.partner_commission_profiles(id) on delete restrict,
  add column if not exists source_transaction_id text,
  add column if not exists effective_at timestamptz,
  add column if not exists payout_id uuid references public.partner_payouts(id) on delete set null,
  add column if not exists created_by_admin_id uuid references auth.users(id) on delete set null,
  add column if not exists admin_notes text,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text;

alter table public.partner_commission_events alter column plan_type drop not null;
alter table public.partner_commission_events alter column status set default 'posted';

alter table public.partner_payouts
  add column if not exists gross_positive_commission numeric(12, 2) not null default 0,
  add column if not exists adjustments numeric(12, 2) not null default 0,
  add column if not exists net_amount numeric(12, 2) not null default 0,
  add column if not exists finalized_at timestamptz;

update public.partner_commission_events
set effective_at = coalesce(effective_at, transaction_date),
    source_transaction_id = coalesce(source_transaction_id, transaction_id),
    status = case when status in ('pending', 'eligible') then 'posted' else status end
where effective_at is null or source_transaction_id is null or status in ('pending', 'eligible');

update public.partner_payouts
set net_amount = case when net_amount = 0 then amount else net_amount end,
    gross_positive_commission = case when gross_positive_commission = 0 and amount > 0 then amount else gross_positive_commission end
where amount <> 0;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.partner_commission_events'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%commission_type%'
  loop
    execute format('alter table public.partner_commission_events drop constraint %I', constraint_name);
  end loop;

  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.partner_commission_events'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.partner_commission_events drop constraint %I', constraint_name);
  end loop;

  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.partner_commission_events'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%plan_type%'
  loop
    execute format('alter table public.partner_commission_events drop constraint %I', constraint_name);
  end loop;

  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.partner_commission_events'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%revenuecat_event_id%commission_type%'
  loop
    execute format('alter table public.partner_commission_events drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.partner_commission_events
  add constraint partner_commission_events_commission_type_check
    check (commission_type in ('annual_first_paid', 'annual_first_paid_transaction', 'monthly_paid_period', 'refund_reversal', 'manual_adjustment')),
  add constraint partner_commission_events_status_check
    check (status in ('posted', 'void', 'pending', 'eligible', 'paid', 'reversed')),
  add constraint partner_commission_events_plan_type_check
    check (plan_type is null or plan_type in ('monthly', 'annual', 'unknown'));

create index if not exists partner_commission_profiles_partner_idx on public.partner_commission_profiles(partner_id);
create index if not exists partner_commission_profiles_user_idx on public.partner_commission_profiles(user_id);
create index if not exists partner_commission_events_profile_idx on public.partner_commission_events(commission_profile_id);
create index if not exists partner_commission_events_effective_idx on public.partner_commission_events(effective_at desc);
create index if not exists partner_commission_events_source_transaction_idx on public.partner_commission_events(source_transaction_id);
create index if not exists partner_commission_events_status_idx on public.partner_commission_events(status);

create unique index if not exists partner_commission_events_positive_source_unique
  on public.partner_commission_events(source_transaction_id, commission_type)
  where source_transaction_id is not null
    and commission_amount > 0
    and status <> 'void'
    and commission_type in ('annual_first_paid', 'annual_first_paid_transaction', 'monthly_paid_period');

create unique index if not exists partner_commission_events_reversal_unique
  on public.partner_commission_events(reversal_of)
  where reversal_of is not null
    and commission_type = 'refund_reversal'
    and status <> 'void';

grant select, insert, update, delete on public.partner_commission_profiles to service_role;

notify pgrst, 'reload schema';