-- Account-deletion automation and privacy hardening.
-- Apply after account_deletion_security.sql.

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in ('pending', 'processing', 'deleting', 'completed', 'rejected', 'canceled'));

alter table public.account_deletion_audit
  drop constraint if exists account_deletion_audit_action_check;

alter table public.account_deletion_audit
  add constraint account_deletion_audit_action_check
  check (action in ('approved', 'canceled', 'request_removed', 'executed', 'failed', 'user_canceled'));

-- The mobile app sends a short-lived Apple authorization code after sign-in.
-- The server exchanges it for a refresh token and stores only encrypted data.
create table if not exists public.account_deletion_apple_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.account_deletion_apple_tokens enable row level security;
revoke all on public.account_deletion_apple_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.account_deletion_apple_tokens to service_role;

create index if not exists account_deletion_requests_due_idx
  on public.account_deletion_requests(scheduled_deletion_at)
  where status = 'processing';

-- app_events are application telemetry, not a retained identity record.
-- Delete them with the rest of the user data rather than retaining metadata.
create or replace function public.delete_account_user_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  update public.revenuecat_events
  set aliases = '[]'::jsonb,
      app_user_id = null,
      original_app_user_id = null,
      raw_event = '{}'::jsonb,
      subscriber_attributes = '{}'::jsonb,
      user_id = null
  where user_id = target_user_id
     or app_user_id = target_user_id::text
     or original_app_user_id = target_user_id::text;

  delete from public.feature_requests where user_id = target_user_id;
  delete from public.support_tickets where user_id = target_user_id;
  delete from public.user_app_preferences where user_id = target_user_id;
  delete from public.user_subscription_metadata where user_id = target_user_id;
  delete from public.clinical_timers where user_id = target_user_id;
  delete from public.favorites where user_id = target_user_id;
  delete from public.notes where user_id = target_user_id;
  delete from public.app_events where user_id = target_user_id;
  delete from public.users where id = target_user_id;
end;
$$;

revoke all on function public.delete_account_user_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_account_user_data(uuid) to service_role;

notify pgrst, 'reload schema';
