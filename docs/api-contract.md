# Steve Control API contract (v1 draft)

This is the contract for the first secure vertical slice. It is a specification, not a claim that these endpoints are deployed.

## Rules for every request
- Parent endpoints require a valid authenticated parent session and an active family membership with role parent.
- The server derives family_id and actor_member_id from the authenticated session. A client cannot select another tenant by sending a family_id.
- Device endpoints require a separate, revocable device credential; never accept a parent access token as a device credential.
- Validate input on the server, use parameterized SQL, enforce request size limits, and return generic auth errors that do not reveal whether another family's data exists.
- Write an audit event in the same database transaction as every policy, membership, pairing, or device-security change.
- Never return pairing-code hashes, device credential hashes, refresh tokens, or internal database errors.

## Parent and family

### POST /api/v1/families
Create the first family for the authenticated user. The server creates the family and adds the caller as a parent in one transaction.

Request: { name: string }
Response: { family: { id, name }, member: { id, role: 'parent' } }

### POST /api/v1/families/{familyId}/parent-invitations
Create a short-lived invitation for a second parent. The invitation is single-use, hashed at rest, rate-limited, and delivered through a verified channel. The accepting user becomes an equal parent.

Request: { invitedEmail: string }
Response: { invitationId, expiresAt }

### POST /api/v1/family-invitations/{token}/accept
Accept an invitation after authentication and email verification. The token is single-use and is never logged.

Response: { familyId, member: { id, role: 'parent' } }

## Child profile and device pairing

### POST /api/v1/children
Create a child profile within the caller's family.

Request: { nickname: string }
Response: { child: { id, nickname } }

### POST /api/v1/children/{childId}/pairing-codes
Create a short-lived, single-use pairing code. Only a parent in the same family can call this endpoint. Store only a keyed hash of the code. Return the clear code once.

Request: { deviceLabel: string }
Response: { pairingCode, expiresAt }

### POST /api/v1/device-enrollments/redeem
Redeem a pairing code from the child app after showing the family name, device label, data/permission explanations, and an explicit confirmation screen.

Request: { pairingCode, deviceLabel, appVersion }
Response: { deviceId, deviceCredential, policyVersion }

The device credential is shown once, stored in Android Keystore-backed storage, and can be revoked by a parent. Apply strict per-IP and per-code attempt limits.

## Device sync

### POST /api/v1/devices/{deviceId}/heartbeat
Authenticate with the device credential. Update last_seen_at and app version. Heartbeats are rate-limited and batched.

Request: { appVersion, appliedPolicyVersion, capabilities: string[] }
Response: { serverTime, latestPolicyVersion, shouldFetchPolicy }

### GET /api/v1/devices/{deviceId}/policy
Return the latest policy only for the authenticated device. Include a monotonically increasing version and updatedAt.

Response: { version, policy, updatedAt }

### POST /api/v1/devices/{deviceId}/reports
Submit a bounded, validated batch of permitted usage/report data. The server verifies device ownership, timestamp range, payload size, and duplicate event IDs.

Request: { batchId, events: [...] }
Response: { accepted, rejected, nextUploadAfter }

## Parent dashboard

### GET /api/v1/family/overview
Return only the authenticated parent's family, parent accounts, child profiles, enrolled devices, latest policy versions, and report freshness metadata.

### PUT /api/v1/children/{childId}/policy
Validate a policy against the supported feature set for the enrolled Android app/API level. Increment policy version and create an audit event atomically.

Request: { expectedVersion, policy }
Response: { version, updatedAt, deliveryStatus: 'pending' | 'acknowledged' }

### GET /api/v1/family/audit-events
Return paginated, tenant-scoped events. Redact sensitive details and do not expose credentials or pairing tokens.

## Error model
- 400: invalid request shape or unsupported policy value.
- 401: missing or invalid authentication.
- 403: authenticated user/device lacks permission.
- 404: resource absent or not visible to this tenant.
- 409: stale policy version, redeemed invitation, or already-used pairing code.
- 429: rate limit exceeded; include Retry-After.
- 500: generic server error with a request ID; never expose SQL or secrets.

## First implementation slice
Implement only: parent authentication, create family, invite/accept second parent, create child, create/redeem pairing code, device heartbeat, and family overview. Keep feature enforcement out of scope until Android capability checks and device tests are complete.