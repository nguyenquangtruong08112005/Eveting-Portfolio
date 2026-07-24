# API Contract & Schema Inventory (`API_CONTRACT_INVENTORY.md`)

> **Audit Date:** 2026-07-24
> **Source Files Audited:** `server/src/app.js`, `server/src/modules/auth/api/routes.js`, `web/src/services/apiClient.ts`, `mobile-attendee/app/src/main/java/com/tdtuer/eventing/data/network/EventApiService.kt`, `mobile-organizer/app/src/main/java/com/tdtuer/eventing_organizer/data/network/AuthApiService.kt`.

---

## 1. Express App Route Mount Prefixes (`server/src/app.js`)

### Root Route Mounts
- `/auth` $\rightarrow$ `authRouter`
- `/api/auth` $\rightarrow$ `authRouter`
- `/users` $\rightarrow$ `usersRouter`
- `/events` $\rightarrow$ `eventsRouter`
- `/tickets` $\rightarrow$ `ticketsRouter`
- `/profiles` $\rightarrow$ `featuredProfileRouter`
- `/reviews` $\rightarrow$ `reviewsRouter`
- `/promotions` $\rightarrow$ `promotionsRouter`
- `/notifications` $\rightarrow$ `notificationsRouter`
- `/analytics` $\rightarrow$ `analyticsRouter`
- `/organizer` $\rightarrow$ `organizerRouter`
- `/payments` $\rightarrow$ `paymentsRouter`
- `/venues` $\rightarrow$ `venuesRouter`
- `/admin` $\rightarrow$ `adminRouter`
- `/storage` $\rightarrow$ `storageRouter`

### Web BFF Route Prefixes
- `/api/web/auth` $\rightarrow$ `authRouter`
- `/api/web/events` $\rightarrow$ `eventsRouter`
- `/api/web/tickets` $\rightarrow$ `ticketsRouter`
- `/api/web/payments` $\rightarrow$ `paymentsRouter`
- `/api/web/memberships` $\rightarrow$ `membershipsRouter`
- `/api/web/vouchers` $\rightarrow$ `vouchersRouter`
- `/api/web/profiles` $\rightarrow$ `featuredProfileRouter`
- `/api/web/users` $\rightarrow$ `usersRouter`
- `/api/web/notifications` $\rightarrow$ `notificationsRouter`
- `/api/web/promotions` $\rightarrow$ `promotionsRouter`
- `/api/web/storage` $\rightarrow$ `storageRouter`
- `/api/web/venues` $\rightarrow$ `venuesRouter`
- `/api/organizer` $\rightarrow$ `organizerRouter`
- `/api/admin` $\rightarrow$ `adminRouter`

> **Note on Mobile Routes:** `/api/mobile` routes DO NOT exist in `server/src/app.js`. Native Android apps call `/auth/*`, `/events/*`, `/tickets/*`, `/organizer/*`, `/users/*`, etc., directly.

---

## 2. Authentication Module Endpoint Contracts (`server/src/modules/auth/api/routes.js`)

All endpoints use `express-validator` for input sanitization and validation (`validateRequest` middleware).

| Method | Sub-path | Full Web Path Example | Full Mobile Path Example | Auth Level | Validation Rules (`express-validator`) | Expected Success Payload / Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/register` | `/api/web/auth/register` | `/auth/register` | Public | `email` (isEmail), `password` (notEmpty), `name` (optional string), `role` (optional in `['user', 'organizer']`) | HTTP 201 Created `{ user, token, refreshToken }` |
| `POST` | `/login` | `/api/web/auth/login` | `/auth/login` | Public | `email` (isEmail), `password` (notEmpty) | HTTP 200 OK `{ user, token, refreshToken }` |
| `POST` | `/refresh` | `/api/web/auth/refresh` | `/auth/refresh` | Public | `refreshToken` (notEmpty) | HTTP 200 OK `{ accessToken, refreshToken }` |
| `POST` | `/logout` | `/api/web/auth/logout` | `/auth/logout` | Public | `refreshToken` (notEmpty) | HTTP 200 OK `{ success: true, message: string }` |
| `POST` | `/google-login` | `/api/web/auth/google-login` | `/auth/google-login` | Public | `idToken` (notEmpty), `role` (optional in `['user', 'organizer']`) | HTTP 200 OK `{ user, token, refreshToken }` |
| `POST` | `/facebook-login` | `/api/web/auth/facebook-login` | `/auth/facebook-login` | Public | `accessToken` (notEmpty), `role` (optional in `['user', 'organizer']`) | HTTP 200 OK `{ user, token, refreshToken }` |
| `POST` | `/password-reset/request` | `/api/web/auth/password-reset/request` | `/auth/password-reset/request` | Public | `email` (isEmail) | HTTP 200 OK `{ success: true, message: string }` |
| `POST` | `/password-reset/confirm` | `/api/web/auth/password-reset/confirm` | `/auth/password-reset/confirm` | Public | `token` (notEmpty), `newPassword` (notEmpty) | HTTP 200 OK `{ success: true, message: string }` |
| `POST` | `/email-verification/request` | `/api/web/auth/email-verification/request` | `/auth/email-verification/request` | Public | `email` (isEmail) | HTTP 200 OK `{ success: true, message: string }` |
| `POST` | `/email-verification/confirm` | `/api/web/auth/email-verification/confirm` | `/auth/email-verification/confirm` | Public | `token` (notEmpty) | HTTP 200 OK `{ success: true, message: string }` |
| `POST` | `/logout-all` | `/api/web/auth/logout-all` | `/auth/logout-all` | Authenticated | `verifyAuthToken` middleware | HTTP 200 OK `{ success: true, message: string }` |

---

## 3. Standard Error Envelope Shapes

When a backend request fails or validation fails, Express controllers and `error.middleware.js` return standard error response envelopes:

### Validation Error Shape (HTTP 400 Bad Request)
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### Standard API Error Shape (HTTP 401, 403, 404, 409, 422, 500)
```json
{
  "error": "UNAUTHORIZED_ACCESS",
  "message": "Invalid or expired access token",
  "statusCode": 401
}
```

---

## 4. Web Client API Consumption (`web/src/services/apiClient.ts`)

- **Base URL:** `API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'`
- **Token Refresh Path:** `/api/web/auth/refresh`
- **Current Token Storage:** `localStorage.getItem('token')` / `localStorage.getItem('refreshToken')` (Phase 01 Task `01-T3` will migrate Web to HttpOnly Secure SameSite cookies).
- **Retry Mechanism:** Exponential backoff with `Retry-After` header support on HTTP 422 / 429 status.

---

## 5. Mobile Retrofit API Contracts (`mobile-attendee` & `mobile-organizer`)

- **Attendee App (`EventApiService.kt`):**
  - `@POST("auth/register")`, `@POST("auth/login")`, `@POST("auth/refresh")`, `@POST("auth/logout")`
  - `@POST("auth/google-login")`, `@POST("auth/facebook-login")`
  - `@POST("auth/password-reset/request")`, `@POST("auth/password-reset/confirm")`
  - `@POST("auth/email-verification/request")`, `@POST("auth/email-verification/confirm")`
  - `@POST("tickets/book")`, `@POST("payments/create-order")`, `@POST("events/{eventId}/reviews")`
- **Organizer App (`AuthApiService.kt` & `EventApiService.kt`):**
  - `@POST("auth/login")`, `@POST("auth/register")`, `@POST("auth/refresh")`, `@POST("auth/logout")`, `@POST("auth/logout-all")`
  - `@POST("organizer/check-in-qr")`, `@POST("events")`, `@POST("admin/events/{id}/approve")`, `@POST("admin/events/{id}/reject")`
