# Steve Family — architecture for 100+ families

## Product boundary
Steve Family is an Android-first family-management product. The parent and child experiences are installed Android apps. The existing Next.js site remains the web-based parent dashboard/admin surface; it is not the child-device agent.

The first production milestone is a secure, usable family system, not a promise of every parental-control feature. All device enrollment is visible and requires an authorized adult and the device user's appropriate participation. No hidden tracking, covert collection, accessibility-service abuse, or bypass of Android security controls.

## Scale target
The initial service target is 100 families, with room to grow. 100 families is not a special infrastructure threshold: a modest managed PostgreSQL database and stateless API are sufficient if queries are indexed and tenant boundaries are enforced. Capacity must be verified with load tests before public launch.

Initial planning assumptions (not measured guarantees):
- 100 families, average 2 parents + 2 children = about 400 member records.
- Up to 400 enrolled Android devices.
- Device check-ins are batched and rate-limited; avoid a request every few seconds.
- Keep the API stateless; store durable state in PostgreSQL.
- Use background jobs for notifications and report aggregation if/when volume requires them.

## Logical architecture
1. Android parent app: family overview, child profiles, rules, approval queue, reports, account/security settings.
2. Android child app: transparent enrollment, device status, permission explanation, policy sync, app-usage reporting where Android grants access.
3. Next.js parent web dashboard: optional companion surface; all controls call the same API.
4. API: authentication, family authorization, pairing, policy versioning, device check-ins, audit events.
5. PostgreSQL: tenant-scoped records with family_id, indexes, and row-level security.
6. Push delivery: FCM for notifications; never treat a push as the source of truth. Device fetches the current policy over authenticated TLS.

## Tenancy and roles
- A family is the tenant boundary.
- A family can have two or more parent accounts; both parents receive the same parent role and equivalent permissions.
- Child profiles are not parent administrators.
- Every query and mutation must prove membership in the relevant family. Never trust a client-supplied family_id alone.
- A parent may invite another parent or add a child profile. Invitation and pairing tokens are random, short-lived, single-use, and stored hashed.
- A device belongs to one child profile and one family. Re-enrollment revokes the old device credential.

## Authentication and device trust
- Use a managed identity provider or vetted passwordless/OIDC flow; do not store plaintext passwords.
- Android parent sessions use short-lived access tokens and rotating refresh tokens stored in Android Keystore-backed storage.
- Device credentials are separate from parent login credentials and can be revoked independently.
- Pairing codes are generated server-side, expire quickly, are rate-limited, and are redeemed only after a visible confirmation flow.
- All traffic uses HTTPS. Secrets stay server-side. Never place service-role database keys in the Android app or browser bundle.

## Policy and reporting
- Policies are versioned. Parent changes create an immutable audit event and increment the child's policy version.
- Child devices periodically fetch the latest policy and acknowledge the version applied.
- Reports distinguish measured data from unavailable data; do not fabricate offline usage.
- Keep the minimum data needed, set retention periods, and expose deletion/export controls.
- Location sharing is off by default and requires explicit, revocable permission and a visible indicator.

## Android capability reality
Android's standard app sandbox does not allow one ordinary app to silently control another app or block all installs. Usage reporting, location, notifications, web filtering, and device restrictions each have separate permissions, APIs, policy requirements, and Play policy constraints. Device-owner / managed-device capabilities require an explicit supported provisioning flow. Features will be shipped only after confirming API level, manufacturer behavior, Play policy, and consent UX. The app will not claim Family Link parity until verified.

## Deployment and operations
- Web/API can run on Vercel; persistent data belongs in managed PostgreSQL, not serverless local files.
- Add structured logs with request IDs, redacting tokens and child data.
- Add database backups, migrations, health checks, rate limits, and alerting before production.
- Enforce tenant isolation with both application authorization and PostgreSQL RLS.
- Test with at least 100 synthetic families and concurrent device check-ins before launch.

## Delivery stages
1. Data model, tenant isolation, auth and family membership.
2. Parent Android app and child Android enrollment shell.
3. Secure pairing and device heartbeat.
4. Policy sync, audit trail and approval workflow.
5. Android features one by one, with real-device tests and policy review.
6. Load, privacy, security and recovery testing; then controlled beta.

## Current state
This document is an engineering plan. The current Next.js deployment is still a visual prototype; it does not yet contain these production services or Android applications.