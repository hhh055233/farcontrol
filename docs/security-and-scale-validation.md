# Steve Control — Security and 30-device validation

Last reviewed: 2026-11-11
Branch: `feature/secure-family-backend`

## Current security review

### Verified

- All inspected tables in the exposed `public` schema have row-level security enabled.
- Teacher read policies scope family data through `private.is_family_teacher(family_id)` (or the family ID for `families`).
- `pairing_codes` and `device_commands` explicitly deny direct `anon` and `authenticated` table access.
- The teacher allowlist has no direct `anon` or `authenticated` table grant; it is read by the server-side service role. Its RLS-without-policy advisor notice is intentional; do not add a public policy.
- Sensitive RPCs for pairing, teacher approval, and workspace creation are executable only by `service_role`; the reviewed teacher access Edge Function authenticates the user and checks administrator status before invoking administrative RPCs.
- The device command endpoint hashes device credentials and requires an active device. Polling claims a queued command with a conditional status update to prevent two simultaneous polls from both receiving the same command.
- Teacher notice requests are restricted to the teacher's own family/group and active devices. The API currently accepts a selection of up to 50 devices; operational acceptance target is 30.
- Pairing codes are one-time, expire after 10 minutes, and pairing attempts are rate-limited by hashed client IP.

### Findings and remediation

1. **Action required in Supabase Auth:** leaked-password protection is still disabled. Enable it in the Supabase Dashboard under Authentication → Password Security. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
2. **Expected informational notice:** `public.teacher_email_allowlist` has RLS enabled but no policies. Keep it server-only; do not add an `anon` or `authenticated` policy.
3. **Pairing rate limit adjusted:** the per-IP window is now 45 attempts per 15 minutes. This allows one 30-device enrollment batch plus a limited retry margin, while retaining a firm IP-based limit. It is not a bulk-enrollment bypass.
4. **No concurrent load test has been run.** Production currently has zero families, members, devices, and device commands. A real 30-device test requires a separate staging project and 30 test credentials/devices.

## Multi-device capacity notes

- Teacher API can queue a visible notice for up to 50 active devices in one request; the acceptance target for this project is 30.
- Device command polling is indexed on `(device_id, status, created_at)`.
- Added a unique partial index on `public.devices(credential_hash)` where the value is not null. This prevents duplicate credential hashes and supports device authentication lookup.
- Added an index on `private.teacher_join_requests(reviewed_by)` for the previously unindexed foreign key.
- Query planning confirms credential lookup uses `devices_credential_hash_unique_idx` and command polling uses `device_commands_device_status_idx`. These are planner checks, not a concurrent load test.
- Device polling remains foreground-only. Command delivery while the app is backgrounded or closed is not guaranteed.

## Required staging acceptance test

Run only against a dedicated staging Supabase project and staging dashboard. Do not load-test real student devices or production data. Use 30 independently paired test devices and separate test teacher workspaces.

| Scenario | Target | Pass condition |
|---|---:|---|
| Device enrollment | 30 devices behind one shared NAT/IP | All legitimate pairings complete within the 15-minute window; invalid attempts still hit the 45/IP limit |
| Teacher overview | 30 active devices | Correct group/device counts; no cross-family data |
| Notice fan-out | 30 devices | Exactly one queued command per selected active device; no commands for unselected or revoked devices |
| Concurrent polling | 30 clients at once | Each command is claimed by only one poll; no duplicate display |
| Acknowledgement | 30 clients | Each acknowledgement updates only the matching device's delivered command |
| Revocation | During polling | Revoked credentials are rejected and cannot poll or acknowledge |
| Tenant isolation | Two separate teacher workspaces | Each teacher can read and command only their own workspace's devices |

Record request rate, p50/p95/p99 latency, error rate, database CPU/connection use, and duplicate/missing command counts. Do not declare 30-device readiness until all scenarios pass.

## Remaining hardening

- Enable leaked-password protection in Supabase Auth (manual Dashboard setting; the available project integration cannot change this Auth setting).
- Create or designate a staging project and run the 30-device acceptance test with independent test credentials.
- Test foreground/background transitions and Android process restarts on physical Android devices.
- Review dependency advisories against the actual lockfile/CI audit output before release. The repository root has no `package-lock.json`, so do not infer the exact vulnerable packages from the previous Render warning alone.
