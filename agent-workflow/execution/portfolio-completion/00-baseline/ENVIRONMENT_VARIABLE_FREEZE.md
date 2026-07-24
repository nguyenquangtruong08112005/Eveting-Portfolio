# Environment Variable Freeze & Parameter Registry (`ENVIRONMENT_VARIABLE_FREEZE.md`)

> **Audit Date:** 2026-07-24
> **Rule:** Document variable names and usage references ONLY. **Never record real secret values.**

---

## 1. Server Environment Variables (`server/.env.example`)

| Variable Name | Default / Example Value Reference | Code Usage Reference | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `server/src/server.js` | Runtime execution mode (`development` / `production` / `test`) |
| `PORT` | `3000` | `server/src/server.js` | Express HTTP server listen port |
| `DATABASE_URL` | `postgres://...` | `server/src/db/` | PostgreSQL database connection string |
| `REDIS_URL` | `redis://localhost:6379` | `server/src/providers/cache/` | Redis cache connection string |
| `ELASTIC_NODE_URL` | `http://localhost:9200` | `server/src/providers/search/` | Elasticsearch cluster endpoint URL |
| `AUTH_PROVIDER` | `backend` | `server/src/providers/auth/` | Authentication provider strategy (`backend`) |
| `DATABASE_PROVIDER` | `postgres` | `server/src/db/` | Database provider strategy (`postgres`) |
| `STORAGE_PROVIDER` | `local` | `server/src/providers/storage/` | Media storage provider (`local` / `s3`) |
| `NOTIFICATION_PROVIDER` | `onesignal` | `server/src/providers/notification/` | Push notification service (`onesignal`) |
| `ONESIGNAL_TARGET_MODE` | `external_id` | `server/src/providers/notification/` | Push targeting strategy (`external_id`) |
| `ACCESS_TOKEN_SECRET` | *Secret Placeholder* | `server/src/shared/middleware/auth.middleware.js` | JWT Access Token signing key |
| `REFRESH_TOKEN_SECRET` | *Secret Placeholder* | `server/src/shared/middleware/auth.middleware.js` | JWT Refresh Token signing key |
| `ACCESS_TOKEN_EXPIRES_IN` | `15m` | `server/src/modules/auth/` | JWT Access Token expiration TTL |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | `server/src/modules/auth/` | JWT Refresh Token expiration TTL |
| `JWT_TICKET_SECRET` | *Secret Placeholder* | `server/src/modules/tickets/` | Ticket QR payload signing key |
| `QR_CODE_TTL` | `300` | `server/src/modules/tickets/` | QR code validity duration (seconds) |
| `ADMIN_UID` | `admin` | `server/src/middleware/auth.js` | Superadmin user identifier |
| `GOOGLE_ALLOWED_CLIENT_IDS` | *Unset Placeholder* | `server/src/modules/auth/` | Whitelisted Google OAuth Client IDs |
| `FACEBOOK_APP_ID` | *Unset Placeholder* | `server/src/modules/auth/` | Facebook OAuth Application ID |
| `FACEBOOK_APP_SECRET` | *Secret Placeholder* | `server/src/modules/auth/` | Facebook OAuth Application Secret |
| `AUTH_SOCIAL_DEV_BYPASS` | `false` | `server/src/modules/auth/` | Local/test offline social login bypass flag |
| `SMTP_HOST` | `smtp.resend.com` | `server/src/providers/email/` | Transactional email SMTP host |
| `SMTP_PORT` | `587` | `server/src/providers/email/` | SMTP transport port |
| `SMTP_SECURE` | `false` | `server/src/providers/email/` | SMTP SSL/TLS connection flag |
| `SMTP_USER` | `resend` | `server/src/providers/email/` | SMTP authentication user |
| `SMTP_PASS` | *Secret Placeholder* | `server/src/providers/email/` | SMTP authentication password |
| `EMAIL_FROM` | `"Eventing <noreply@...>"` | `server/src/providers/email/` | Default sender email address |
| `AUTH_MOCK_EMAIL` | `true` | `server/src/providers/email/` | Mock email logging toggle (Local/test only) |
| `ZALOPAY_APP_ID` | *Unset Placeholder* | `server/src/providers/payment/` | ZaloPay Sandbox Application ID |
| `ZALOPAY_KEY1` | *Secret Placeholder* | `server/src/providers/payment/` | ZaloPay Gateway Key 1 (Order Creation) |
| `ZALOPAY_KEY2` | *Secret Placeholder* | `server/src/providers/payment/` | ZaloPay Gateway Key 2 (Callback Verification) |
| `ZALOPAY_ENDPOINT` | `https://sb-openapi.zalopay.vn/...` | `server/src/providers/payment/` | ZaloPay API endpoint |
| `PAYMENT_WEBHOOK_SECRET` | *Secret Placeholder* | `server/src/modules/payments/` | Webhook signature verification secret |
| `APP_PUBLIC_URL` | `http://localhost:3000` | `server/src/` | Backend public base URL |
| `OPENWEATHER_API_KEY` | *Secret Placeholder* | `server/src/modules/events/` | OpenWeather API integration key |
| `S3_REGION` | `auto` | `server/src/providers/storage/` | S3 / Cloudflare R2 storage region |
| `S3_ENDPOINT` | *Unset Placeholder* | `server/src/providers/storage/` | S3 / R2 custom endpoint URL |
| `S3_ACCESS_KEY_ID` | *Secret Placeholder* | `server/src/providers/storage/` | S3 Access Key ID |
| `S3_SECRET_ACCESS_KEY` | *Secret Placeholder* | `server/src/providers/storage/` | S3 Secret Access Key |
| `S3_BUCKET` | *Unset Placeholder* | `server/src/providers/storage/` | Media storage bucket name |
| `S3_PUBLIC_URL_BASE` | *Unset Placeholder* | `server/src/providers/storage/` | Public CDN / R2 image URL base |
| `ONESIGNAL_APP_ID` | *Unset Placeholder* | `server/src/providers/notification/` | OneSignal App ID |
| `ONESIGNAL_REST_API_KEY` | *Secret Placeholder* | `server/src/providers/notification/` | OneSignal REST API Key |
| `LOG_LEVEL` | `info` | `server/src/shared/logger/` | Application logging level |
| `LOG_CONSOLE` | `true` | `server/src/shared/logger/` | Console log output toggle |

---

## 2. Web Environment Variables (`web/.env.example`)

| Variable Name | Default / Example Value Reference | Code Usage Reference | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | `web/src/services/apiClient.ts` | Backend API base URL bundled in browser |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3001` | `web/src/` | Web frontend public URL base |
| `NEXT_PUBLIC_GRAFANA_URL` | `http://localhost:3301` | `web/src/app/admin/observability/` | Grafana dashboard embed URL |
| `NEXT_PUBLIC_GRAFANA_DASHBOARD_PATH` | `/d/eventing-overview/...` | `web/src/app/admin/observability/` | Grafana dashboard path |
| `NEXT_PUBLIC_HOTLINE` | *Unset Placeholder* | `web/src/components/layout/Footer.tsx` | Support hotline phone number |
| `NEXT_PUBLIC_EMAIL` | *Unset Placeholder* | `web/src/components/layout/Footer.tsx` | Support email address |
| `NEXT_PUBLIC_FACEBOOK_URL` | *Unset Placeholder* | `web/src/components/layout/Footer.tsx` | Official Facebook page link |
| `NEXT_PUBLIC_INSTAGRAM_URL` | *Unset Placeholder* | `web/src/components/layout/Footer.tsx` | Official Instagram profile link |
| `NEXT_PUBLIC_TIKTOK_URL` | *Unset Placeholder* | `web/src/components/layout/Footer.tsx` | Official TikTok profile link |
| `NEXT_PUBLIC_LINKEDIN_URL` | *Unset Placeholder* | `web/src/components/layout/Footer.tsx` | Official LinkedIn profile link |
