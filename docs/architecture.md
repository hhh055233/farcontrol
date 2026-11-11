# Steve Control — school device management architecture

## Product boundary
Steve Control is an Android-first school device-management system. A teacher is the sole administrator of a classroom workspace and can manage 1, 20, or 50 enrolled phones/tablets from the teacher's own phone or tablet. Computer management may be added later. The current Next.js site is a visual prototype; it is not a production management console.

All enrollment is visible and authorized on each managed device. The device user sees who is requesting enrollment, what data may be shared, which permissions are requested, and how to disconnect. No hidden tracking, covert collection, accessibility-service abuse, or bypass of Android security controls.

## Logical architecture
1. Teacher app/dashboard: class overview, enrolled devices, invitations, policy drafts, requests, audit history and account security.
2. Managed-device app: transparent enrollment, permission explanations, device status, policy sync and only those reports supported by Android and explicitly authorized.
3. Optional web dashboard: same teacher-only authorization model and API.
4. API: teacher authentication, school/class authorization, one-time pairing, policy versioning, device check-ins and audit events.
5. PostgreSQL: tenant-scoped school/class records, indexes and row-level security.
6. Push delivery: notifications only; device fetches current policy over authenticated TLS.

## Tenancy and roles
- A classroom workspace is the tenant boundary.
- Exactly one teacher account is the workspace administrator in the initial product model.
- Student/device users are not administrators and do not receive teacher credentials.
- Every query and mutation must prove that the authenticated teacher owns the workspace. Never trust a client-supplied workspace_id alone.
- A teacher may invite/enroll devices. Enrollment tokens are random, short-lived, single-use and stored hashed.
- A device belongs to one workspace. Re-enrollment revokes the old device credential.
- Additional teachers, co-administrators and computer management are future features, not current roles.

## Authentication and device trust
- Use a managed identity provider or vetted passwordless/OIDC flow; do not store plaintext passwords.
- Teacher sessions use short-lived access tokens and rotating refresh tokens stored securely.
- Device credentials are separate from teacher login credentials and can be revoked independently.
- Pairing codes are generated server-side, expire quickly, are rate-limited and redeemed only after a visible confirmation flow on the device.
- All traffic uses HTTPS. Secrets stay server-side. Never place service-role database keys in the Android app or browser bundle.

## Policy and reporting
- Policies are versioned. Teacher changes create immutable audit events and increment policy versions.
- Devices periodically fetch the latest policy and acknowledge the version applied.
- Reports distinguish measured data from unavailable data; do not fabricate offline usage.
- Collect the minimum data needed, define retention periods and expose deletion/export controls.
- Location sharing is off by default and requires separate explicit, revocable permission and a visible indicator.

## Android capability reality
Android does not allow an ordinary app to silently control another app or block all installs. Usage reporting, location, notifications, web filtering and device restrictions each have separate permissions, APIs, device-owner provisioning requirements and Play policy constraints. Device-owner capabilities require an explicit supported provisioning flow and appropriate school/device authorization. Ship features only after API-level, manufacturer, policy and real-device testing. Never promise unrestricted remote control.

## Deployment and operations
- Web/API can run on Vercel; persistent data belongs in managed PostgreSQL, not serverless local files.
- Add structured logs with request IDs, redacting tokens and student data.
- Add backups, migrations, health checks, rate limits and alerting before production.
- Enforce tenant isolation with both application authorization and PostgreSQL RLS.
- Test with 1, 20 and 50 enrolled devices and concurrent check-ins before launch.

## Delivery stages
1. Teacher authentication and single-admin workspace model.
2. Teacher dashboard and transparent Android enrollment shell.
3. Secure one-time pairing and device heartbeat.
4. Policy sync, audit trail and request workflow.
5. Android capabilities one by one, with real-device tests and policy review.
6. Privacy, security, recovery and load testing; then controlled school pilot.

## Current state
The web and Android screens are prototypes. Accounts, API, pairing, device sync and actual device management are not yet implemented. UI labels do not imply that a device is currently controlled.
