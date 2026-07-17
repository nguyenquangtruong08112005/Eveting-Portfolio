# AuraEvents — 3-Minute Demo Script

Portfolio V1 end-to-end demo (web + API). Mobile optional.

## Prerequisites (once)

```bash
# Terminal 1 — infra + API
cd Server-2025-Eventing
npm install
npm run local:infra          # Postgres + Elasticsearch (Docker)
# Ensure DATABASE_URL points at local Postgres, e.g.
# postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev
npm run db:migrate
npm run dev                  # API default :3000

# Terminal 2 — web
cd web-2025-eventing
npm install
# NEXT_PUBLIC_API_URL=http://localhost:3000 (or your .env)
npm run dev                  # Web default :3000 or :3001
```

Optional smoke checks:

```bash
cd Server-2025-Eventing
npm run db:smoke:auth
npm run db:smoke:event-lifecycle
npm run db:smoke:order-foundation
npm run test:unit:qr

cd ../web-2025-eventing
npm run test:unit
npm run build
```

---

## Demo path (≈3 minutes)

### 1. Register & login (30s)

1. Open web → **Register** with a new email.  
2. **Login** with the same account.  
3. Confirm home shows events (or empty state if unseeded).

### 2. Organizer: create & submit event (60s)

1. Use an organizer account (or promote user via DB/admin if needed).  
2. Open **Organizer → New event**.  
3. Fill title, schedule, at least one ticket type (name, price, capacity).  
4. **Submit** for approval (draft → pending).

### 3. Admin: approve (20s)

1. Login as **admin**.  
2. Open **Admin → Moderation**.  
3. **Approve** the pending event so it becomes public.

### 4. Attendee: buy ticket (45s)

1. Login as attendee.  
2. Open the published event → choose ticket type / quantity.  
3. **Checkout** → fill billing → ZaloPay sandbox (or configured payment).  
4. On success, open **My tickets** and show QR / ticket detail.

### 5. Check-in (optional, 30s)

1. Organizer app or staff flow: scan / validate ticket QR.  
2. Confirm ticket moves to checked-in (second scan rejected).

### 6. Review (optional, 15s)

1. After event completed (or seed COMPLETED), open event and submit a **rating + comment**.

---

## What to say in an interview

> “I built a modular ticketing platform: JWT auth, event lifecycle (draft → approve → publish), inventory-safe booking with orders, payment redirect with open-redirect protection, QR tickets, and mobile apps that map API errors to user-friendly messages instead of raw HTTP codes. Design docs cover a larger marketplace vision; V1 ships the demoable core.”

---

## Portfolio scope reminder

Ship list: [agent-workflow/knowledge/project/PORTFOLIO_V1_SCOPE.md](agent-workflow/knowledge/project/PORTFOLIO_V1_SCOPE.md)  
Do **not** demo settlement/payout/cooling period as V1 product.
