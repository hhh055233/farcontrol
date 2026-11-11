# Steve Control

Steve Control is an Android-first school device-management system.

## Product model
- Each classroom workspace has one teacher administrator.
- The teacher uses a phone, tablet or web dashboard to manage enrolled school devices.
- Devices join through a short-lived, single-use invitation and a visible confirmation on the device.
- The initial scale target is 1, 20 or 50 enrolled devices. Computer management is a later phase.
- No hidden monitoring or unrestricted remote control.

## Current implementation
- Supabase project is active and contains the teacher-only workspace schema, row-level security, pairing tables, teacher authorization and device-command queue.
- Supabase Edge Functions are deployed: `family-api`, `teacher-access-api`, `redeem-pairing`, and `device-command-api`.
- Web dashboard and Android app are connected to the Supabase project using client-safe publishable configuration.
- Google teacher sign-in, teacher access requests and admin approval flow are implemented in the deployed backend.
- Teacher dashboard supports classroom/device-group creation, one-time device pairing and sending a visible notice command to enrolled devices.
- The Android app includes teacher and managed-device flows, secure storage for device credentials and command polling.

## Important limits
- The only device command currently supported is a visible on-screen notice. This is not remote screen control, app blocking, installation control or full device management.
- A command is delivered only while the managed-device app is active and polling.
- Android capabilities beyond this require supported Android APIs, explicit permissions and/or fully managed device provisioning.
- Actual device enrollment and command delivery must be tested on physical devices before school deployment.
- The production database schema is managed by ordered migrations in `supabase/migrations/`. Do not run `database/schema.sql`; it is a pointer to the migration history.

## Repository
- `app/`: Next.js teacher dashboard.
- `apps/android/`: Expo Android app.
- `supabase/functions/`: Edge Function source matching deployed services.
- `supabase/migrations/`: source migrations currently recovered into the repository. The live Supabase project has additional applied migration versions whose source still needs to be reconciled before recreating the database from scratch.
- `docs/`: architecture and API contract.

## Android identity
- App name: Steve Control
- Expo slug: `steve-control`
- Android application ID: `com.stevecontrol.app`
- Deep-link scheme: `stevecontrol`

## Development
Web: `npm install && npm run dev`

Android: `cd apps/android && npm install && npx expo start`

CI runs web typecheck/build and Android TypeScript validation.
