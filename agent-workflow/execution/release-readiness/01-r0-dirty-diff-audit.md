# R0 Dirty Diff Audit

> Date: 2026-07-22  
> Worker: OpenCode read-only audit  
> Manager verification: Codex  
> Status: COMPLETE - ready for commit split review

## 1. Status Summary

| Repo | State |
|---|---|
| root | Dirty: untracked workflow/docs/artifacts |
| server | Dirty: 14 modified files, 2 untracked files |
| web | Dirty: 16 modified files |
| mobile-attendee | Dirty: 16 tracked `.idea/*` deletions |
| mobile-organizer | Clean |

## 2. CodeGraph Check

OpenCode reported CodeGraph unavailable because it ran from the monorepo root.

Manager verification:

- global CLI exists: `@colbymchenry/codegraph@0.9.9`
- root `.codegraph` is missing
- `server/.codegraph` exists
- server index status: 329 files, 1,732 nodes, 3,172 edges
- server index is stale: 3 added files, 11 modified files pending sync

Decision:

- For server worker tasks, run workers from `server/` or explicitly tell them `cd server` before CodeGraph usage.
- Run `codegraph sync` in `server/` before deeper backend implementation/review if generated `.codegraph` updates are acceptable.

## 3. File Classification

### Root

| Path | Classification | Notes |
|---|---|---|
| `.zcode/` | discard-needs-approval | IDE/agent metadata. Do not commit to public source. |
| `TEST_ACCOUNTS.md` | split | Useful local demo doc, but contains plaintext seed passwords. Redact or keep local-only before public release. |
| `agent-workflow/BUG_REPORT.md` | later | QA artifact, not release-critical. |
| `agent-workflow/PO-idea.md` | later | Product planning notes, not current release-critical. |
| `agent-workflow/execution/qa/` | later | QA reports/flows; commit later only if curated. |

### Server

| Path | Classification | Risk |
|---|---|---|
| `package.json` | keep | Adds seed commands. Low risk. |
| `scripts/seed/seed.events.postgres.js` | keep | Seed source adjustment. Low risk. |
| `scripts/seed/seed.platform.postgres.js` | keep | New platform seed script. Low risk but should be reviewed. |
| `seed/postgres/README.md` | split | Useful seed doc; check duplication before commit. |
| `src/modules/events/api/controller.js` | keep | Event lifecycle/ownership hardening. Low risk. |
| `src/modules/payments/api/controller.js` | keep | Highest-risk backend diff: payment state/order/payment_attempt handling. Needs focused review. |
| `src/modules/tickets/application/helpers/ticket-mappers.js` | keep | Backward-compatible flat ticket detail response added. Contract-sensitive. |
| `src/modules/tickets/application/service.js` | keep | SAVEPOINT fallback hardening. Medium risk. |
| `src/providers/database/postgres.analytics.repository.js` | keep | Time helper migration. Low risk. |
| `src/providers/database/postgres.event.repository.js` | keep | Time filters changed public event visibility/search results. Contract-sensitive. |
| `src/providers/database/postgres.membership.repository.js` | keep | Time helper migration. Low risk. |
| `src/providers/database/postgres.order.repository.js` | keep | Payment attempt/ledger behavior. Medium risk. |
| `src/providers/database/postgres.organizer.repository.js` | keep | Organizer query source changed. Medium risk. |
| `src/providers/database/postgres.rbac.repository.js` | keep | Audit timestamp fix. Low risk. |
| `src/providers/database/postgres.ticket.repository.js` | keep | Ticket update behavior changed for unknown keys/raw_data. Medium risk. |
| `src/shared/audit/audit-logger.js` | keep | Timestamp type fix. Low risk. |

### Web

| Path | Classification | Risk |
|---|---|---|
| `next.config.ts` | keep | Adds external image hosts. Low risk. |
| `src/app/checkout/success/page.tsx` | keep | Payment status retry polling. Medium risk. |
| `src/components/events/EventCard.tsx` | keep | Clickable card behavior. Low risk. |
| `src/components/layout/AppShell.tsx` | keep | Notification bell integration. Low risk if component exists. |
| `src/components/organizer/StatsGrid.tsx` | keep | Money format change. Low risk. |
| `src/context/AuthContext.tsx` | keep | Clears stored user identity on logout. Low risk. |
| `src/features/auth/LoginForm.tsx` | keep | Stores name/email for checkout autofill. Low risk, note localStorage PII. |
| `src/features/checkout/CheckoutView.tsx` | keep | Checkout autofill. Low risk. |
| `src/features/events/EventDiscovery.tsx` | keep | Major UI behavior change; promotions removed from discovery. Needs build and product review. |
| `src/features/organizer/CreateEventForm.tsx` | keep | Adds featured profile IDs. Low risk. |
| `src/features/tickets/MyTicketsView.tsx` | keep | Pagination/status mapping/payment refresh. Contract-sensitive. |
| `src/features/tickets/TicketDetailView.tsx` | keep | Flat/nested ticket response support. Low risk. |
| `src/lib/constants.ts` | keep | Adds `formatMoney`. Low risk. |
| `src/services/apiClient.ts` | keep | Better error parsing. Low risk. |
| `src/services/ticket.service.ts` | keep | Adds page/limit and pagination expectation. Contract-sensitive. |
| `src/types/ticket.ts` | keep | Adds `pending` status. Low risk. |

### Mobile

| Repo | Path | Classification | Notes |
|---|---|---|---|
| mobile-attendee | `.idea/*` deletions | keep | IDE metadata should not be tracked. |
| mobile-organizer | none | clean | No action. |

## 4. Proposed Commit Split

1. `server: harden payment state and order persistence`
   - `src/modules/payments/api/controller.js`
   - `src/providers/database/postgres.order.repository.js`
   - related ticket persistence files if required by the same behavior

2. `server: normalize ticket and event repository behavior`
   - `src/modules/events/api/controller.js`
   - `src/modules/tickets/application/helpers/ticket-mappers.js`
   - `src/modules/tickets/application/service.js`
   - `src/providers/database/postgres.event.repository.js`
   - `src/providers/database/postgres.organizer.repository.js`
   - `src/providers/database/postgres.ticket.repository.js`

3. `server: seed and timestamp cleanup`
   - seed scripts/docs
   - `postgres.analytics.repository.js`
   - `postgres.membership.repository.js`
   - `postgres.rbac.repository.js`
   - `audit-logger.js`

4. `web: align ticket and checkout flows with backend`
   - checkout success polling
   - ticket service/types
   - ticket list/detail views

5. `web: polish discovery, auth, organizer, and shell UI`
   - event discovery/card
   - login/checkout autofill
   - organizer form/stats
   - app shell notification bell
   - API client and constants

6. `mobile-attendee: remove tracked IDE metadata`
   - tracked `.idea/*` deletions only

7. `docs: curate local QA and demo docs`
   - `TEST_ACCOUNTS.md`
   - QA reports
   - PO notes
   - root `.gitignore` cleanup

## 5. Blockers Before Source Commit

1. Verify payment DB schema supports the current payment controller diff, especially `payment_attempts`.
2. Verify public event time filters do not hide the demo dataset.
3. Verify web ticket pagination matches server response shape.
4. Verify `EventDiscovery.tsx` still builds after promotion section removal.
5. Decide whether `TEST_ACCOUNTS.md` is public-safe or should remain local-only.
6. Decide whether `.zcode/` should be deleted or ignored.

## 6. Manager Verification Commands

Use cmd-compatible commands:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\server
node -e "require('./src/alias-bootstrap'); console.log('server alias ok')"
git diff --check
```

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\web
npm run typecheck
npm run lint
```

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\server
findstr /n /i "pagination page limit" src\modules\tickets\api\controller.js
findstr /n /i "nowDb nowMs toDb fromDb" src\providers\database\time.helper.js
```

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\web
if exist src\features\notifications\NotificationBell.tsx (echo NotificationBell exists) else (echo Missing NotificationBell)
findstr /n /i "PromotionService PromoBanner" src\features\events\EventDiscovery.tsx
```

## 7. Next Action

Run focused manager verification for blockers 1-4, then stage commits by the split above.

## 8. Manager Verification Results

> Updated: 2026-07-22

Completed checks:

- `server`: `git diff --check` passed for current backend diff.
- `server`: `node --check` passed for all currently changed `.js` files.
- `server`: local Docker Postgres is healthy on host port `55432`.
- `server`: DB probe passed after loading `.env`.
- `server`: required tables exist: `events`, `order_items`, `orders`, `payment_attempts`, `tickets`.
- `server`: `payment_attempts` columns exist, including `order_id`, `ticket_id`, `provider_order_id`, payload fields, and timestamps.
- `server`: event filter impact is acceptable for demo data: 50 public active events, 20 visible after the current/upcoming time filter.
- `web`: `NotificationBell.tsx` exists.
- `web`: initial `npm run lint` failed with 3 errors in organizer map/camera components.
- `web`: OpenCode fixed the lint blocker in a narrow scope.
- `web`: manager re-ran `npm run lint`; result is 0 errors, 10 warnings.

Committed source checkpoint:

- `web` commit `e8328cf web: fix organizer lint errors`
- `server` commit `7102dfe server: harden payment state persistence`
- `server` commit `4e57fd9 server: normalize event and ticket repository behavior`
- `server` commit `193b0f3 server: refresh seed and timestamp handling`
- `web` commit `acc743a web: align ticket checkout flows`
- `web` commit `d5ca72f web: refine event discovery UI`
- `web` commit `b0a8f65 web: persist checkout identity hints`
- `web` commit `91cea71 web: polish organizer shell utilities`
- `web` commit `f4bb93c web: improve api errors and image hosts`
- `mobile-attendee` commit `c39a161 mobile-attendee: remove tracked ide metadata`

Remaining warnings:

- `scripts/test-safe-redirect.mjs`: unused `createRequire`.
- `src/app/attendee/events/[id]/page.tsx`: missing `t` dependencies.
- `src/components/layout/Footer.tsx`: unused `Link`.
- `src/components/search/SearchBarDropdown.tsx`: unsupported `aria-expanded` on textbox role.
- `src/features/events/EventDiscovery.tsx`: missing `eventsByCategory` dependencies.
- `src/features/notifications/NotificationsView.tsx`: unused `Link`.

Next source action:

1. Decide root `.zcode/` and `TEST_ACCOUNTS.md` handling before public-source cleanup.
2. Decide whether root QA and PO notes should be curated into public docs or kept local.
3. Start R1 contract consistency verification across backend, web, and mobile.
