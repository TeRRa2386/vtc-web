-- Account deletion uses this server-only function instead of granting broad
-- table DELETE privileges to service_role. It removes personal application
-- data, preserves financial records, and strips user identifiers from them.

alter table public.partner_commission_events
  alter column user_id drop not null;

alter table public.partner_commission_events
  drop constraint if exists partner_commission_events_user_id_fkey;

alter table public.partner_commission_events
  add constraint partner_commission_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.partner_commission_events
  drop constraint if exists partner_commission_events_commission_profile_id_fkey;

alter table public.partner_commission_events
  add constraint partner_commission_events_commission_profile_id_fkey
  foreign key (commission_profile_id) references public.partner_commission_profiles(id) on delete set null;

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
  set
    aliases = '[]'::jsonb,
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
  delete from public.users where id = target_user_id;
end;
$$;

revoke all on function public.delete_account_user_data(uuid) from public;
revoke all on function public.delete_account_user_data(uuid) from anon;
revoke all on function public.delete_account_user_data(uuid) from authenticated;
grant execute on function public.delete_account_user_data(uuid) to service_role;

notify pgrst, 'reload schema';
