-- Phase 6 Partner Portal authorization, invitation metadata, and read-only partner policies.
-- Non-destructive: keeps existing partners, attributions, commissions, and payouts.
-- The Partner Portal uses server-side DTOs; this migration does not grant new direct browser reads.

alter table public.partner_users
  add column if not exists email text,
  add column if not exists invitation_sent_at timestamptz,
  add column if not exists last_invited_at timestamptz,
  add column if not exists disabled_at timestamptz,
  add column if not exists revoked_at timestamptz;

create index if not exists partner_users_email_idx on public.partner_users(lower(email));
create index if not exists partner_users_active_partner_idx on public.partner_users(user_id, partner_id) where is_active = true;

drop policy if exists "Partner users can read own authorization" on public.partner_users;
create policy "Partner users can read own authorization" on public.partner_users for select using (
  auth.uid() = user_id
);

drop policy if exists "Partner users can read same partner users" on public.partner_users;

drop policy if exists "Partner users can read own partner attributions" on public.user_partner_attributions;
create policy "Partner users can read own partner attributions" on public.user_partner_attributions for select using (
  exists (
    select 1
    from public.partner_users
    where partner_users.user_id = auth.uid()
      and partner_users.partner_id = user_partner_attributions.partner_id
      and partner_users.is_active = true
  )
);

drop policy if exists "Partner users can read own commission profiles" on public.partner_commission_profiles;
create policy "Partner users can read own commission profiles" on public.partner_commission_profiles for select using (
  exists (
    select 1
    from public.partner_users
    where partner_users.user_id = auth.uid()
      and partner_users.partner_id = partner_commission_profiles.partner_id
      and partner_users.is_active = true
  )
);

drop policy if exists "Partner users can read own commission events" on public.partner_commission_events;
create policy "Partner users can read own commission events" on public.partner_commission_events for select using (
  exists (
    select 1
    from public.partner_users
    where partner_users.user_id = auth.uid()
      and partner_users.partner_id = partner_commission_events.partner_id
      and partner_users.is_active = true
  )
);

notify pgrst, 'reload schema';
