# Steve Control API contract

The deployed backend is implemented as Supabase Edge Functions. This document describes the current supported contract; internal database names may retain legacy family/child labels while the product model is teacher/workspace/device.

## Authentication
- Teacher operations require a valid Supabase Auth access token.
- Teacher authorization is checked server-side against the teacher membership/allowlist; client-supplied role values are ignored.
- Device operations use a separate random device credential. A teacher access token is not a device credential.
- Service-role credentials remain in Supabase Edge Function secrets only.

## Edge Function: `family-api`
Authenticated teacher operations:
- `overview`: load the teacher's workspace, device groups, devices, activity and command statuses.
- `create_family`: create the teacher's workspace.
- `create_child`: create a device group/class group.
- `create_pairing_code`: generate a short-lived single-use invitation for a device group. The clear code is returned once; only its hash is stored.
- `send_notice`: queue a visible notice for active devices in a group or selected device IDs.

Every request is checked against the authenticated teacher's workspace. Unknown fields/actions are rejected. Request bodies are size-limited and writes are audited.

## Edge Function: `teacher-access-api`
Requires verified Google identity:
- `submit_request`: submit a teacher access request.
- `list_requests`: list teacher requests for an allowlisted administrator.
- `review_request`: approve, reject or revoke a teacher request.

The server verifies the Supabase JWT and Google provider identity. The administrator allowlist is stored server-side.

## Edge Function: `redeem-pairing`
Public device enrollment endpoint:
- Accepts a one-time invitation code and device label.
- Applies request-size checks and rate limiting.
- Validates the code hash, expiry and unused state transactionally.
- Issues a random device credential once and stores only its hash.
- Returns the device ID and workspace/group identity only after successful redemption.

The Android app must show the enrollment context and require explicit user confirmation before calling this endpoint.

## Edge Function: `device-command-api`
Requires a valid device credential:
- `poll`: claim at most one queued command for that device and update last-seen time.
- `acknowledge`: mark a delivered command as acknowledged or failed.

Only the device's own commands can be retrieved or acknowledged. The current command type is `show_notice`. Commands expire and are audited. No arbitrary shell, app launch, hidden collection or unrestricted remote-control command is supported.

## Error handling
The functions return bounded JSON errors and avoid exposing database internals or credentials. Clients should show a generic failure message, preserve user input where safe and retry only transient failures with backoff.

## Remaining implementation and verification
- Confirm end-to-end teacher Google sign-in and access approval on the production domain.
- Verify pairing and device credential storage on physical Android devices.
- Verify notice delivery and acknowledgement with the app active and after reconnect.
- Add background delivery only through supported Android mechanisms and test battery restrictions.
- Do not claim full device management until each additional capability is implemented, authorized and tested.
