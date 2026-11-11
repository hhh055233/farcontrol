create policy pairing_codes_explicit_deny on public.pairing_codes
  for all to anon, authenticated
  using (false)
  with check (false);