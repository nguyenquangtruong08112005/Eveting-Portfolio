# Phase C10 Lazy Provider Loading Verification

## Scope

- Server repo only: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Branch: `staging`
- Server commit: `97c733d` - `Lazy load provider selectors`
- Mobile repos were not changed.

## Implemented Boundary

- Refactored provider selectors to conditionally require only the active provider:
  - `providers/auth/index.js`
  - `providers/notification/index.js`
  - database repository selectors for admin, analytics, events, featured profiles, media, notifications, organizers, promotions, reviews, tickets, users, venues
- Preserved existing env names and defaults:
  - database defaults to `firebase`
  - auth defaults to `firebase`
  - notification defaults to `firebase`
  - all domain-specific `*_DATABASE_PROVIDER` overrides still work
- Added `npm run db:smoke:lazy-providers`.

## Verification Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check providers\auth\index.js
node --check providers\notification\index.js
node --check providers\database\admin.repository.js
node --check providers\database\analytics.repository.js
node --check providers\database\event.repository.js
node --check providers\database\featuredProfile.repository.js
node --check providers\database\media.repository.js
node --check providers\database\notification.repository.js
node --check providers\database\organizer.repository.js
node --check providers\database\promotion.repository.js
node --check providers\database\review.repository.js
node --check providers\database\ticket.repository.js
node --check providers\database\user.repository.js
node --check providers\database\venue.repository.js
node --check scripts\smoke.lazy-providers.js
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:smoke:lazy-providers&&npm run db:smoke:postgres-provider&&npm run db:smoke:postgres-write-paths&&npm run db:smoke:auth&&npm run db:compare:events&&npm run db:compare:admin
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
for /f "delims=" %f in ('rg --files -g "*.js" -g "!node_modules/**"') do @node --check "%f"
node -e "require('./providers/auth'); require('./providers/notification'); require('./providers/database/event.repository'); console.log('default provider selectors require ok')"
```

Result: passed.

## Smoke Result

- With `DATABASE_PROVIDER=postgres`, `AUTH_PROVIDER=backend`, and `NOTIFICATION_PROVIDER=onesignal`, the lazy smoke asserted no load of:
  - `firebase-admin`
  - `config/firebase.config`
  - `providers/auth/firebase.auth.provider`
  - `providers/notification/firebase.provider`
  - `providers/database/firebase.*.repository`
- Postgres provider boot/read smoke still passed.
- Postgres admin write-path smoke still passed.
- Backend auth smoke still passed.
- Events/admin compares still matched Firebase.
- Default Firebase selector require still passed in the current configured environment.

## Compatibility Notes

- Firebase adapters remain present and are still the default provider path.
- Lazy loading reduces runtime coupling but does not remove Firebase scripts, adapters, config, or package dependency yet.
- OneSignal provider can now be selected without loading Firebase notification provider.

## Remaining Risks

- Removing `firebase-admin` still requires archiving migration/compare scripts or keeping them outside runtime install.
- Mobile apps still use Firebase Auth, Firebase Storage, and Firebase Messaging integration.
- Real OneSignal delivery must be verified with real app/subscription IDs.
- Functions folder still targets Firebase Cloud Functions and needs replacement or removal.

## Next Step

Phase C11 environment cutover template:

- document local/dev env values for Postgres/backend auth/S3-compatible storage/OneSignal
- keep production default conservative until mobile migration is ready
- decide whether to archive Firebase migration scripts before package removal
