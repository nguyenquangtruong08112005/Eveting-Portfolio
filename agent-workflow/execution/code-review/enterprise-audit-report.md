# Enterprise Code Audit — Báo cáo Tổng hợp

> **Phạm vi:** 4 dự án (Server + Web + Mobile Consumer + Mobile Organizer)  
> **Phương pháp:** Multi-agent (7 agents parallel) + Graph-based exploration  
> **Ngày:** 20/06/2026  
> **Tổng files:** ~573 files (118 Server + 32 Web + 247 Mobile Consumer + 176 Mobile Organizer)

---

## Executive Summary

| Dự án | Files | Critical | High | Medium | Low | Risk Score |
|-------|-------|----------|------|--------|-----|------------|
| **Server-2025-Eventing** | 118 | 9 | 17 | 14 | 8 | 🔴 **EXTREME** |
| **web-2025-eventing** | 32 | 7 | 10 | 15 | 6 | 🔴 **EXTREME** |
| **Mobile-2025-Eventing** | 247 | 4 | 13 | 16 | 7 | 🟡 **HIGH** |
| **Mobile-2025-Eventing-Organizer** | 176 | 5 | 12 | 14 | 7 | 🟡 **HIGH** |
| **Tổng** | **573** | **25** | **52** | **59** | **28** | **🔴 EXTREME** |

### 🔴 Top 10 Critical — Cần xử lý NGAY

| # | Dự án | Vấn đề | File | Hậu quả |
|---|-------|--------|------|---------|
| 1 | Server | **File RỖNG** `qr.generator.js` — runtime crash khi booking | `utils/qr.generator.js` | Crash toàn bộ booking flow |
| 2 | Server | **Facebook App Secret leak** qua URL query string | `auth/service.js:285` | Lộ credential, attacker giả mạo app |
| 3 | Server | **Shadow order silent catch** — mất order/ledger | `tickets/service.js:226-266` | Mất doanh thu, mất sổ sách |
| 4 | Server | **lifecycleStatus silently dropped** trên mọi update | `postgres.event.repository.js:117-159` | Event không thể chuyển trạng thái |
| 5 | Web | **Demo backdoor** — catch block login với mock token | `login/page.tsx:44-56` | Ai cũng login được với email bất kỳ |
| 6 | Web | **Seat map random client-side** — không có backend | `attendee/events/[id]/page.tsx:74-93` | Double-booking, booking không real |
| 7 | Web | **Open redirect** qua `payment.order_url` | `checkout/page.tsx:166` | Phishing attack |
| 8 | Server | **Race condition pool init** — nhiều pool instances | `postgres.client.js:5-13` | Connection leak, crash DB |
| 9 | Mobile | **`runBlocking` in OkHttp interceptor** — thread starvation | `NetworkModule.kt` | ANR, treo HTTP calls |
| 10 | Server | **addHistoryEventIdInTransaction ignores transaction** | `postgres.user.repository.js:467-475` | Mất atomicity |

---

## 1. Architecture Review

### Server-2025-Eventing
- **Modular monolith** với 16 modules, module layout rõ ràng (api/application/domain)
- **Alias bootstrap hack** (`alias-bootstrap.js`) monkey-patch `Module._resolveFilename` — fragile khi upgrade Node
- **Dual repository layers** — vừa có `event.repository.js` (stub) vừa có `postgres.event.repository.js` (impl)
- **app.js** vi phạm SRP — CORS, route mounting, static files trong 1 file
- **archive/legacy-shims/** chứa 80+ file dead code
- **authRouter mount 3 lần** (`/auth`, `/api/auth`, `/api/web/auth`)

### web-2025-eventing
- **Next.js 16 App Router** — 9 routes, 7 pages đều là `'use client'` (mất SSR benefits)
- **Không error boundary** — thiếu `error.tsx`, `not-found.tsx`
- **`next.config.ts` trống** — không images, security headers, caching
- **`socket.io-client`** là dead dependency (không import trong src/)

### Mobile-2025-Eventing
- **Clean Architecture** (data/domain/ui) + Hilt DI — cấu trúc tốt
- **God files**: `HomeScreen.kt` (1004 dòng), `EventDetailsScreen.kt` (735 dòng)
- **Event domain model** dùng `Map<String, Any>` — type-unsafe, crash runtime
- **Navigation graph 428 dòng** + ViewModel tightly coupled
- **5 DAOs + Room DB** nhưng offline fallback bị duplicate (shotgun surgery)

### Mobile-2025-Eventing-Organizer
- **Clean Architecture** tương tự Consumer
- **God file**: `EditEventScreen.kt` (909 dòng), `CreateEventViewModel.kt` (648 dòng)
- **EventRepositoryImpl** 37 methods — violates SRP nghiêm trọng
- **Repository interface** đặt trong `data/` thay vì `domain/`
- **ViewModel inject API services trực tiếp** — bypass repository layer
- **~100 dòng code duplicate** giữa CreateEventViewModel và EditEventViewModel

---

## 2. Security Review

| Severity | Server | Web | Mobile Consumer | Mobile Organizer |
|----------|--------|-----|-----------------|------------------|
| 🔴 Critical | 5 | 4 | 0 | 0 |
| 🟡 High | 9 | 4 | 0 | 0 |
| 🟢 Medium | 3 | 3 | 0 | 0 |

### Server — Key Security Issues
| ID | File | Issue |
|----|------|-------|
| S1 | `auth/service.js:167` | `Math.random()` tạo password social login |
| S2 | `auth/service.js:229` | `AUTH_SOCIAL_DEV_BYPASS` backdoor |
| S3 | `featuredProfile/controller.js:33` | Privilege Escalation |
| S4 | `socket-server.js:24` | JWT secret hardcode |
| S5 | `auth/service.js:285` | Facebook App Secret in URL |
| S6 | `postgres.user.repository.js:209-449` | SQL Injection column names |
| S7 | `app.js:30` | CORS `*` |
| S8 | `app.js:39` | No body size limit |
| S9 | `app.js:69-83` | Path traversal trên `/public/:key` |

### Web — Key Security Issues
| ID | File | Issue |
|----|------|-------|
| W1 | `useAuth.ts` | localStorage auth — XSS steal token |
| W2 | `login/page.tsx:44` | Demo backdoor login |
| W3 | `checkout/page.tsx:166` | Open redirect |
| W4 | `checkout/page.tsx:57` | Unvalidated JSON parse from URL |
| W5 | `checkout/page.tsx:28` | Price from URL param |
| W6 | `page.tsx:76-82` | Client-side content filtering |

---

## 3. Performance Review

| Severity | Server | Web | Mobile |
|----------|--------|-----|--------|
| 🔴 Critical | 3 | 2 | 0 |
| 🟡 High | 10 | 3 | 0 |
| 🟢 Medium | 6 | 4 | 0 |

### Server — Key Performance Issues
| ID | Issue | File | Impact |
|----|-------|------|--------|
| P1 | N+1: event lookup per ticket | `tickets/service.js:44-47` | 51 queries cho 50 tickets |
| P2 | N+1: importAttendees O(n) transactions | `organizer/service.js:121-136` | 1000+ transactions cho 1000 rows |
| P3 | N+1: getMyEvents per-event fetch | `organizer/service.js:65-91` | 41 queries cho 20 events |
| P4 | No cache on getAllEvents | `events/service.js:30-41` | DB hit mỗi request |
| P5 | No cache on weather API | `weather.helper.js:39-64` | Rate limit, slow |
| P6 | MemoryCache unbounded growth | `cache-provider.js:4-30` | OOM crash |
| P7 | Stats aggregation in app code | `stats.helper.js:1-30` | CPU/memory waste |
| P8 | QR JWT signing inside transaction | `tickets/service.js:86` | DB connection held |

### Web — Key Performance Issues
| ID | Issue | File | Impact |
|----|-------|------|--------|
| P9 | No `next/image` — `<img>` tags | Multiple files | Mất 40-60% image optimization |
| P10 | 786-line page, no code splitting | `page.tsx` | Bundle lớn, không lazy load |
| P11 | `socket.io-client` dead dep (~60KB) | `package.json` | Waste bundle size |

---

## 4. Code Smell Review

| Severity | Server | Web | Mobile Consumer | Mobile Organizer |
|----------|--------|-----|-----------------|------------------|
| 🔴 | 0 | 0 | 1 | 3 |
| 🟡 | 4 | 0 | 8 | 6 |
| 🟢 | 6 | 0 | 7 | 6 |

### Key Code Smells — Server
| Smell | File | Details |
|-------|------|---------|
| Silent catch blocks | `tickets/service.js:160,265,291` | 3 shadow operations bị swallow |
| N+1 queries | `organizer/service.js:67-91,114-138` | Loop không batch |
| Missing asyncHandler | 7 controllers | Bypass global error handler |
| Monkey-patch conflict | `authz.middleware.js:91` + `idempotency.middleware.js:99` | Cả 2 patch `res.json` |
| Inconsistent status mapping | `event-lifecycle.js:37` vs `admin/service.js:61` | PENDING → DRAFT vs SUBMITTED |

### Key Code Smells — Web
| Smell | File | Details |
|-------|------|---------|
| God page | `page.tsx:786` | 9+ section UI trong 1 file |
| Any types | `checkout/page.tsx:30,52,137,182` | TypeScript `any` defeats type safety |
| Silent API fallback | `checkout/page.tsx:142-147` | Fake booking khi API fail |

### Key Code Smells — Mobile Consumer
| Smell | File | Details |
|-------|------|---------|
| God composable | `HomeScreen.kt:1004` | 14+ composable functions |
| Type-unsafe domain | `Event.kt` | `Map<String, Any>`, `List<Any>` |
| Race condition token refresh | `NetworkModule.kt:73-119` | No mutex |
| UI layer constructs business objects | `HomeScreen.kt:268-276` | Clean Architecture violation |
| ExoPlayer memory leak | `HomeScreen.kt:952-961` | `remember` không key |

### Key Code Smells — Mobile Organizer
| Smell | File | Details |
|-------|------|---------|
| God class | `EventRepositoryImpl.kt` | 37 methods, 7+ responsibilities |
| ~100 lines code duplicate | Create/Edit ViewModels | Identical logic |
| 6+ level nesting | `onLocationSelected` | Empty catch blocks |
| Mutable data class | `CreateEventViewModel.kt:27-32` | `var` properties |
| `e.printStackTrace()` | `EventRepositoryImpl.kt:257,277` | Không logcat |

---

## 5. Dependency Review

### Server 46 vulnerabilities (1 critical, 16 high, 24 moderate, 5 low)

| Package | Version | Issue |
|---------|---------|-------|
| `express` | 4.16.1 | **6 năm tuổi** — body-parser DoS, path-to-regexp ReDoS, send XSS |
| `axios` | 1.13.2 | 24+ advisories: SSRF, prototype pollution, credential theft |
| `fast-xml-parser` (AWS SDK) | - | CRITICAL: Entity expansion bypass, DoS |
| `multer` | 2.0.2 | 5 DoS advisories |
| `nodemailer` | 7.0.11 | SMTP command injection, CRLF injection |
| `xlsx` | - | Prototype Pollution, ReDoS — **NO FIX AVAILABLE** |
| No ESLint/Prettier | - | Chỉ có `nodemon` trong devDependencies |

### Web
| Package | Issue |
|---------|-------|
| `socket.io-client` | Dead dependency — không import |
| `shadcn` | Trong `dependencies` (phải là `devDependencies`) |
| `postcss` | XSS via transitive dep của Next.js |

### Mobile (Consumer + Organizer)
| Package | Issue |
|---------|-------|
| Room | Version mismatch (2.6.1 vs 2.8.4) |
| `google-services.json` | Missing — Firebase không hoạt động |
| Crashlytics | Không được cấu hình |

---

## 6. Convention Review

| Severity | Server | Web | Mobile Consumer | Mobile Organizer |
|----------|--------|-----|-----------------|------------------|
| 🔴 Critical | 1 | 1 | 0 | 0 |
| 🟡 High | 5 | 2 | 8 | 8 |
| 🟢 Medium | 4 | 3 | 3 | 4 |

### Server — Convention Violations
| Issue | Details |
|-------|---------|
| **`var`** thay vì `const`/`let` | 100+ declarations — toàn bộ file postgres.*.repository.js |
| **Indentation inconsistent** | Controller 4-space, middleware 2-space |
| **`console.error`** thay vì logger | `auth/service.js:342,383` |
| **Template literals** | Dùng `+` concatenation thay vì backticks |
| **No ESLint** | Không có config lint |

### Web — Convention Violations
| Issue | Details |
|-------|---------|
| **localStorage auth** | Token/role/uid trong localStorage |
| **`any` types widespread** | `checkout/page.tsx`, `attendee/events/[id]/page.tsx` |
| **Inline data shapes** | `featuredSlides` không match `Event` type |
| **`'use client'` on entire page** | Mất SSR benefits |

### Mobile — Convention Violations (Consumer + Organizer)
| Issue | Details |
|-------|---------|
| **Wildcard imports** | `import ...*` — 80+ files affected |
| **`Result` name collision** | Shadows `kotlin.Result` |
| **`!!` operator** | `signInResult.getOrNull()!!` — crash nếu null |
| **Vietnam comments** | Production code comments tiếng Việt |
| **Typo `OrangePirmary_80`** | Misspelled "Primary" |
| **`Double-bang operator`** | Dùng `!!` thay vì safe calls |

---

## 7. Enterprise Standards Review

| Tiêu chí | Server | Web | Mobile Consumer | Mobile Organizer |
|----------|--------|-----|-----------------|------------------|
| Error Handling | 🟡 Medium | 🔴 Critical | 🟡 Medium | 🟡 Medium |
| Logging | 🟡 Medium | 🔴 Critical | 🔴 Critical | 🔴 Critical |
| Monitoring | 🟢 Good | 🔴 Critical | 🔴 Critical | 🔴 Critical |
| Testing | 🔴 None | 🔴 None | 🔴 Placeholder | 🔴 Placeholder |
| CI/CD | 🔴 None | 🔴 None | 🔴 None | 🔴 None |
| SOLID | 🟡 Fair | 🟡 Fair | 🟢 Good | 🟡 Fair |

### Critical Gaps — Tất cả dự án
| Gap | Details |
|-----|---------|
| **No CI/CD** | 4/4 dự án không có pipeline |
| **No tests** | 4/4 dự án không có test thực tế |
| **No crash reporting (Mobile)** | Firebase Crashlytics chưa được setup |
| **No monitoring (Web)** | Không analytics, không error tracking |
| **No health check (Server)** | Thiếu `/health`, `/readyz` endpoints |
| **No logging framework (Mobile)** | Dùng `Log.d/e` rải rác, 50% comment dead code |

---

## 8. Prioritized Remediation Roadmap

### 🔴 Priority 1 — Tuần 1-2 (Critical: 25 findings)

| Order | Dự án | Task | Effort |
|-------|-------|------|--------|
| 1 | Server | Fix `qr.generator.js` rỗng — implement hoặc remove | 0.5 day |
| 2 | Server | Remove `AUTH_SOCIAL_DEV_BYPASS` | 0.5 day |
| 3 | Server | Fix SQL Injection — whitelist column names | 1 day |
| 4 | Web | Remove demo backdoor `login/page.tsx:44-56` | 0.5 day |
| 5 | Web | Fix seat map — integrate real backend API | 2 days |
| 6 | Web | Fix localStorage auth → httpOnly cookie | 2 days |
| 7 | Web | Fix open redirect `checkout/page.tsx:166` | 0.5 day |
| 8 | Server | Fix shadow order silent catch | 1 day |
| 9 | Server | Fix lifecycleStatus dropped | 1 day |
| 10 | Server | Fix race condition pool init | 0.5 day |
| 11 | Server | Fix Facebook App Secret leak | 0.5 day |
| 12 | Mobile | Fix `runBlocking` in OkHttp interceptor | 1 day |
| 13 | Server | Fix `addHistoryEventIdInTransaction` ignores transaction | 0.5 day |
| - | **All** | **Add Firebase Crashlytics + google-services.json** | **1 day** |
| - | Web | **Add `error.tsx`, `not-found.tsx`** | **0.5 day** |
| - | Server | **Add `/health` endpoint** | **0.5 day** |

### 🟡 Priority 2 — Tuần 3-4 (High: 52 findings)

| Order | Dự án | Task | Effort |
|-------|-------|------|--------|
| 1 | Server | Update `express` 4.16.1 → 4.22.2 | 1 day |
| 2 | Server | Update `axios` → latest | 1 day |
| 3 | Mobile | Fix `Map<String, Any>` → typed domain models | 3 days |
| 4 | Mobile | Fix N+1: batch event queries | 2 days |
| 5 | Web | Add CSP, security headers (`next.config.ts`) | 1 day |
| 6 | Web | Add `images.remotePatterns` | 0.5 day |
| 7 | Server | Fix CORS `*` → whitelist | 0.5 day |
| 8 | Server | Add body size limit + Helmet | 0.5 day |
| 9 | Mobile | Fix race condition token refresh (add mutex) | 1 day |
| 10 | Mobile | Split god files (HomeScreen, EditEventScreen) | 3 days |

### 🟢 Priority 3 — Tháng 2 (Medium: 59 findings)

| Order | Dự án | Task | Effort |
|-------|-------|------|--------|
| 1 | Mobile | Xoá duplicate code Create/Edit ViewModels | 2 days |
| 2 | Mobile | Fix `!!` → safe calls | 1 day |
| 3 | Server | Fix all controllers → use asyncHandler | 2 days |
| 4 | Server | Add transaction retry logic | 1 day |
| 5 | Web | Replace `<img>` with `next/image` | 1 day |
| 6 | Mobile | Extract navigation to ViewModel events | 2 days |
| 7 | Mobile | Fix province list inconsistency | 0.5 day |
| 8 | Server | Replace `moment` with native Date | 0.5 day |

### 🔵 Priority 4 — Tháng 3+ (Low: 28 findings + Tech Debt)

| Order | Dự án | Task | Effort |
|-------|-------|------|--------|
| 1 | All | Replace `var` → `const`/`let` (Server) | 1 day |
| 2 | Mobile | Eliminate wildcard imports | 1 day |
| 3 | Web | Code splitting: dynamic imports | 2 days |
| 4 | Server | Add ESLint + Prettier | 1 day |
| 5 | Server | Remove legacy-shims archive | 1 day |
| 6 | Mobile | Rename `Result` → `AppResult` | 1 day |
| 7 | Web | Refactor page.tsx → server + client components | 2 days |
| 8 | Server | Add CI/CD pipeline | 2 days |
| 9 | Web | Add CI/CD pipeline | 2 days |
| 10 | Mobile | Add CI/CD pipeline | 2 days |
| 11 | All | Write tests (unit + integration) | 5-10 days |

---

## 9. Tổng hợp theo Dự án

### Server-2025-Eventing
```
Risk Score: EXTREME
Files: 118
Total findings: 48 (9C + 17H + 14M + 8L)
Top nguy hiểm: QR rỗng, SQL Injection, lifecycleStatus silent drop, shadow order
Dependency: 46 CVEs — express 6 năm tuổi
Testing: 0 tests — 48 smoke scripts thủ công
```

### web-2025-eventing
```
Risk Score: EXTREME
Files: 32
Total findings: 38 (7C + 10H + 15M + 6L)
Top nguy hiểm: demo backdoor, localStorage auth, seat map random
Dependency: socket.io-client dead, shadcn sai vị trí
Testing: 0 tests
```

### Mobile-2025-Eventing (Consumer)
```
Risk Score: HIGH
Files: 247 (21,904 LOC)
Total findings: 40 (4C + 13H + 16M + 7L)
Top nguy hiểm: runBlocking interceptor, Map<String,Any>, ExoPlayer leak
Domain model: Event dùng Any → crash runtime
Testing: placeholder only
```

### Mobile-2025-Eventing-Organizer
```
Risk Score: HIGH
Files: 176
Total findings: 38 (5C + 12H + 14M + 7L)
Top nguy hiểm: runBlocking, God class 37 methods, ~100 lines duplicate
Architecture: ViewModel inject API trực tiếp, interface sai layer
Testing: placeholder only
```

---

> **Report generated by Enterprise Code Audit Agent — Multi-Agent Parallel Execution**  
> 7 specialist agents: Architecture, Bug Hunter, Security, Performance, Code Smell, Convention, Enterprise Standards  
> Tooling: CodeGraph, Ripgrep, dependency traversal, fan-in/fan-out analysis
