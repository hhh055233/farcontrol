create index if not exists child_profiles_family_id_idx on public.child_profiles(family_id);
create index if not exists devices_child_family_idx on public.devices(child_profile_id, family_id);
create index if not exists device_policies_child_family_idx on public.device_policies(child_profile_id, family_id);
create index if not exists device_policies_creator_family_idx on public.device_policies(created_by_member_id, family_id);
create index if not exists device_policies_family_id_idx on public.device_policies(family_id);
create index if not exists pairing_codes_child_family_idx on public.pairing_codes(child_profile_id, family_id);
create index if not exists pairing_codes_creator_family_idx on public.pairing_codes(created_by_member_id, family_id);
create index if not exists audit_events_actor_family_idx on public.audit_events(actor_member_id, family_id);
create index if not exists audit_events_subject_family_idx on public.audit_events(subject_child_id, family_id);