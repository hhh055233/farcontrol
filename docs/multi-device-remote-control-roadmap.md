# Steve Control — multi-device remote management roadmap

## Product target

Build one teacher/admin console for up to 50 explicitly enrolled devices across Android phones/tablets and Windows, with later support for macOS and iOS/iPadOS where platform policy allows. The admin can select one device or a group, issue approved actions, and see per-device delivery/result status.

The target is not covert access. Every device must be enrolled with a visible invitation and clear confirmation. Remote viewing/control must show an active-session indicator, be limited to authorized administrators, be auditable, and be stoppable from the managed device.

## Current verified baseline

- Next.js web dashboard and Expo Android app exist in this repository.
- Supabase Auth, teacher authorization, one-time pairing, device credentials, command queue and revocation are implemented.
- The current command implementation supports a visible notice only.
- Device polling currently depends on the managed app being active.
- A successful Android test APK build exists, but a successful build does not prove remote-control features.
- There is no Windows/macOS agent or remote screen-control implementation in the current baseline.

## Platform capability plan

| Platform | Planned supported scope | Constraints |
|---|---|---|
| Windows | Visible remote session, screen view, keyboard/mouse input, approved app launch, file transfer, device health | Install a signed agent; require an authenticated admin session and visible local consent/session indicator. |
| Android | Enrollment, inventory, visible notices, approved app launch where allowed, screen sharing and supported interactive control | Screen capture requires Android's system consent flow. Interactive control may require accessibility approval or managed-device/device-owner provisioning. No silent control or hidden collection. |
| macOS | Screen view and remote input, approved app launch, file transfer | Requires a signed agent and explicit macOS Screen Recording / Accessibility permissions. |
| iOS/iPadOS | Device inventory and supported MDM controls; user-initiated screen sharing where available | No unrestricted third-party remote control of the iOS interface. |

## Architecture

1. Admin console — responsive Next.js dashboard; one teacher/admin identity, device inventory, groups, sessions, commands and audit history.
2. Control plane — Supabase Auth + Postgres/RLS + Edge Functions for identity, enrollment, authorization, command dispatch, revocation and audit.
3. Device agents — separate native agents for Windows and Android; later macOS. Agents use per-device credentials, send heartbeats and advertise explicit capabilities.
4. Remote-session transport — WebRTC for interactive screen/audio/video transport where supported; signaling and session authorization remain in the control plane. Do not relay screen data through ordinary database rows.
5. Updates — signed, versioned releases; staged rollout, health checks, rollback and per-device update status.

## Required data model additions

- device_capabilities: device ID, capability name, supported state, permission state, agent version, last reported time.
- remote_sessions: device ID, administrator ID, start/end time, session state, consent state and audit metadata.
- device_commands: retain typed allowlisted commands, expiry, idempotency key, delivery/acknowledgement status and bounded result.
- agent_releases: platform, version, signed artifact metadata, rollout channel and minimum supported version.

All records must be scoped to the teacher/workspace. RLS must be enabled on exposed tables. Privileged writes remain server-side. Never trust a role, device ID or workspace ID supplied by an untrusted client without deriving and checking ownership from the authenticated session.

## Command and session safety requirements

- No arbitrary shell command, arbitrary script execution, hidden persistence, stealth mode, credential collection, or silent screen capture.
- Use a strict allowlist of typed actions; each action has a schema, permission requirement, expiry and audit event.
- Pair devices through short-lived single-use codes and explicit local confirmation.
- Require a visible, user-stoppable indicator during screen viewing or interactive control.
- Use TLS and authenticated, short-lived session tokens; never embed service-role keys in clients.
- Rate-limit pairing and commands; revoke device credentials immediately when access is withdrawn.
- File transfer must be user-visible, scoped, size-limited and audited.
- Group actions must report success/failure per device and must not imply success before acknowledgement.

## Delivery phases and acceptance criteria

### Phase 0 — harden the existing baseline
- Reconcile migrations with the live Supabase project before schema changes.
- Run CI and build the Android test APK from the current main branch.
- Test teacher sign-in, invitation redemption, credential storage, notice delivery, acknowledgement and revocation on physical devices.
- Confirm 50-device inventory and command fan-out with simulated devices before claiming 50-device production readiness.

### Phase 1 — device inventory and capabilities
- Normalize platform identifiers and agent versions.
- Add capability reporting and online/offline/last-seen state.
- Add per-device command history and per-device results.
- Add explicit device groups and group selection in the dashboard.

### Phase 2 — Windows agent
- Create a signed Windows service/desktop agent with visible installation and pairing.
- Implement heartbeat, capability reporting and a narrow allowlist of approved actions.
- Add consent-based remote screen sessions and input only after the session UX and audit controls are in place.
- Test on clean Windows 10/11 machines and verify uninstall/revocation.

### Phase 3 — Android expansion
- Add platform-supported screen-sharing consent flow.
- Add only Android actions permitted by the granted permissions and device provisioning mode.
- Test on multiple Android versions and manufacturers; document unsupported capabilities.

### Phase 4 — macOS and iOS/iPadOS
- Add a separately signed macOS agent and permission onboarding.
- Add iOS/iPadOS inventory and MDM integrations; do not promise unrestricted remote input.

### Phase 5 — scale and reliability
- Load-test 50 simulated devices, reconnect storms and command bursts.
- Add backoff, idempotency, bounded queues, monitoring and staged signed updates.
- Run physical-device acceptance tests before any classroom deployment.

## Release gates

A feature is labelled implemented only after code, CI/build validation, permission review and physical-device tests pass. A planned capability must remain labelled planned until then. The 50-device target is a capacity goal, not a claim of current live capacity.
