# Agent Debt Remediation Backlog — Active

> **Status:** Phases A–F complete (2026-07-17)  
> **DB integrity (DBA):** CLOSED — see [../db-audit/](../db-audit/)  
> **DB 3NF (next):** OPEN — see [../db-3nf/](../db-3nf/) and [db-3nf-active.md](db-3nf-active.md)  
> **Scope:** [PORTFOLIO_V1_SCOPE.md](../../knowledge/project/PORTFOLIO_V1_SCOPE.md)

---

## Phase A — Docs freeze ✅

| ID | Task | Status |
|---|---|---|
| A1–A5 | Scope, backlog, delete duplicate tree, archive phases, INDEX | ✅ |

---

## Phase B — Database P0 ✅

| ID | Task | Status |
|---|---|---|
| B1 | Transactional migrate.js | ✅ |
| B2–B5 | 031 FKs, orphan audit, identity, deferred tables | ✅ Applied |

---

## Phase C — Server ✅

| ID | Task | Status |
|---|---|---|
| C1 | QR generator + unit test | ✅ |
| C2 | Postgres-only facades | ✅ |
| C3 | Order create fails closed | ✅ |
| C4–C7 | Lifecycle / order / auth smokes | ✅ 68 + 114 + auth |

---

## Phase D — Web ✅

| ID | Task | Status |
|---|---|---|
| D1–D5 | features/*, thin pages, DESIGN tokens, safe-redirect, build | ✅ |

---

## Phase E — Mobile ✅

| ID | Task | Status |
|---|---|---|
| E1–E2 | UserFacingErrors both apps | ✅ |
| E3 | Auth + Event repos + ViewModels | ✅ |
| E4 | Unit tests (Gradle) | ✅ BUILD SUCCESSFUL |
| E5 | Mobile READMEs | ✅ |
| Extra | No raw HTTP codes on UI path | ✅ |

---

## Phase F — Ship ✅

| ID | Task | Status |
|---|---|---|
| F1 | Root `docker-compose.yml` + local:infra docs | ✅ |
| F2 | Existing server CI (`server-ci.yml`) + npm test scripts | ✅ Documented |
| F3 | Deploy | Optional / env-specific (not required for portfolio local demo) |
| F4 | [DEMO.md](../../../DEMO.md) | ✅ |
| F5 | Root [README.md](../../../README.md) + START_HERE | ✅ |

---

## Verification evidence

```text
Server:
  db:smoke:event-lifecycle     PASS 68/68
  db:smoke:order-foundation    PASS 114/114
  db:smoke:auth                PASS
  test:unit:qr                 PASS

Web:
  test:unit (safe-redirect)    PASS
  npm run build                PASS

Mobile:
  :app:testDebugUnitTest UserFacingErrorsTest  (consumer + organizer) PASS
```

---

## Ongoing (optional polish, not blockers)

- Seed script for demo users (admin / organizer / attendee)  
- Cloud deploy (Railway/Vercel) when credentials available  
- Further god-screen splits on mobile  
