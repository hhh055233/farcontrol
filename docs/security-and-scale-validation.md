# Steve Control — Security and multi-device validation

Last reviewed: 2026-11-11
Branch: `feature/secure-family-backend`

## Current security review

### Verified

- All inspected tables in the exposed `public` schema have row-level security enabled.
- Teacher read policies scope family data through `private.is_family_teacher(family_id)` (or the family ID for `families`).
- `pairing_codes` and `device_commands` explicitly deny direct `anon` and `authenticated` table access.
- The teacher allowlist has no direct `anon` or `authenticated` table grant; it is read by the server-side service role. Its RLS-without-policy advisor notice is therefore intentional, not a reason to add a public policy.
- Sensitive RPCs for pairing, teacher approval, and workspace creation are executable only by `service_role`; the reviewed teacher access Edge Function authenticates the user and checks administrator status before invoking administrative RPCs.
- The device command endpoint validates a device credential by hashing it and requires an active device. Polling claims a queued command with a conditional status update to avoid two simultaneous polls both receiving the same command.
- Teacher notice requests are restricted to the teacher's own family and group, active devices, and at most 50 selected devices per request.
- Pairing codes expire after 10 minutes and the pairing function rate-limits attempts by hashed client IP.

### Findings and remediation

1. **Action required in Supabase Auth:** leaked-password protection is disabled. Enable it in the Supabase Dashboard under Authentication password security. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
2. **Expected informational notice:** `public.teacher_email_allowlist` has RLS enabled but no policies. Keep it server-only; do not add an `anon` or `authenticated` policy.
3. **Pairing rollout constraint:** the pairing rate limit is 12 attempts per IP per 15-minute window. A school network may put many devices behind one public IP, so enrolling 50 devices at once can hit this limit. Do not simply remove rate limiting; design and test a safe bulk-enrollment policy (per-code limits plus a carefully bounded network limit) before a school-wide rollout.
4. **No production load test has been run.** The database currently has zero families, members, devices, and device commands. A real 50-device test requires a separate staging project and test devices/credentials.

## Multi-device capacity notes

- The teacher API can queue a visible notice for up to 50 active devices in one group/request.
- The device command polling query has an index on `(device_id, status, created_at)`.
- Credential lookup previously had no index. Added a unique partial index on `public.devices(credential_hash)` where the value is not null. This both prevents duplicate credential hashes and supports fast device authentication.
- Added an index on `private.teacher_join_requests(reviewed_by)` to cover the previously unindexed foreign key.
- Query planning confirms the credential lookup uses `devices_credential_hash_unique_idx` and the polling lookup uses `device_commands_device_status_idx`. These are planner checks, not a concurrent load test.
- Device polling is currently foreground-only. The current implementation does not guarantee command delivery while the app is backgrounded or closed.

## Required staging acceptance test

Use a dedicated staging Supabase project and staging dashboard. Do not run a load test against real student devices or production data.

| Scenario | Target | Pass condition |
|---|---:|---|
| Device enrollment | 10, 20, then 50 | All devices pair; rate limiting remains effective without blocking legitimate batch enrollment |
| Teacher overview | 10, 20, then 50 active devices | Correct device/group counts; no cross-family data |
| Notice fan-out | 10, 20, then 50 devices | Exactly one queued command per selected active device; no commands for unselected or revoked devices |
| Concurrent polling | 10, 20, then 50 clients | Each command is claimed by only one poll; no duplicate display |
| Acknowledgement | 10, 20, then 50 clients | Each acknowledgement updates only the matching device's delivered command |
| Revocation | During each scenario | Revoked device credentials are rejected and cannot poll or acknowledge |
| Tenant isolation | Two separate teacher workspaces | Each teacher can read and command only their own workspace's devices |

Record request rate, p50/p95/p99 latency, error rate, database CPU/connection use, and duplicate/missing command counts. Do not declare 50-device readiness until the 50-client staging scenario passes.

## Remaining hardening

- Enable leaked-password protection in Supabase Auth.
- Revisit the pairing rate-limit design for legitimate school-wide enrollment while retaining brute-force protection.
- Run the staging acceptance test above with 50 independently enrolled test devices.
- Test foreground/background transitions and Android process restarts on physical Android devices.
- Review dependency advisories using the repository's actual lockfile and CI dependency-audit output before release.
