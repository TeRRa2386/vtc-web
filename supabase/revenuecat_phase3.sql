-- Phase 3 RevenueCat webhook ingestion updates.
-- Keeps raw webhook events idempotent by RevenueCat event.id and preserves
-- transaction identifiers for later commission processing without deduping by transaction_id.

alter table public.revenuecat_events
  add column if not exists original_app_user_id text,
  add column if not exists aliases jsonb not null default '[]'::jsonb,
  add column if not exists event_timestamp timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists expiration_reason text,
  add column if not exists is_refund_event boolean not null default false,
  add column if not exists subscriber_attributes jsonb not null default '{}'::jsonb;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.revenuecat_events'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) ilike '%transaction_id%environment%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.revenuecat_events drop constraint %I', constraint_name);
  end if;
end $$;

create index if not exists revenuecat_events_event_type_idx on public.revenuecat_events(event_type);
create index if not exists revenuecat_events_environment_idx on public.revenuecat_events(environment);
create index if not exists revenuecat_events_product_plan_idx on public.revenuecat_events(product_id, plan_type);
create index if not exists revenuecat_events_app_user_id_idx on public.revenuecat_events(app_user_id);
create index if not exists revenuecat_events_received_idx on public.revenuecat_events(received_at desc);

notify pgrst, 'reload schema';
