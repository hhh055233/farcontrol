# Steve Family Android app

Android-first Expo / React Native application.

## Local setup

```bash
cd apps/android
npm install
cp .env.example .env
npx expo start
```

The app contains the public Supabase project URL and publishable key as safe client configuration defaults. You may override them with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never put a Supabase `service_role` or secret key in the mobile app.

## Implemented in this branch

- Hebrew RTL-oriented Android parent sign-up and sign-in screens.
- Supabase Auth with persistent local session storage via Expo SQLite.
- Deployed Supabase Edge Function `family-api`, with JWT verification enabled.
- Server actions: `create_family`, `create_child`, and `overview`.
- Parent can create one family and child profiles; the app can load those records.
- Server-side database RPCs create the family/member and child/member/audit records transactionally.
- RLS and function privileges prevent direct client writes and direct pairing-code access.

## Not yet implemented / not yet verified

- Second-parent invitation and acceptance.
- Child-device pairing, device credentials, heartbeat, and policy sync.
- Actual Android device controls, usage reports, location sharing, or notifications.
- Automated TypeScript check, APK build, installation, and real-device test. No APK has been built yet.
- End-to-end test using a real, verified parent account.

No device restrictions or hidden monitoring are active. Implement device capabilities only through documented Android APIs, visible permission flows, and transparent enrollment. Do not describe this as a completed parental-control app until each capability is implemented and tested.
