-- Only school-approved teacher email addresses may use teacher APIs.
-- The list is private to the service role and is never readable by client users.

create table if not exists public.teacher_email_allowlist (
  email text primary key
    check (
      char_length(email) between 6 and 254
      and email = lower(btrim(email))
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  is_active boolean not null default true,
  note text check (note is null or char_length(note) <= 120),
  created_at timestamptz not null default now()
);

alter table public.teacher_email_allowlist enable row level security;
revoke all on table public.teacher_email_allowlist from public, anon, authenticated;
grant select on table public.teacher_email_allowlist to service_role;
