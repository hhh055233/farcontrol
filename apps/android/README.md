# Steve Family Android app

Android-first Expo / React Native application.

## Local setup

```bash
cd apps/android
npm install
cp .env.example .env
# Fill the two EXPO_PUBLIC_SUPABASE_* values from the Supabase project Connect panel.
npx expo start
```

The app uses Supabase Auth for parent email/password sign-up and sign-in. A publishable key is suitable for the client; never put a Supabase `service_role` or secret key in this app.

## Implemented in this branch

- Hebrew RTL-oriented Android sign-in and account creation screens.
- Supabase client initialization with persistent local session storage via Expo SQLite.
- Explicit unavailable-state handling when Supabase environment values are missing.
- Parent-only database read policies and private authorization helper in the schema.

## Not yet implemented / not yet verified

- The linked Supabase project currently reports `INACTIVE`; database operations and authentication cannot be verified until the project is active.
- Family creation, second-parent invitation, child profile creation, one-time pairing, and device credential issuance.
- Edge Functions/API endpoints, rate limiting, and end-to-end audit transactions.
- Child companion flow, policy sync, device usage reporting, location sharing, notifications, or device restrictions.
- APK build, install test, and real-device test.

Do not describe this build as a completed parental-control app. No device restrictions or hidden monitoring are active. Implement device capabilities only through documented Android APIs, visible permission flows, and transparent enrollment.
