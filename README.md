# Steve Family

A transparent family device-management app prototype.

## Scope
- Parent dashboard and multiple managed-device overview.
- Explicit device pairing and consent.
- Screen-time schedules and app restriction planning.
- Activity/audit history and clear permission status.

## Important platform limits
This web dashboard is a prototype/control plane. It does not remotely control phones by itself. Android and iOS enforcement requires separate native apps, OS-approved APIs, explicit enrollment, and platform-specific permissions. No stealth monitoring or security bypasses are implemented.

## Development
This project uses Next.js and TypeScript. Run `npm install` then `npm run dev`.
