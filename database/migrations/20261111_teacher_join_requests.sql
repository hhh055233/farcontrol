create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.teacher_admins (
  email text primary key check (
    char_length(email) between 6 and 254
    and email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists private.teacher_join_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null check (
    char_length(email) between 6 and 254
    and email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  display_name text check (display_name is null or char_length(display_name) <= 120),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'revoked')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  admin_note text check (admin_note is null or char_length(admin_note) <= 500)
);
create index if not exists teacher_join_requests_status_requested_idx
  on private.teacher_join_requests(status, requested_at desc);
revoke all on table private.teacher_admins from public, anon, authenticated;
revoke all on table private.teacher_join_requests from public, anon, authenticated;
grant select, insert, update, delete on table private.teacher_admins to service_role;
grant select, insert, update, delete on table private.teacher_join_requests to service_role;

insert into private.teacher_admins(email, is_active)
values ('hhh055233@gmail.com', true)
on conflict (email) do update set is_active = true;

create or replace function public.steve_submit_teacher_request(p_auth_user_id uuid,p_email text,p_display_name text default null)
returns jsonb language plpgsql security invoker
set search_path = pg_catalog, public, private as $$
declare result_id uuid;
begin
  if p_auth_user_id is null or p_email is null or p_email <> lower(btrim(p_email))
     or length(p_email) not between 6 and 254 then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  insert into private.teacher_join_requests(auth_user_id,email,display_name,status,requested_at,reviewed_at,reviewed_by)
  values (p_auth_user_id,p_email,nullif(left(btrim(coalesce(p_display_name,'')),120),''),'pending',now(),null,null)
  on conflict (auth_user_id) do update set
    email=excluded.email, display_name=excluded.display_name,
    status=case when private.teacher_join_requests.status='approved' then 'approved' else 'pending' end,
    requested_at=case when private.teacher_join_requests.status='approved' then private.teacher_join_requests.requested_at else now() end,
    reviewed_at=case when private.teacher_join_requests.status='approved' then private.teacher_join_requests.reviewed_at else null end,
    reviewed_by=case when private.teacher_join_requests.status='approved' then private.teacher_join_requests.reviewed_by else null end
  returning id into result_id;
  return jsonb_build_object('id',result_id,'status',(select status from private.teacher_join_requests where id=result_id));
end; $$;

create or replace function public.steve_admin_list_teacher_requests()
returns jsonb language sql security invoker set search_path=pg_catalog,private as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'email',r.email,'display_name',r.display_name,'status',r.status,
    'requested_at',r.requested_at,'reviewed_at',r.reviewed_at,'admin_note',r.admin_note
  ) order by r.requested_at desc),'[]'::jsonb) from private.teacher_join_requests r;
$$;

create or replace function public.steve_admin_review_teacher_request(p_request_id uuid,p_status text,p_admin_user_id uuid,p_admin_note text default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,private as $$
declare target private.teacher_join_requests%rowtype;
begin
  if p_status not in ('approved','rejected','revoked') then raise exception 'invalid_status' using errcode='22023'; end if;
  select * into target from private.teacher_join_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found' using errcode='P0002'; end if;
  update private.teacher_join_requests set status=p_status,reviewed_at=now(),reviewed_by=p_admin_user_id,
    admin_note=nullif(left(btrim(coalesce(p_admin_note,'')),500),'') where id=p_request_id;
  if p_status='approved' then
    insert into public.teacher_email_allowlist(email,is_active,note)
    values(target.email,true,'Approved by Steve Control administrator')
    on conflict(email) do update set is_active=true,note=excluded.note;
  else
    update public.teacher_email_allowlist set is_active=false where email=target.email;
    update public.family_members set is_active=false where auth_user_id=target.auth_user_id and role='teacher';
  end if;
  return jsonb_build_object('id',p_request_id,'status',p_status);
end; $$;

create or replace function public.steve_is_teacher_admin(p_email text)
returns boolean language sql security invoker set search_path=pg_catalog,private as $$
  select exists(select 1 from private.teacher_admins where email=lower(btrim(p_email)) and is_active=true);
$$;

revoke all on function public.steve_submit_teacher_request(uuid,text,text) from public,anon,authenticated;
revoke all on function public.steve_admin_list_teacher_requests() from public,anon,authenticated;
revoke all on function public.steve_admin_review_teacher_request(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.steve_is_teacher_admin(text) from public,anon,authenticated;
grant execute on function public.steve_submit_teacher_request(uuid,text,text) to service_role;
grant execute on function public.steve_admin_list_teacher_requests() to service_role;
grant execute on function public.steve_admin_review_teacher_request(uuid,text,uuid,text) to service_role;
grant execute on function public.steve_is_teacher_admin(text) to service_role;
