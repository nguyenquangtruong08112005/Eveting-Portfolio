# Bug report — attendee / checkout UX

> Source notes (user). Status updated after fix pass **2026-07-21**.

| # | Issue | Status | Fix |
|---|--------|--------|-----|
| 1 | `throw [object Object]` when login fails | **Fixed** | `apiClient` unwraps `{ error: { message } }`; LoginForm stringifies safely |
| 2 | No data for test / all events should have tickets | **Fixed** | Backfilled `GA` ticket types for events missing rows; create form already requires tiers |
| 3 | Payment success → ticket looks cancelled; no QR on detail; no paging; view event 404 | **Fixed** | Status map pending≠cancelled; ticket detail flattens API + event `id`; QR from JWT; list paging; mapper includes `event.id` |
| 4 | Remove promotion & deal on landing | **Fixed** | Removed promo strip + partner `PromoBanner`s from `EventDiscovery` |
| 5 | Make all cards clickable (not only Book now) | **Fixed** | Full-card `Link` on `EventCard` |
| 6 | Auto-fill user info on buy ticket | **Fixed** | Checkout reads `userName` / `userEmail` from login localStorage |
| 7 | Past events still on attendee screen | **Fixed** | BE `getPublicEventsPage` + search filter `start_at` / `end_at` vs now |
| 8 | Nowhere to assign featured profile | **Fixed** | Multi-select on organizer create/edit event → `featuredProfileIds` |
| 9 | Search filter mismatch (web sends `city`, `dateFrom`, `dateTo`; BE used `location`, `startDate`, `endDate`) | **Fixed** | Parameter alias normalization & precedence (`city`/`location`, `dateFrom`/`startDate`, `dateTo`/`endDate`) in ES & Postgres fallback |

## Related docs

- `TEST_ACCOUNTS.md` — demo logins  
- `agent-workflow/execution/qa/BUG-REPORT-organizer-admin-2026-07-21.md` — org/admin API bugs  
