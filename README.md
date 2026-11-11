# Steve Control

Steve Control is an Android-first school device-management project.

## Product model
- One teacher is the sole administrator of a classroom workspace in the initial version.
- The teacher can manage enrolled school phones and tablets from the teacher's own phone or tablet.
- The initial target is to support 1, 20 or 50 enrolled devices; computer management is a later phase.
- Each device must be enrolled transparently. The person using it sees the school/teacher identity, requested permissions and data-sharing explanation, and explicitly confirms enrollment on that device.
- No hidden monitoring, covert data collection or unrestricted remote control.

## Repository
- `app/`: Next.js teacher dashboard prototype.
- `apps/android/`: Expo Android device-enrollment prototype.
- `database/schema.sql`: draft PostgreSQL schema for teacher workspaces and enrolled devices.
- `docs/`: architecture and API contract drafts.

## Current status
The web dashboard and Android screen are visual/local prototypes. Authentication, secure pairing, API endpoints, device sync, real policy enforcement and APK builds are not implemented yet. Demo actions do not control real devices.

## Android identity
- App name: Steve Control
- Expo slug: `steve-control`
- Android application ID: `com.stevecontrol.app`

## Safety and platform limits
Android capabilities depend on OS version, manufacturer, explicit permissions, supported managed-device provisioning and applicable platform policies. An ordinary app cannot silently control arbitrary apps or devices. Features must be implemented and tested individually, with clear user-facing permission and revocation flows.
