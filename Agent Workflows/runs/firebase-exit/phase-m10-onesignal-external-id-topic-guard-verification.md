# Phase M10 - OneSignal External ID Topic Guard Verification

## Scope

- Server-only fix for OneSignal logs during mobile runtime testing.
- Keep mobile request contracts unchanged.
- Keep Firebase notification provider fallback behavior unchanged.

## Issue

With `NOTIFICATION_PROVIDER=onesignal` and `ONESIGNAL_TARGET_MODE=external_id`, mobile still sends legacy `fcmToken` during profile sync. The server then attempted to use that FCM token as a OneSignal player/subscription id for topic tagging:

```text
OneSignal subscribeToTopic failed ... No user with this id found
```

## Change

- Added `isOneSignalExternalId()` and `shouldManageDeviceTopics()` helper checks.
- `user.service` now skips device topic subscribe/unsubscribe when OneSignal external-id targeting is active.
- `onesignal.provider` now guards `sendToTopic`, `subscribeToTopic`, and `unsubscribeFromTopic` in external-id mode so no code path calls OneSignal topic/tag APIs with legacy FCM tokens.

## Verification

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
node --check services\notification-event.helper.js
node --check services\user.service.js
node --check providers\notification\onesignal.provider.js
git diff --check -- services\notification-event.helper.js services\user.service.js providers\notification\onesignal.provider.js
npm run db:smoke:auth
```

Additional runtime smoke against the running local server:

- `POST /auth/register` returned `201`
- `PUT /users/me` with a fake `fcmToken` returned `200`
- `POST /users/me/follow` returned `200`
- `DELETE /users/me/follow/:profileId` returned `200`

Provider guard smoke:

- `subscribeToTopic` skipped in external-id mode
- `unsubscribeFromTopic` skipped in external-id mode
- `sendToTopic` skipped in external-id mode
- no OneSignal network call was made for legacy FCM topic operations

## Commit

- Server: `be9f6ce` - `Skip OneSignal topic sync in external id mode`

## Remaining Work

- True OneSignal follower/topic push should be redesigned around external ids or stored OneSignal subscription ids.
- Current fix intentionally stops broken topic tagging and keeps direct user-targeted OneSignal notifications working.
