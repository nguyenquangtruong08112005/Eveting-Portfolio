# AuraEvents Design System

| | |
|---|---|
| **Product** | AuraEvents Web Portal |
| **Document** | Design System Specification |
| **Version** | 2.0 |
| **Status** | Active — implementation source of truth |
| **Stack** | Next.js App Router · Tailwind CSS v4 · shadcn/ui |
| **Token source** | `src/app/globals.css` |
| **Cross-platform** | Aligned with Mobile Consumer & Mobile Organizer (coral primary, warm dark surfaces) |

---

## 1. Purpose

This document defines the **visual language, interaction standards, and layout rules** for the AuraEvents web application. It is the contract between product design and engineering.

**Goals**

1. Consistent brand expression across public discovery, checkout, organizer, and admin surfaces.
2. Dual-theme support (light + dark) via CSS custom properties only — no hard-coded palette in components.
3. Enterprise-grade clarity for dashboards and forms without losing consumer event energy.
4. Accessibility-first color contrast and focus behavior.

**Non-goals**

- Marketing site microsite systems outside this app.
- Mobile native component APIs (Kotlin Material mappings live in the apps; tokens stay aligned at the brand level).

---

## 2. Brand Positioning

| Attribute | Direction |
|---|---|
| **Category** | Event discovery & ticketing |
| **Tone** | Cinematic, warm, confident — not cold “AI purple/cyan” |
| **Reference market** | Ticketbox-class consumer energy + clean SaaS organizer tools |
| **Primary accent** | Coral orange — urgency, CTAs, price, active states |
| **Default chrome** | Dark mode first for immersion; light mode fully supported for admin/daytime use |

---

## 3. Design Tokens

All UI color must resolve through CSS variables defined in `globals.css`. Prefer semantic tokens (`--primary`, `--surface`, `--destructive`) over raw hex in JSX/class strings.

### 3.1 Theme modes

| Mode | Class / context | Typical use |
|---|---|---|
| **Light** | `:root` | Organizer dashboards, forms, daytime browsing |
| **Dark** | `.dark` | Public discovery, event detail, checkout immersion |

### 3.2 Core color — Light (`:root`)

| Token | Value | Role |
|---|---|---|
| `--primary` | `#FF8F66` | Brand actions, links emphasis, focus ring |
| `--primary-dark` | `#FF7043` | Hover / pressed primary |
| `--primary-container` | `#FFE8DD` | Soft brand background (chips, highlights) |
| `--on-primary` | `#FFFFFF` | Text/icons on primary fills |
| `--background` | `#F8F9FC` | Page canvas |
| `--foreground` | `#1A1D23` | Default ink |
| `--surface` | `#FFFFFF` | Cards, panels, dialogs |
| `--surface-hover` | `#F0F2F7` | Row/card hover |
| `--surface-border` | `rgba(0,0,0,0.08)` | Dividers, card outlines |
| `--text-primary` | `#1A1D23` | Headings, body high emphasis |
| `--text-secondary` | `#6B7280` | Supporting copy |
| `--text-muted` | `#9CA3AF` | Meta, placeholders, timestamps |

### 3.3 Core color — Dark (`.dark`)

| Token | Value | Role |
|---|---|---|
| `--primary` | `#FF8F66` | Brand actions (shared) |
| `--primary-dark` | `#FF7043` | Hover / pressed |
| `--primary-container` | `#3E1C0A` | Soft brand surface on dark |
| `--on-primary` | `#12141A` | Text on primary fills |
| `--background` | `#12141A` | Page canvas (charcoal blue-grey) |
| `--foreground` | `#E8EAED` | Default ink |
| `--surface` | `#1E212B` | Cards, elevated panels |
| `--surface-hover` | `#262A36` | Hover elevation |
| `--surface-border` | `rgba(255,255,255,0.08)` | Subtle borders |
| `--text-primary` | `#E8EAED` | High emphasis |
| `--text-secondary` | `#B0B3B8` | Medium emphasis |
| `--text-muted` | `#869488` | Low emphasis |

### 3.4 Semantic status

Use for badges, alerts, form validation — never for decorative chrome.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--success` | `#16a34a` | `#2dc275` | Confirmed, available, paid |
| `--warning` | `#D4A017` | `#fcc025` | Pending, limited stock |
| `--error` / `--destructive` | `#dc2626` | `#ffb4ab` | Errors, destructive actions |
| `--info` | `#0891b2` | `#52dcbe` | Neutral system information |

Secondary accents (charts, badges only):

| Token | Role |
|---|---|
| `--secondary-yellow` | Highlight badges |
| `--secondary-blue` | Informational links / chart series |
| `--secondary-green` | Availability / success-adjacent UI |

### 3.5 shadcn / component bridge

Mapped in `globals.css` for shadcn primitives — **do not redefine in components**:

| Token | Purpose |
|---|---|
| `--card`, `--card-foreground` | Card surfaces |
| `--popover`, `--popover-foreground` | Menus, dropdowns |
| `--muted`, `--muted-foreground` | Quiet surfaces |
| `--border`, `--input`, `--ring` | Controls & focus |
| `--radius` | Base radius scale (`0.5rem` default) |
| `--sidebar-*` | Organizer / admin shell |
| `--chart-1` … `--chart-5` | Dashboard series |

### 3.6 Gradients (brand, sparingly)

| Name | Stops | Allowed use |
|---|---|---|
| **Brand CTA** | `#F76B10 → #FF9C5B` (or `#FF8F66 → #FF7043` dark UI) | Primary buttons, hero accents |
| **Surface chrome** | `#171924 → #20222C` | Dark navbar / sticky chrome only |
| **Secondary control** | `#2D313F → #242731` | Dark secondary buttons |

**Rule:** Gradients are for **primary CTAs and hero**, not body text, tables, or form fields.

---

## 4. Typography

| Property | Specification |
|---|---|
| **Family** | Inter (Google Fonts) — geometric sans, UI default |
| **Fallback** | `system-ui, -apple-system, Segoe UI, sans-serif` |
| **Base size** | 16px root; scale via Tailwind type utilities |
| **Heading weight** | 700–800 |
| **Heading tracking** | `-0.025em` |
| **Body weight** | 400–500 |
| **Label / overline** | 600, `letter-spacing: 0.05em`, uppercase sparingly |
| **Price / money** | 700, brand primary color; prefix with locale string (e.g. Vietnamese “Từ”) when showing “from” pricing |

### Type hierarchy (guidance)

| Level | Usage | Approx. scale |
|---|---|---|
| Display | Hero titles | `text-3xl`–`text-5xl` |
| H1 | Page title | `text-2xl`–`text-3xl` |
| H2 | Section | `text-xl`–`text-2xl` |
| H3 | Card title | `text-lg` |
| Body | Default copy | `text-sm`–`text-base` |
| Caption | Meta, timestamps | `text-xs` · muted |

---

## 5. Spacing, radius, elevation

| Token / rule | Value | Notes |
|---|---|---|
| **Content max width** | `1280px` (`max-w-7xl`) | Centered page content |
| **Page gutter** | 16px mobile · 24px tablet+ | Horizontal padding |
| **Section rhythm** | 48–64px vertical | Between major blocks |
| **Card gap** | 24–32px | Grids |
| **Navbar height** | 64px | Sticky; support content offset |
| **Radius — control** | 12px (`rounded-xl`) | Buttons, inputs |
| **Radius — card** | 16px (`rounded-2xl`) | Event cards, panels |
| **Radius — pill** | `rounded-full` | Badges, chips |
| **Shadow — card (dark)** | `0 8px 32px rgba(0,0,0,0.3)` | Elevated surfaces |
| **Shadow — light** | Soft `rgba(0,0,0,0.06–0.12)` | Prefer border over heavy shadow |

---

## 6. Layout system

### 6.1 Grid

| Breakpoint | Event grid | Dashboard |
|---|---|---|
| Mobile | 1 column | Single column stack |
| Tablet | 2 columns | 2-column where useful |
| Desktop | 3 columns | Sidebar + main (`sidebar` tokens) |

### 6.2 Application shells

| Surface | Shell | Notes |
|---|---|---|
| **Public / attendee** | Top nav + content + footer | Discovery, event detail, tickets, checkout |
| **Organizer** | Sidebar + top bar + main | Dashboard, event manage, stats |
| **Admin** | Dense sidebar shell | Moderation, approvals — prefer light or system theme |

### 6.3 Z-index layers

| Layer | Use |
|---|---|
| Base content | 0 |
| Sticky nav | 40 |
| Dropdown / popover | 50 |
| Modal / dialog | 50–100 (stack consistently via shadcn) |
| Toast | Above modal |

---

## 7. Components

Use **shadcn/ui** primitives in `src/components/ui/`. Product components compose them; do not fork visual rules per page.

### 7.1 Buttons

| Variant | Appearance | When |
|---|---|---|
| **Primary** | Brand gradient or solid `--primary`; high contrast label | Main CTA (Buy, Publish, Pay) |
| **Secondary** | Surface fill + border | Secondary actions |
| **Ghost** | Transparent; hover surface | Toolbar, tertiary |
| **Destructive** | `--destructive` | Delete, ban, cancel with impact |

**Interaction**

- Hover: darken primary or strengthen border  
- Active: `scale(0.97)` optional, keep accessible  
- Disabled: 50% opacity, `pointer-events: none`  
- Min touch target: 40×40px  

### 7.2 Cards

| Property | Spec |
|---|---|
| Background | `--surface` / `--card` |
| Border | 1px `--surface-border` |
| Radius | 16px |
| Hover (interactive cards) | Border tint toward primary (~20% alpha), optional `translateY(-2px)` |
| Media | 16:9 or fixed hero crop; always `object-cover` + fallback |

### 7.3 Forms

| Element | Spec |
|---|---|
| Input background | Light: white / dark: translucent surface + blur optional |
| Border | `--input` / surface border |
| Focus | `--ring` = brand primary; visible 2px ring |
| Label | Secondary or primary text, `text-sm` medium |
| Error | `--error` border + helper text |
| Spacing | Consistent vertical stack `gap-2` label→control, `gap-4` field groups |

### 7.4 Badges & status

| Type | Style |
|---|---|
| Category | Quiet surface, uppercase micro label |
| Lifecycle (Draft / Published / …) | Semantic color @ ~10–15% background + solid text |
| Stock | Success / warning / error mapping |

### 7.5 Navigation

- Sticky top bar; glass/blur allowed on dark public surfaces  
- Active route: primary underline or primary text  
- Language / theme controls: icon buttons, ghost variant  

### 7.6 Data display (organizer / admin)

- Tables: compact rows, muted header, zebra optional  
- Stats: large number + muted label; chart colors from `--chart-*`  
- Empty states: short copy + single primary action  

---

## 8. Motion

| Principle | Rule |
|---|---|
| Duration | 150–250ms for UI chrome; ≤ 400ms for cards |
| Easing | `ease-out` for enter; `ease-in-out` for toggle |
| Reduced motion | Respect `prefers-reduced-motion` — disable non-essential motion |
| Loading | Skeleton on surface tokens; never layout jump |

---

## 9. Accessibility

| Requirement | Standard |
|---|---|
| Contrast | Text meets WCAG AA against background/surface |
| Focus | Always visible; never `outline: none` without replacement ring |
| Hit targets | ≥ 40px for primary interactive controls |
| Images | Meaningful `alt`; decorative images empty alt |
| Forms | Labels associated; errors announced in text, not color alone |
| Theme | Both light and dark themes must remain readable |

---

## 10. Content & localization

| Topic | Rule |
|---|---|
| i18n | UI strings via message catalogs (`en` / `vi`); no hard-coded user-facing copy in components long-term |
| Prices | Format with locale; currency VND for V1 |
| Dates | Locale-aware formatting; timezone explicit for event start/end |
| Tone | Clear, action-oriented; avoid jargon on attendee surfaces |

---

## 11. Do / Don’t

| Do | Don’t |
|---|---|
| Use CSS variables from `globals.css` | Hard-code hex in feature components |
| Compose shadcn primitives | Invent one-off button styles per page |
| Prefer surface + border hierarchy | Heavy multi-shadow “glow” UI |
| One primary CTA per view region | Competing gradient CTAs |
| Align mobile brand (coral + charcoal) | Introduce purple/cyan AI default palettes |
| Document token changes here first | Change only Tailwind classes ad hoc |

---

## 12. File map for implementers

| Path | Responsibility |
|---|---|
| `src/app/globals.css` | Token definitions (light/dark) |
| `src/components/ui/*` | Primitive design system components |
| `src/components/layout/*` | Shell (Navbar, Footer) |
| `src/components/**` | Product-level composed UI |
| `messages/en.json`, `messages/vi.json` | Copy |
| This file (`DESIGN.md`) | Human + AI design contract |

---

## 13. Change control

1. Token or brand change → update `globals.css` **and** this document in the same PR.  
2. New component variant → document under §7 if it is reused ≥ 2 places.  
3. One-off marketing experiments may temporarily diverge; merge back or discard within one release.

---

## 14. Version history

| Version | Date | Notes |
|---|---|---|
| 1.0 | — | Initial dark-first palette & component notes |
| **2.0** | 2026-07-11 | Enterprise structure; dual-theme tokens aligned to `globals.css`; shells, a11y, do/don’t, change control |

---

*End of Design System Specification v2.0*
