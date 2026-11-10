# Steve Family Android app

Expo / React Native Android-first app shell.

## Run locally
```bash
cd apps/android
npm install
npx expo start
```

Scan the QR code with Expo Go for UI preview. This is not a production device-management app.

## Current scope
- Parent/child role preview screens.
- RTL Hebrew interface.
- Family-name and pairing-code input prototypes.
- Explicit demo messaging; no account is created and no pairing request is sent.

## Not implemented yet
Authentication, database/API connection, real invitation/pairing, device credentials, policy sync, app-usage access, location, notifications, or device restrictions. Do not enter real personal data in this prototype.

## Android capability and privacy
Only add device capabilities through documented Android APIs and visible permission flows. Do not use hidden monitoring or attempt to bypass OS restrictions. Any production rollout requires privacy review, Play policy review, and real-device tests.
