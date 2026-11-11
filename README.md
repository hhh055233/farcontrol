# Steve Control

Steve Control is an Android-first, transparent school-device management app with a teacher dashboard.

## Current architecture

- **Render** hosts the Next.js teacher dashboard: https://steve-control-web.onrender.com
- **Supabase** provides authentication, database, row-level security, and the Edge Functions used by the dashboard and Android app.
- The Render web service deploys from the `feature/secure-family-backend` branch.
- The intended hosting path for this project is Render + Supabase; Vercel is not required for the application.

## Implemented

- Teacher sign-in and server-side teacher access approval.
- Teacher dashboard for classroom/device groups.
- One-time pairing codes and visible device-side confirmation.
- Device credentials stored using Android SecureStore.
- Teacher can queue a visible notice for paired devices.
- Device command polling and acknowledgement while the app is active.
- Enrolled-device app-mode lock: on startup the app checks SecureStore before showing role selection; a device with a valid saved pairing credential opens in device mode and does not show the in-app teacher switch/sign-out controls.

## Important limits and safety

- The enrolled-device lock is an **app-level navigation safeguard**, not Android Enterprise Device Owner provisioning. It does not prevent clearing app data, uninstalling/reinstalling the app, or changing Android system settings.
- The only device command currently supported is a visible on-screen notice.
- Commands are polled while the app is in the foreground. Background delivery is not guaranteed and a foreground service or push-notification flow has not yet been implemented.
- Remote app launching, app blocking, screen viewing, installation management, and unrestricted device control are not implemented.
- School-wide enforcement requires transparent, administrator-authorized Android Enterprise fully managed provisioning and the appropriate Android APIs and permissions.
- Physical-device enrollment, command delivery, and behavior after app restart must be tested on real Android devices before school use.

## Android app

- Expo / React Native app in `apps/android`.
- App name: Steve Control
- Android application ID: `com.stevecontrol.app`
- Deep-link scheme: `stevecontrol`

## Development and validation

- Web dashboard: `npm install && npm run build`
- Android app: `cd apps/android && npm install && npx tsc --noEmit`
- Android test APK workflow: GitHub Actions workflow **Android APK build** on `feature/secure-family-backend`. It runs when manually dispatched or when a commit message contains `[build-apk]`.
- The APK is a test build, not a production Play Store release.
