# Steve Control API contract (v1 draft)

This is a proposed contract for the first secure school-device vertical slice. It is a specification, not a claim that endpoints are deployed.

## Rules for every request
- Teacher endpoints require a valid authenticated teacher session and ownership of the relevant workspace.
- The server derives workspace_id and teacher_id from the authenticated session. A client cannot select another school's workspace by sending an ID.
- Device endpoints require a separate, revocable device credential; never accept a teacher access token as a device credential.
- Validate input on the server, use parameterized SQL, enforce request size limits and return generic authorization errors.
- Write an audit event in the same database transaction as every enrollment, policy or device-security change.
- Never return pairing-code hashes, device credential hashes, refresh tokens or internal database errors.

## Teacher workspace

### POST /api/v1/workspaces
Create the authenticated teacher's workspace. The caller becomes its sole administrator.

Request: { name: string }
Response: { workspace: { id, name }, administrator: { id, role: 'teacher' } }

### GET /api/v1/workspace/overview
Return only the authenticated teacher's workspace, enrolled devices, pending invitations, policy versions and report freshness metadata.

## Device enrollment

### POST /api/v1/workspace/pairing-codes
Create a short-lived, single-use device invitation. Only the workspace's teacher administrator may call this endpoint. Store only a keyed hash of the code and return the clear code once.

Request: { deviceLabel: string }
Response: { pairingCode, expiresAt }

### POST /api/v1/device-enrollments/redeem
Redeem a pairing code from the managed-device app only after showing the school/workspace name, teacher identity, requested permissions, data-sharing explanation and explicit confirmation.

Request: { pairingCode, deviceLabel, appVersion }
Response: { deviceId, deviceCredential, policyVersion }

The device credential is shown once and stored in secure device storage. The teacher can revoke it. Apply strict per-IP and per-code attempt limits.

## Device sync

### POST /api/v1/devices/{deviceId}/heartbeat
Authenticate with the device credential. Update last_seen_at and app version. Heartbeats are rate-limited and batched.

Request: { appVersion, appliedPolicyVersion, capabilities: string[] }
Response: { serverTime, latestPolicyVersion, shouldFetchPolicy }

### GET /api/v1/devices/{deviceId}/policy
Return the latest policy only for the authenticated device. Include a monotonically increasing version and updatedAt.

### POST /api/v1/devices/{deviceId}/reports
Submit a bounded, validated batch of permitted device reports. Verify device ownership, timestamp range, payload size and duplicate event IDs. Collect only data explained and authorized during enrollment.

## Teacher controls

### PUT /api/v1/devices/{deviceId}/policy
Validate a policy against the supported feature set for the enrolled Android app/API level. Increment policy version and create an audit event atomically.

Request: { expectedVersion, policy }
Response: { version, updatedAt, deliveryStatus: 'pending' | 'acknowledged' }

### DELETE /api/v1/devices/{deviceId}/enrollment
Revoke the device credential and stop future sync. Record the actor and reason in the audit log.

### GET /api/v1/workspace/audit-events
Return paginated, workspace-scoped events. Redact sensitive details and never expose credentials or pairing tokens.

## Error model
- 400: invalid request shape or unsupported policy value.
- 401: missing or invalid authentication.
- 403: authenticated user/device lacks permission.
- 404: resource absent or not visible to this workspace.
- 409: stale policy version, redeemed invitation or already-used pairing code.
- 429: rate limit exceeded; include Retry-After.
- 500: generic server error with a request ID; never expose SQL or secrets.

## First implementation slice
Implement teacher authentication, create workspace, generate/redeem device pairing codes, device heartbeat, workspace overview and device revocation. Keep feature enforcement out of scope until Android capability checks and device tests are complete.
