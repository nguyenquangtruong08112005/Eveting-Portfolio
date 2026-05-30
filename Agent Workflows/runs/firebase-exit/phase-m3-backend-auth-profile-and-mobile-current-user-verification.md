# Phase M3 Backend Auth Profile And Mobile Current User Verification

## Scope

- Server repo: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Attendee mobile repo: `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing`
- Organizer mobile repo: `D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer`
- Branch: `staging`
- Worker: `opencode`

## Integrated Commits

- Server: `a7c9f1d` - `Create profile for backend auth users`
- Attendee mobile: `bbeac36` - `Use backend token for attendee current user`
- Organizer mobile: `2e88509` - `Use backend token for organizer current user`

Note: these hashes replaced earlier M3 mobile hashes after history was rewritten to insert user pre-refactor work before Firebase Exit commits.

## Implemented Changes

Server:

- Backend auth register/login now ensures a minimal Postgres `user_profiles` row exists.
- Existing profiles are not overwritten.
- Auth role `user` maps to profile role `attendee`.
- Auth role `organizer` maps to profile role `organizer`.
- Auth smoke now verifies `GET /users/me` after register, organizer register, and login.

Attendee mobile:

- `getCurrentUser()` checks backend token first.
- If backend token exists, it calls `GET /users/me`, maps the response to domain `User`, emits once, and closes the flow.
- If backend token is missing or backend request fails, it falls back to existing Firebase AuthStateListener plus Firestore behavior.
- Pre-existing `getCurrentUserId()` dirty hunk was not committed.

Organizer mobile:

- `getCurrentUser()` checks backend token first.
- If backend token exists, it calls `GET /users/me`, maps the response to domain `User`, emits once, and closes the flow.
- If backend token is missing or backend request fails, it falls back to existing Firebase AuthStateListener plus Firestore behavior.
- Pre-existing `EditEventScreen.kt` dirty hunk remains unstaged and uncommitted.

## Verification Commands

Server:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check services\auth.service.js
node --check scripts\smoke.auth.js
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:smoke:auth&&npm run db:smoke:lazy-providers&&npm run db:smoke:postgres-provider
```

Result: passed.

Attendee:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing
git diff --check
gradlew.bat :app:compileDebugKotlin
```

Result:

- `git diff --check` passed.
- Compile is blocked at `:app:checkDebugAarMetadata` because Mapbox Maven returns 401 Unauthorized before Kotlin compilation.

Organizer:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Mobile-2025-Eventing-Organizer
git diff --check
gradlew.bat :app:compileDebugKotlin
```

Result:

- `git diff --check` passed for the M3 auth file.
- Compile is blocked at `:app:checkDebugAarMetadata` because Mapbox Maven returns 401 Unauthorized before Kotlin compilation.

## Compatibility Notes

- Firebase social login remains unchanged.
- Firebase email/password fallback remains available.
- Backend auth users can now load `/users/me` because register/login creates a minimal profile.
- Mobile current-user flow now works for backend JWT sessions but still falls back to Firebase.

## Remaining Work

- Resolve Mapbox Maven credentials so mobile Kotlin compile can validate changes.
- Add refresh-token handling for expired backend access tokens.
- Add backend logout refresh-token clearing in mobile flows if not already covered by explicit sign-out.
- Continue Firebase Exit for storage upload path and push subscription registration on mobile.
