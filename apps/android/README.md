# Steve Control Android

Expo / React Native Android application for teachers and enrolled school devices.

## Implemented
- Google sign-in through Supabase Auth.
- Teacher access check and pending/approved status.
- Teacher dashboard for classrooms, device groups and enrolled devices.
- Server-generated, single-use device pairing codes.
- Device-side pairing requires an explicit confirmation and stores the issued credential in Android secure storage.
- Device command polling and acknowledgement.
- Visible notice commands only.

## Device-control boundary
The current command queue supports a visible notice. It does not silently open apps, block apps, lock settings, monitor activity or provide unrestricted remote control. Additional Android management capabilities require documented platform APIs, explicit permissions and/or managed-device provisioning.

## Backend
The app uses the Steve Control Supabase project through a public publishable key. The service-role key is never stored in the Android app. Supabase Edge Functions and migrations are tracked in the repository.

## Run
```sh
npm install
npx expo start
```

## Build status
An installable APK and physical-device end-to-end test are still required before rollout. The repository CI checks TypeScript and web production build; it does not prove that device management works on every Android model.
