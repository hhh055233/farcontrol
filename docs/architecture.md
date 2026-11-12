# Steve Control — architecture

## Product model

Steve Control is a school device-management system with one teacher/admin console for up to 50 explicitly enrolled devices. Windows computers and Android phones/tablets are the first remote-management targets; macOS and supported iOS/iPadOS management follow later.

Each classroom workspace has one teacher administrator. The teacher can use a phone, tablet or web dashboard to manage enrolled devices. Enrollment is visible and authorized on each managed device. The device user sees the school/teacher identity, invitation and requested permissions before joining. Any screen viewing or interactive remote session must show a clear active-session indicator and be stoppable locally. No hidden monitoring, covert collection or unrestricted access to arbitrary devices.

The detailed platform capability matrix, architecture additions, security requirements and phased acceptance criteria are in [multi-device-remote-control-roadmap.md](multi-device-remote-control-roadmap.md).

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
- Device credentials are issued once, stored in Android secure storage and revocable by the teacher; revocation clears the server-side credential hash and changes the device status.
- Commands are scoped to a device/workspace and have explicit lifecycle states and expiry.
- Current supported command is `show_notice`, a visible notice in the managed-device app. It is not arbitrary remote control.
- Device polling currently depends on the managed app being active. Background reliability and physical-device behavior require testing.
- Do not add arbitrary shell/script execution or hidden commands. Expand only through typed, allowlisted operations with permission checks, expiry, acknowledgement and audit events.

## Platform boundaries

- Windows: a future signed agent can support visible, consent-based remote desktop sessions, input and approved management actions after installation and authorization.
- Android: screen capture requires Android's system consent flow. Interactive control may require Accessibility approval or fully managed/device-owner provisioning. An ordinary app cannot silently control arbitrary apps.
- macOS: future support requires a signed agent and explicit Screen Recording and Accessibility permissions.
- iOS/iPadOS: no unrestricted third-party remote control of the interface. Limit support to platform-approved management and user-initiated sharing.

## Security

- Never ship the Supabase service-role key or other server secrets in web/mobile bundles.
- The server derives the teacher identity from a verified Supabase session; never trust client-provided roles or workspace IDs.
- Enforce RLS and tenant ownership on every read/write.
- Keep audit events for enrollment, command and permission changes.
- Use short-lived pairing codes, rate limits, hashed device credentials and revocation.
- Minimize student data and provide clear enrollment/disconnection information.
- During remote screen/control sessions, show a visible local indicator and provide a local stop control.
- Use per-device capabilities and permission state; never assume a device supports a command because its platform label matches.

## Current delivery state

The Supabase project, teacher authorization tables, RLS and Edge Functions are deployed. The web and Android clients have been connected to these services in the main branch. A successful Android debug/test APK build has been recorded, but it does not establish remote-control capability or classroom readiness.

Remaining work includes CI verification on the current main revision, physical-device enrollment/command tests, capability reporting, 50-device simulation, a Windows agent, and platform-approved screen-session implementations. Do not claim a capability is implemented until code, build validation and relevant physical-device tests pass.
