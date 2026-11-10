-- Steve Family initial PostgreSQL schema
-- Apply only after provisioning a managed PostgreSQL database and configuring auth.uid().
-- All tenant-owned rows carry family_id. RLS is defense in depth; API authorization is still required.

create extension if not exists pgcrypto;

create type public.family_role as enum ('parent', 'child');
create type public.family_status as enum ('active', 'suspended');
create type public.device_status as enum ('pending', 'active', 'revoked', 'offline');
create type public.pairing_status as enum ('pending', 'redeemed', 'expired', 'revoked');

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  status public.family_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auth_user_id is the stable ID supplied by the chosen identity provider.
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  auth_user_id uuid not null,
  role public.family_role not null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (family_id, auth_user_id),
  unique (id, family_id)
);

create index family_members_user_idx on public.family_members(auth_user_id, is_active);
create index family_members_family_role_idx on public.family_members(family_id, role);

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null,
  nickname text not null check (char_length(nickname) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (id, family_id),
  unique (member_id),
  foreign key (member_id, family_id) references public.family_members(id, family_id) on delete cascade
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_profile_id uuid not null,
  device_label text not null check (char_length(device_label) between 1 and 80),
  platform text not null default 'android' check (platform = 'android'),
  status public.device_status not null default 'pending',
  credential_hash text,
  policy_version bigint not null default 0,
  last_seen_at timestamptz,
  app_version text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (id, family_id),
  foreign key (child_profile_id, family_id) references public.child_profiles(id, family_id) on delete cascade
);

create index devices_family_status_idx on public.devices(family_id, status);
create index devices_child_idx on public.devices(child_profile_id);
create index devices_last_seen_idx on public.devices(last_seen_at);

create table public.pairing_codes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_profile_id uuid not null,
  code_hash text not null unique,
  status public.pairing_status not null default 'pending',
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_by_member_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (child_profile_id, family_id) references public.child_profiles(id, family_id) on delete cascade,
  foreign key (created_by_member_id, family_id) references public.family_members(id, family_id) on delete cascade
);

create index pairing_codes_family_expiry_idx on public.pairing_codes(family_id, expires_at) where status = 'pending';

create table public.device_policies (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_profile_id uuid not null,
  version bigint not null,
  policy jsonb not null default '{}'::jsonb,
  created_by_member_id uuid not null,
  created_at timestamptz not null default now(),
  unique (child_profile_id, version),
  foreign key (child_profile_id, family_id) references public.child_profiles(id, family_id) on delete cascade,
  foreign key (created_by_member_id, family_id) references public.family_members(id, family_id) on delete restrict
);

create index device_policies_latest_idx on public.device_policies(child_profile_id, version desc);

create table public.audit_events (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  actor_member_id uuid,
  subject_child_id uuid,
  event_type text not null check (char_length(event_type) between 1 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (actor_member_id, family_id) references public.family_members(id, family_id) on delete restrict,
  foreign key (subject_child_id, family_id) references public.child_profiles(id, family_id) on delete restrict
);

create index audit_events_family_time_idx on public.audit_events(family_id, created_at desc);

-- RLS helper: current authenticated user must be an active member of this family.
create or replace function public.is_family_member(target_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id and fm.auth_user_id = auth.uid() and fm.is_active = true
  );
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.child_profiles enable row level security;
alter table public.devices enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.device_policies enable row level security;
alter table public.audit_events enable row level security;

create policy family_members_read_family on public.families for select using (public.is_family_member(id));
create policy members_read_same_family on public.family_members for select using (public.is_family_member(family_id));
create policy children_read_same_family on public.child_profiles for select using (public.is_family_member(family_id));
create policy devices_read_same_family on public.devices for select using (public.is_family_member(family_id));
create policy policies_read_same_family on public.device_policies for select using (public.is_family_member(family_id));
create policy audit_read_same_family on public.audit_events for select using (public.is_family_member(family_id));

-- Pairing codes are deliberately NOT directly readable by client roles.
-- Create/redeem/revoke pairing codes only through server-side API with parent-role checks,
-- rate limits, one-time redemption, and hashed code storage.
-- Writes to policies/devices/members/audit_events must likewise go through
-- server-side authorization and audited transactions.