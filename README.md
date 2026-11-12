# Steve Control

Steve Control is a school device-management system with one teacher/admin console for up to 50 explicitly enrolled devices. The target platforms are Windows computers and Android phones/tablets first, followed by macOS and supported iOS/iPadOS management.

## Product model
- Each classroom workspace has one teacher administrator.
- The teacher uses a phone, tablet or web dashboard to manage enrolled school devices.
- Devices join through a short-lived, single-use invitation and a visible confirmation on the device.
- The initial capacity target is 1, 20 or 50 enrolled devices.
- The product roadmap includes Windows and Android first, then macOS and supported iOS/iPadOS management.
- Remote viewing/control must be visible to the device user, authorized, auditable and stoppable locally. No hidden monitoring or unrestricted access to arbitrary devices.

## Current implementation
- Supabase project is active and contains the teacher-only workspace schema, row-level security, pairing tables, teacher authorization and device-command queue.
- Supabase Edge Functions are deployed: `family-api`, `teacher-access-api`, `redeem-pairing`, and `device-command-api`.
- Web dashboard and Android app are connected to the Supabase project using client-safe publishable configuration.
- Google teacher sign-in, teacher access requests and admin approval flow are implemented in the deployed backend.
- Teacher dashboard supports classroom/device-group creation, one-time device pairing and sending a visible notice command to enrolled devices, and revoking device credentials.
- The Android app includes teacher and managed-device flows, secure storage for device credentials and command polling.

## Important limits
- The only device command currently supported is a visible on-screen notice. This is not remote screen control, app blocking, installation control or full device management.
- A command is delivered only while the managed-device app is active and polling.
- There is currently no Windows/macOS device agent or remote desktop implementation in this repository.
- Android capabilities beyond the existing notice require supported Android APIs, explicit permissions and/or fully managed device provisioning.
- iOS/iPadOS do not permit unrestricted third-party remote control of the interface; support will be limited to platform-approved management and user-initiated sharing.
- Actual device enrollment and command delivery must be tested on physical devices before school deployment.

## Roadmap
See [the multi-device remote-control roadmap](docs/multi-device-remote-control-roadmap.md) for architecture, security requirements, platform boundaries, delivery phases and acceptance criteria.

## Repository
- `app/`: Next.js teacher dashboard.
- `apps/android/`: Expo Android app.
- `supabase/functions/`: Edge Function source matching deployed services.
- `supabase/migrations/`: source migrations currently recovered into the repository. The live Supabase project has additional applied migration versions whose source still needs to be reconciled before recreating the database from scratch.
- `docs/`: architecture, API contract and implementation roadmap.

## Android identity
- App name: Steve Control
- Expo slug: `steve-control`
- Android application ID: `com.stevecontrol.app`
- Deep-link scheme: `stevecontrol`

## Development
Web: `npm install && npm run dev`

Android: `cd apps/android && npm install && npx expo start`

CI runs web typecheck/build, Android TypeScript validation and Supabase Edge Function typechecking.

## Android test APK release
- Open the GitHub Actions workflow named **Steve Control Android APK** and use **Run workflow** to build from the current `main` branch, or push a commit whose message contains `[build-apk]`.
- Download the `steve-control-android-debug-apk` artifact from the completed workflow run.
- This workflow creates a **debug/test APK**, not a Play Store production-signed release. Install and test it on a trusted Android device; do not distribute it as a production release.
- Before any school rollout, verify Google sign-in, teacher authorization, device consent/pairing, visible notice delivery, and device revocation on physical devices.
