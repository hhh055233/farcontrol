-- Refactor the internal account model to a single teacher role and device groups.
drop policy if exists audit_events_parent_read on public.audit_events;
drop policy if exists child_profiles_parent_read on public.child_profiles;
drop policy if exists device_policies_parent_read on public.device_policies;
drop policy if exists devices_parent_read on public.devices;
drop policy if exists families_parent_read on public.families;
drop policy if exists family_members_parent_read on public.family_members;
drop policy if exists audit_events_teacher_read on public.audit_events;
drop policy if exists child_profiles_teacher_read on public.child_profiles;
drop policy if exists device_policies_teacher_read on public.device_policies;
drop policy if exists devices_teacher_read on public.devices;
drop policy if exists families_teacher_read on public.families;
drop policy if exists family_members_teacher_read on public.family_members;

drop function if exists private.is_family_parent(uuid);
drop function if exists public.create_child_for_parent(uuid, text);

alter table public.family_members drop constraint if exists family_members_role_teacher_only;
alter table public.family_members alter column role type text using role::text;
alter table public.family_members add constraint family_members_role_teacher_only check (role = 'teacher');
drop type if exists public.family_role;

create or replace function private.is_family_teacher(target_family_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id and fm.auth_user_id = auth.uid()
      and fm.role = 'teacher' and fm.is_active = true
  );
$$;
revoke all on function private.is_family_teacher(uuid) from public, anon;
grant execute on function private.is_family_teacher(uuid) to authenticated;

create policy families_teacher_read on public.families for select to authenticated using (private.is_family_teacher(id));
create policy family_members_teacher_read on public.family_members for select to authenticated using (private.is_family_teacher(family_id));
create policy child_profiles_teacher_read on public.child_profiles for select to authenticated using (private.is_family_teacher(family_id));
create policy devices_teacher_read on public.devices for select to authenticated using (private.is_family_teacher(family_id));
create policy device_policies_teacher_read on public.device_policies for select to authenticated using (private.is_family_teacher(family_id));
create policy audit_events_teacher_read on public.audit_events for select to authenticated using (private.is_family_teacher(family_id));

create or replace function public.create_family_for_user(p_user_id uuid, p_family_name text, p_display_name text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_family_id uuid; v_member_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user_id is null or char_length(trim(coalesce(p_family_name, ''))) not between 1 and 80
     or char_length(trim(coalesce(p_display_name, ''))) not between 1 and 80 then raise exception 'invalid input' using errcode = '22023'; end if;
  if exists (select 1 from public.family_members where auth_user_id = p_user_id and role = 'teacher' and is_active) then
    raise exception 'user already belongs to a teacher workspace' using errcode = '23505';
  end if;
  insert into public.families(name) values (trim(p_family_name)) returning id into v_family_id;
  insert into public.family_members(family_id, auth_user_id, role, display_name)
    values (v_family_id, p_user_id, 'teacher', trim(p_display_name)) returning id into v_member_id;
  insert into public.audit_events(family_id, actor_member_id, event_type, event_data)
    values (v_family_id, v_member_id, 'teacher_workspace.created', jsonb_build_object('workspaceName', trim(p_family_name)));
  return jsonb_build_object('family', jsonb_build_object('id', v_family_id, 'name', trim(p_family_name)),
    'member', jsonb_build_object('id', v_member_id, 'role', 'teacher'));
end;
$$;

create or replace function public.create_device_group_for_teacher(p_user_id uuid, p_group_name text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_family_id uuid; v_teacher_member_id uuid; v_group_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user_id is null or char_length(trim(coalesce(p_group_name, ''))) not between 1 and 80 then raise exception 'invalid input' using errcode = '22023'; end if;
  select fm.family_id, fm.id into v_family_id, v_teacher_member_id from public.family_members fm
   where fm.auth_user_id = p_user_id and fm.role = 'teacher' and fm.is_active order by fm.created_at asc limit 1;
  if v_family_id is null then raise exception 'teacher workspace not found' using errcode = 'P0002'; end if;
  insert into public.child_profiles(family_id, display_name) values (v_family_id, trim(p_group_name)) returning id into v_group_id;
  insert into public.audit_events(family_id, actor_member_id, subject_child_id, event_type, event_data)
    values (v_family_id, v_teacher_member_id, v_group_id, 'device_group.created', jsonb_build_object('groupName', trim(p_group_name)));
  return jsonb_build_object('group', jsonb_build_object('id', v_group_id, 'name', trim(p_group_name)));
end;
$$;

revoke all on function public.create_family_for_user(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_family_for_user(uuid, text, text) to service_role;
revoke all on function public.create_device_group_for_teacher(uuid, text) from public, anon, authenticated;
grant execute on function public.create_device_group_for_teacher(uuid, text) to service_role;
