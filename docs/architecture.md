# Steve Control — architecture

## Product model
Steve Control is an Android-first school device-management system. Each classroom workspace has one teacher administrator. The teacher can use a phone, tablet or web dashboard to manage enrolled school phones and tablets. Initial target scale: 1, 20 or 50 devices; computer management is a later phase.

Enrollment is visible and authorized on each managed device. The device user sees the school/teacher identity, invitation and requested permissions before joining. No hidden monitoring, covert collection or unrestricted access to arbitrary devices.

## Live backend
The connected Supabase project is `gjopwszrjdcxhtflhbkj` and is active. The live database currently uses the normalized tables `families`, `family_members`, `child_profiles`, `devices`, `pairing_codes`, `device_policies`, `device_commands` and `audit_events`. Some table names retain their original internal naming; the authorization model was migrated to a single `teacher` role. In the product UI, these represent school workspaces, teacher membership, device groups and enrolled devices.

Row-level security is enabled. Privileged operations run through server-side Supabase Edge Functions using the service-role key stored only in Supabase function secrets. Client apps use only the public publishable key.

## Deployed Edge Functions
- `family-api`: teacher-authorized workspace overview, group creation, one-time pairing-code generation and visible notice command creation.
- `teacher-access-api`: verified Google sign-in, teacher access requests and allowlisted administrator approval/revocation.
- `redeem-pairing`: device-side one-time pairing redemption, rate limiting and device credential issuance.
- `device-command-api`: authenticated device polling, heartbeat and command acknowledgement.

## Device trust and commands
- Teacher sessions and device credentials are separate.
- Pairing codes are generated server-side, short-lived and single-use; only a hash is stored.
- Device credentials are issued once, stored in Android secure storage and revocable.
- Commands are scoped to a device/workspace and have explicit lifecycle states and expiry.
- Current supported command is `show_notice`, a visible notice in the managed-device app. It is not arbitrary remote control.
- Device polling currently depends on the managed app being active. Background reliability and physical-device behavior require testing.

## Android platform boundaries
An ordinary Android app cannot silently control arbitrary apps, block all installs or lock device settings. Further restrictions require supported APIs, explicit permissions and/or fully managed device-owner provisioning. Implement capabilities one at a time and test on supported Android versions and manufacturers.

## Security
- Never ship the Supabase service-role key or other server secrets in web/mobile bundles.
- The server derives the teacher identity from a verified Supabase session; never trust client-provided roles or workspace IDs.
- Enforce RLS and tenant ownership on every read/write.
- Keep audit events for enrollment, command and permission changes.
- Use short-lived pairing codes, rate limits, hashed device credentials and revocation.
- Minimize student data and provide clear enrollment/disconnection information.

## Current delivery state
The Supabase project, teacher authorization tables, RLS and Edge Functions are deployed. The web and Android clients have been connected to these services in the main branch. Remaining work includes CI verification, installable APK generation, real-device enrollment/command tests, stronger background delivery, and implementation/testing of any additional Android management capability.
