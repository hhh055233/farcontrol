# Steve Control — Android

Android app built with Expo and React Native for transparent, teacher-authorized school device management.

## Setup

```bash
npm install
npx expo start
```

The app reads the public Supabase URL and publishable key from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A publishable key is intended for client use; never place a Supabase secret or `service_role` key in the app.

## Implemented in this branch

- Teacher sign-in and server-side teacher access approval.
- Teacher classroom and device-group overview.
- One-time device pairing codes and visible enrollment.
- Device credentials stored with Android SecureStore.
- Teacher can queue visible notices for paired devices.
- Enrolled devices poll for commands and acknowledge them while the app is active.
- The teacher interface supports selecting multiple active devices (up to 50).

## Not implemented or not yet verified

- Remote app launching, app blocking, screen viewing, and unrestricted device control.
- Guaranteed background command delivery or push notifications.
- Android Enterprise fully managed provisioning.
- Real-device installation, enrollment, and end-to-end testing.
- Production release signing and Play Store readiness.

Device enrollment and management must remain visible and authorized on each device. The enrolled-device mode is an app-level navigation safeguard, not a way to prevent Android settings changes, app-data clearing, or uninstalling.

## Test APK

The GitHub Actions workflow `.github/workflows/android-apk.yml` builds a release-mode test APK from this branch when a commit message contains `[build-apk]`, or when manually dispatched. A successful workflow uploads an artifact named `steve-control-test-apk`. The artifact is temporary and is not a production Play Store release.
