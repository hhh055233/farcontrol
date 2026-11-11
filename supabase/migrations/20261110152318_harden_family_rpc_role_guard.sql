create or replace function public.create_family_for_user(
  p_user_id uuid, p_family_name text, p_display_name text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_family_id uuid; v_member_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id is null
     or char_length(trim(coalesce(p_family_name, ''))) not between 1 and 80
     or char_length(trim(coalesce(p_display_name, ''))) not between 1 and 80 then
    raise exception 'invalid input' using errcode = '22023';
  end if;
  if exists (select 1 from public.family_members
    where auth_user_id = p_user_id and role = 'parent'::public.family_role and is_active) then
    raise exception 'user already belongs to a family' using errcode = '23505';
  end if;
  insert into public.families(name) values (trim(p_family_name)) returning id into v_family_id;
  insert into public.family_members(family_id, auth_user_id, role, display_name)
    values (v_family_id, p_user_id, 'parent'::public.family_role, trim(p_display_name))
    returning id into v_member_id;
  insert into public.audit_events(family_id, actor_member_id, event_type, details)
    values (v_family_id, v_member_id, 'family.created', jsonb_build_object('familyName', trim(p_family_name)));
  return jsonb_build_object('family', jsonb_build_object('id', v_family_id, 'name', trim(p_family_name)),
    'member', jsonb_build_object('id', v_member_id, 'role', 'parent'));
end;
$$;

create or replace function public.create_child_for_parent(p_user_id uuid, p_nickname text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_family_id uuid; v_parent_member_id uuid; v_child_member_id uuid; v_child_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id is null or char_length(trim(coalesce(p_nickname, ''))) not between 1 and 80 then
    raise exception 'invalid input' using errcode = '22023';
  end if;
  select fm.family_id, fm.id into v_family_id, v_parent_member_id
  from public.family_members fm
  where fm.auth_user_id = p_user_id and fm.role = 'parent'::public.family_role and fm.is_active = true
  order by fm.created_at asc limit 1;
  if v_family_id is null then raise exception 'family not found' using errcode = 'P0002'; end if;
  insert into public.family_members(family_id, auth_user_id, role, display_name)
    values (v_family_id, gen_random_uuid(), 'child'::public.family_role, trim(p_nickname))
    returning id into v_child_member_id;
  insert into public.child_profiles(family_id, member_id, nickname)
    values (v_family_id, v_child_member_id, trim(p_nickname)) returning id into v_child_id;
  insert into public.audit_events(family_id, actor_member_id, subject_child_id, event_type, details)
    values (v_family_id, v_parent_member_id, v_child_id, 'child.created', jsonb_build_object('nickname', trim(p_nickname)));
  return jsonb_build_object('child', jsonb_build_object('id', v_child_id, 'nickname', trim(p_nickname)));
end;
$$;
