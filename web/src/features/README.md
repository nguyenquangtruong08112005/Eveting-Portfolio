# Feature modules (Portfolio V1)

```text
features/
  auth/          LoginForm, RegisterForm, api
  events/        EventDiscovery, api
  checkout/      CheckoutView (+ safe payment redirect), api
  tickets/       MyTicketsView, TicketDetailView, api
  organizer/     OrganizerDashboardView, CreateEventForm, api
  admin/         ModerationView, api
```

## Rules

1. `app/**/page.tsx` is a **thin** re-export of a feature view.
2. API access goes through `features/<name>/api.ts` (re-exports services).
3. Colors via DESIGN tokens (`var(--*)`) — no hard-coded coral hex in new code.
4. Payment redirects must use `@/lib/safe-redirect`.

## Verified routes (thin pages)

| Route | Feature |
|---|---|
| `/` | `events/EventDiscovery` |
| `/login` | `auth/LoginForm` |
| `/register` | `auth/RegisterForm` |
| `/checkout` | `checkout/CheckoutView` |
| `/my-tickets` | `tickets/MyTicketsView` |
| `/my-tickets/[id]` | `tickets/TicketDetailView` |
| `/organizer/dashboard` | `organizer/OrganizerDashboardView` |
| `/organizer/events/new` | `organizer/CreateEventForm` |
| `/organizer/promotions` | Phase 3 (placeholder → PromotionsView) |
| `/organizer/venues` | Phase 3 (placeholder → VenuesView) |
| `/organizer/check-in` | Phase 3 (placeholder → CheckInView) |
| `/admin/moderation` | `admin/ModerationView` |
