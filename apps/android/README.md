# Steve Control Android

Expo / React Native application for a managed school device.

## Current implementation
- Hebrew right-to-left enrollment information screen.
- Explains the teacher-managed workspace and device permission boundaries.
- Does not create fake invitations, mock enrolled devices, or claim to have enrolled a device.

## Not connected yet
Teacher authentication, server-side one-time invitations, device credential issuance, database persistence, heartbeat, policy sync and actual Android management capabilities are not implemented. The enrollment flow must remain unavailable until these services exist and the device user can review and explicitly approve the request.

## Security
Never put service-role keys or server secrets in the app. Pairing codes must be generated and validated server-side, short-lived, single-use and rate-limited. Store device credentials in Android secure storage and support revocation. Request each Android permission separately with a clear explanation. Do not implement hidden monitoring or bypass OS restrictions.

## Run
```sh
npm install
npx expo start
```
