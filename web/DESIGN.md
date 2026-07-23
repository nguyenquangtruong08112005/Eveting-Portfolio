# AuraEvents Design System

| | |
|---|---|
| **Product** | AuraEvents Web Portal |
| **Document** | Design System Specification |
| **Version** | 3.0 |
| **Status** | Active — implementation source of truth |
| **Palette** | **Ember & Tide** (orange primary + teal accent + warm stone neutrals) |
| **Stack** | Next.js App Router · Tailwind CSS v4 · shadcn/ui |
| **Token source** | `src/app/globals.css` |
| **Cross-platform** | Brand-aligned with Mobile Consumer & Mobile Organizer at the semantic level |

---

## 1. Purpose

This document defines the **visual language, interaction standards, and layout rules** for the AuraEvents web application. It is the contract between product design and engineering.

**Goals**

1. Consistent brand expression across public discovery, checkout, organizer, and admin surfaces.
2. Dual-theme support (light **and** dark) via CSS custom properties only — no hard-coded palette in feature code.
3. Enterprise-grade clarity for dashboards and forms without losing consumer event energy.
4. Accessibility-first color contrast, focus rings, and `prefers-reduced-motion` support.

**Non-goals**

- Marketing microsite systems outside this app.
- Mobile native component APIs (Kotlin Material mappings live in the apps).
- Partner/promo brand gradients (VIB, Shopee, HDBank, social hover colors) — those may keep vendor hex.

---

## 2. Brand Positioning

| Attribute | Direction |
|---|---|
| **Category** | Event discovery & ticketing |
| **Tone** | Warm, confident, premium — not cold “AI purple/cyan” |
| **Reference market** | Ticketbox-class consumer energy + clean SaaS organizer tools |
| **Primary accent** | Ember orange — CTAs, price, active, focus |
| **Secondary accent** | Tide teal — secondary CTAs, info chips, chart series |
| **Neutrals** | Warm stone (not pure gray) for light and dark |

---

## 3. Design Tokens — “Ember & Tide”

All UI color in **feature code** must resolve through CSS variables in `globals.css`. Prefer semantic tokens (`--primary`, `--surface`, `--text-secondary`) over raw hex in JSX.

### 3.1 Core palette

| Role | Light | Dark | Use |
|---|---|---|---|
| **Primary (Orange)** | `#F97316` | `#FB923C` | CTAs, links, active, focus ring |
| Primary hover/pressed | `#EA580C` | `#F97316` | Hover, pressed |
| Primary container | `#FFF7ED` | `#2A1607` | Chips, soft highlights |
| On-primary | `#FFFFFF` | `#1C1917` | Text/icons on primary fills |
| **Accent (Teal)** | `#0D9488` | `#14B8A6` | Secondary CTA, info, alt links, charts |
| Accent container | `#CCFBF1` | `#042F2E` | Info chips |
| Success | `#16A34A` | `#22C55E` | Paid, confirmed, available |
| Warning | `#D97706` | `#FBBF24` | Pending, limited stock |
| Error | `#DC2626` | `#F87171` | Errors, destructive |
| Background | `#FAFAF9` | `#0C0A09` | Page canvas |
| Surface | `#FFFFFF` | `#1C1917` | Cards, panels |
| Surface hover | `#F5F5F4` | `#292524` | Row/card hover |
| Surface border | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.10)` | Dividers |
| Ink (primary text) | `#1C1917` | `#FAFAF9` | Headings, body |
| Secondary text | `#57534E` | `#D6D3D1` | Supporting copy |
| Muted text | `#A8A29E` | `#A8A29E` | Meta, timestamps |

### 3.2 Gradients

| Name | Stops | Use |
|---|---|---|
| Primary CTA | `#F97316 → #FB923C` | `.btn-primary-gradient` |
| Split (hero moments) | `#F97316 → #0D9488` | `.text-gradient-split`, sparingly |

### 3.3 Radius & type

| Token | Value |
|---|---|
| Control radius | 12px |
| Card radius | 16px (`.aura-card`) |
| Pill | full |
| Font | Inter (keep) |

### 3.4 Motion

| Kind | Duration |
|---|---|
| Chrome (buttons, focus) | 150–250ms |
| Cards / hover lift | ≤400ms |
| Reduced motion | Full `prefers-reduced-motion` support in `globals.css` |

### 3.5 Theme modes

- Light and dark are first-class.
- Toggle via `ThemeProvider` / `ThemeToggle` (class `dark` on root).
- Never hard-code `bg-[#1E212B]`, `text-zinc-*`, or `text-white` for app chrome.

### 3.6 Allowed non-token hex

| Case | Why |
|---|---|
| Photo overlays (`text-white`, `from-black/60`) | Contrast on imagery |
| Partner promo gradients | External brand colors |
| Social hover brand colors | Facebook/Instagram/etc. |
| SVG decorative stops using primary hex | SVG cannot use CSS vars in all cases — prefer palette primaries |

---

## 4. Layout shells

| Surface | Shell | Notes |
|---|---|---|
| Public (home, event, checkout, tickets) | `Navbar` + `Footer` | Mobile `Sheet` drawer for nav/search |
| Organizer / Admin | `AppShell` (sidebar) | Uses `--sidebar-*` tokens; do **not** nest public Navbar as the only chrome |

---

## 5. Shared primitives

Prefer these over one-off skeletons and empty states:

| Component | Path |
|---|---|
| `PageHeader` | `components/shared/PageHeader.tsx` |
| `EmptyState` / `ErrorState` | `components/shared/*` |
| `AsyncBoundary` / `SkeletonGrid` | `components/shared/*` |
| `SectionHeading` | `components/shared/SectionHeading.tsx` |
| `BrandMark` | `components/shared/BrandMark.tsx` |
| `ToastHost` | `components/shared/ToastHost.tsx` (sonner) |
| `MockDataBanner` | Admin mock views only |
| `SafeImage` | Images with fallback |

---

## 6. Component rules (Do / Don’t)

### Do

- Use `bg-[var(--surface)]`, `text-[var(--text-primary)]`, `border-[var(--surface-border)]`.
- Use `btn-primary-gradient` + `text-[var(--on-primary)]` for primary CTAs.
- Label form controls; keep focus rings on `--ring` / primary.
- Put every new user-facing string in `messages/en.json` **and** `messages/vi.json`.

### Don’t

- Ship hard-coded dark-only chrome (`bg-[#1E212B]`, `text-zinc-400`, `border-white/10`).
- Use pure gray zinc scales for app surfaces — warm stone tokens only.
- Hand-roll pulse skeletons when `SkeletonGrid` / `skeleton` exists.
- Forget light mode when designing cards or tables.

---

## 7. Accessibility

1. **Contrast** — body text meets AA on surface/background pairs from the token table.
2. **Focus** — visible ring using `--ring` (primary orange).
3. **Keyboard** — interactive cards should be links/buttons with focus styles.
4. **Motion** — honor `prefers-reduced-motion`.
5. **Images** — meaningful `alt`; decorative images empty alt.

---

## 8. File map (implementation)

| Concern | Location |
|---|---|
| Tokens & utilities | `src/app/globals.css` |
| Category / currency / date helpers | `src/lib/constants.ts` |
| shadcn primitives | `src/components/ui/*` |
| Shared chrome | `src/components/shared/*`, `src/components/layout/*` |
| Feature UI | `src/features/*`, `src/components/{events,checkout,booking,seating,home,organizer,admin}/*` |
| i18n | `messages/en.json`, `messages/vi.json` |

---

## 9. Phase roadmap (web redesign)

| Phase | Scope | Gate |
|---|---|---|
| **1 — Foundation** | Tokens, primitives, shell, migrate existing pages | Review stop |
| **2 — Attendee** | Discovery, search, reviews, auth extras, QR tickets | Review stop |
| **3 — Organizer** | Analytics, promotions, venues, check-in | Review stop |
| **4 — Admin** | Moderation polish + labeled mocks for missing APIs | Review stop |

---

## 10. Version history

| Version | Notes |
|---|---|
| 2.0 | Coral orange dark-first system (previous) |
| **3.0** | **Ember & Tide** — dual-theme orange + teal, warm stone neutrals, AppShell, shared primitives, token discipline |

---

*Source of truth for colors remains `src/app/globals.css`. Update this document when tokens change.*
