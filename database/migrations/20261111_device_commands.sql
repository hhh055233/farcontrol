-- Steve Control: authenticated, visible device notice queue.
create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  device_id uuid not null,
  created_by_member_id uuid not null,
  command_type text not null check (command_type = 'show_notice'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'queued' check (status in ('queued','delivered','acknowledged','failed','expired','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  foreign key (device_id, family_id) references public.devices(id, family_id) on delete cascade,
  foreign key (created_by_member_id, family_id) references public.family_members(id, family_id) on delete restrict
);
create index if not exists device_commands_device_status_idx
  on public.device_commands(device_id, status, created_at);
alter table public.device_commands enable row level security;
revoke all on public.device_commands from anon, authenticated;
