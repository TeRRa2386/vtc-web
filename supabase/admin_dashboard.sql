create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'support', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read own admin profile" on public.admin_users;
create policy "Admins can read own admin profile"
  on public.admin_users for select
  using (auth.uid() = user_id);

alter table public.support_tickets
  add column if not exists category text,
  add column if not exists priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists internal_notes text;

alter table public.account_deletion_requests
  add column if not exists internal_notes text;

alter table public.account_deletion_requests
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists canceled_at timestamptz,
  add column if not exists canceled_by uuid references auth.users(id) on delete set null,
  add column if not exists scheduled_deletion_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists anonymized_user_key text,
  add column if not exists deletion_error text;

alter table public.account_deletion_requests
  alter column user_id drop not null;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_user_id_fkey;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in ('pending', 'processing', 'completed', 'rejected', 'canceled'));

create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null default '',
  title text not null default '',
  description text not null default '',
  category text not null default 'general',
  status text not null default 'new' check (status in ('new', 'reviewing', 'planned', 'in_progress', 'released', 'rejected')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_requests enable row level security;

drop policy if exists "Users can create feature requests" on public.feature_requests;
create policy "Users can create feature requests"
  on public.feature_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own feature requests" on public.feature_requests;
create policy "Users can read own feature requests"
  on public.feature_requests for select
  using (auth.uid() = user_id);

create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  platform text not null default 'all' check (platform in ('all', 'ios', 'android')),
  min_app_version text,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_announcements enable row level security;

drop policy if exists "Anyone can read active app announcements" on public.app_announcements;
create policy "Anyone can read active app announcements"
  on public.app_announcements for select
  using (
    is_active = true
    and (expires_at is null or expires_at > now())
  );

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  platform text check (platform in ('ios', 'android', 'web')),
  app_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_events enable row level security;

drop policy if exists "Users can create app events" on public.app_events;
create policy "Users can create app events"
  on public.app_events for insert
  with check (auth.uid() = user_id or user_id is null);

create index if not exists admin_users_user_id_idx on public.admin_users(user_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists account_deletion_requests_status_idx on public.account_deletion_requests(status);
create index if not exists account_deletion_requests_scheduled_deletion_idx on public.account_deletion_requests(scheduled_deletion_at);
create index if not exists feature_requests_status_idx on public.feature_requests(status);
create index if not exists app_announcements_active_idx on public.app_announcements(is_active, platform);
create index if not exists app_events_platform_version_idx on public.app_events(platform, app_version);

create table if not exists public.account_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.account_deletion_requests(id) on delete set null,
  anonymized_user_key text,
  action text not null check (action in ('approved', 'canceled', 'request_removed', 'executed', 'failed')),
  actor_admin_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.account_deletion_audit
  drop constraint if exists account_deletion_audit_action_check;

alter table public.account_deletion_audit
  add constraint account_deletion_audit_action_check
  check (action in ('approved', 'canceled', 'request_removed', 'executed', 'failed'));

alter table public.account_deletion_audit enable row level security;
create index if not exists account_deletion_audit_request_idx on public.account_deletion_audit(request_id);
create index if not exists account_deletion_audit_action_idx on public.account_deletion_audit(action);

grant select on public.app_versions to service_role;
grant select on public.content_versions to service_role;
grant select on public.drugs to service_role;
grant select on public.diseases to service_role;
grant select on public.vaccines to service_role;
grant select on public.emergency_cards to service_role;
grant select, insert, update, delete on public.account_deletion_audit to service_role;

notify pgrst, 'reload schema';
