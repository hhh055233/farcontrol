-- Steve Control school workspace schema (draft).
-- Apply only after provisioning managed PostgreSQL and configuring auth.uid().
-- Initial product model: one teacher administrator per workspace; managed devices are enrolled transparently.

create extension if not exists pgcrypto;

create type public.workspace_status as enum ('active', 'suspended');
create type public.device_status as enum ('pending', 'active', 'revoked', 'offline');
create type public.pairing_status as enum ('pending', 'redeemed', 'expired', 'revoked');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  status public.workspace_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active teacher administrator per workspace in the initial release.
create table public.workspace_admins (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  auth_user_id uuid not null unique,
  display_name text not null check (char_length(display_name) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create index workspace_admins_user_idx on public.workspace_admins(auth_user_id, is_active);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  device_label text not null check (char_length(device_label) between 1 and 80),
  platform text not null default 'android' check (platform in ('android')),
  status public.device_status not null default 'pending',
  credential_hash text,
  policy_version bigint not null default 0,
  last_seen_at timestamptz,
  app_version text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (id, workspace_id)
);

create index devices_workspace_status_idx on public.devices(workspace_id, status);
create index devices_last_seen_idx on public.devices(last_seen_at);

create table public.pairing_codes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  device_label text not null,
  code_hash text not null unique,
  status public.pairing_status not null default 'pending',
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_by_admin_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (created_by_admin_id, workspace_id) references public.workspace_admins(id, workspace_id) on delete cascade
);

create index pairing_codes_workspace_expiry_idx on public.pairing_codes(workspace_id, expires_at) where status = 'pending';

create table public.device_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  device_id uuid not null,
  version bigint not null,
  policy jsonb not null default '{}'::jsonb,
  created_by_admin_id uuid not null,
  created_at timestamptz not null default now(),
  unique (device_id, version),
  foreign key (device_id, workspace_id) references public.devices(id, workspace_id) on delete cascade,
  foreign key (created_by_admin_id, workspace_id) references public.workspace_admins(id, workspace_id) on delete restrict
);

create index device_policies_latest_idx on public.device_policies(device_id, version desc);

create table public.audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_admin_id uuid,
  subject_device_id uuid,
  event_type text not null check (char_length(event_type) between 1 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (actor_admin_id, workspace_id) references public.workspace_admins(id, workspace_id) on delete restrict,
  foreign key (subject_device_id, workspace_id) references public.devices(id, workspace_id) on delete restrict
);

create index audit_events_workspace_time_idx on public.audit_events(workspace_id, created_at desc);

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_admins wa
    where wa.workspace_id = target_workspace_id
      and wa.auth_user_id = auth.uid()
      and wa.is_active = true
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_admins enable row level security;
alter table public.devices enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.device_policies enable row level security;
alter table public.audit_events enable row level security;

create policy workspace_admin_read on public.workspaces for select using (public.is_workspace_admin(id));
create policy admin_read_self on public.workspace_admins for select using (public.is_workspace_admin(workspace_id));
create policy devices_read_workspace on public.devices for select using (public.is_workspace_admin(workspace_id));
create policy policies_read_workspace on public.device_policies for select using (public.is_workspace_admin(workspace_id));
create policy audit_read_workspace on public.audit_events for select using (public.is_workspace_admin(workspace_id));

-- Pairing codes are never directly readable by client roles.
-- Create/redeem/revoke codes only through server-side API with teacher authorization,
-- short expiry, single-use redemption, hashing, rate limits and explicit device-side consent.
-- All writes to workspace, admin, device, policy and audit tables go through audited server transactions.
