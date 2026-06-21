# Design System: AuraEvents Web Portal
**Aligned with**: Mobile-2025-Eventing (Consumer) & Mobile-2025-Eventing-Organizer

## 1. Visual Theme & Atmosphere

Dark-mode-first, warm-toned event discovery platform inspired by Ticketbox.vn.
The atmosphere is **cinematic and immersive** — deep charcoal backgrounds with
blue-grey undertones, accented by a vibrant Coral Orange that evokes excitement
and energy. The design avoids cold purple/cyan AI aesthetics in favor of the
warm, human palette established by the Kotlin mobile apps.

## 2. Color Palette & Roles

### Primary
| Token | Hex | Role |
|-------|-----|------|
| `--primary` | `#F76B10` | Primary actions, CTAs, active states (light mode origin) |
| `--primary-dark` | `#FF8F66` | Softer coral for dark surfaces, hover highlights |
| `--primary-container` | `#3E1C0A` | Contained backgrounds behind primary content |
| `--on-primary` | `#12141A` | Text on primary-colored surfaces |

### Backgrounds & Surfaces
| Token | Hex | Role |
|-------|-----|------|
| `--background` | `#12141A` | Page background (deep charcoal with blue-grey) |
| `--surface` | `#1E212B` | Cards, modals, elevated containers |
| `--surface-hover` | `#262A36` | Hovered card state |
| `--surface-border` | `rgba(255,255,255,0.06)` | Subtle card borders |

### Secondary
| Token | Hex | Role |
|-------|-----|------|
| `--secondary-yellow` | `#FBBE47` / `#FFD54F` | Badges, warnings, highlights |
| `--secondary-blue` | `#3B82F7` / `#64B5F6` | Info states, links |
| `--secondary-green` | `#2D9687` / `#81C784` | Success, availability |
| `--secondary-dark-orange` | `#8C3700` / `#FFAB91` | Muted accent, tertiary |

### Semantic
| Token | Hex | Role |
|-------|-----|------|
| `--info` | `#2F80ED` / `#64B5F6` | Informational badges and alerts |
| `--success` | `#27AE60` / `#81C784` | Success states, confirmations |
| `--warning` | `#E2B93B` / `#FFD54F` | Warnings, pending states |
| `--error` | `#EB5757` / `#E57373` | Errors, destructive actions |

### Typography
| Token | Hex | Role |
|-------|-----|------|
| `--text-primary` | `#E8EAED` | High-emphasis body and headings |
| `--text-secondary` | `#B0B3B8` | Medium-emphasis, descriptions |
| `--text-muted` | `#6B7280` | Low-emphasis, timestamps |
| `--text-on-dark` | `#12141A` | Text on bright surfaces |

### Gradients
| Name | Definition | Usage |
|------|-----------|-------|
| Orange Linear | `#F76B10 → #FF9C5B` | CTA buttons, hero accents |
| Dark Orange Linear | `#FF8F66 → #FF7043` | Dark mode CTA buttons |
| Surface Linear | `#171924 → #20222C` | Navbar, elevated surfaces |
| Button Linear Dark | `#2D313F → #242731` | Secondary button backgrounds |

## 3. Typography Rules

- **Font Family**: Inter (Google Fonts) — clean, modern geometric sans-serif
- **Headings**: `font-weight: 700-800`, tight tracking (`-0.025em`)
- **Body**: `font-weight: 400-500`, normal tracking
- **Labels/Caps**: `font-weight: 600`, `letter-spacing: 0.05em`, uppercase
- **Price display**: `font-weight: 700`, uses `--primary` color with "Từ" prefix

## 4. Component Stylings

### Buttons
- **Primary**: Gradient background (`--primary` → `#FF9C5B`), rounded-xl (12px), 
  white text, subtle shadow. Active: `scale(0.97)`.
- **Secondary**: `--surface` background, `--surface-border` border, rounded-xl.
  Hover: border becomes `--primary-dark` with 30% opacity.
- **Ghost**: Transparent, text only. Hover: `--surface` background.

### Cards / Containers
- Background: `--surface` (`#1E212B`)
- Border: 1px solid `rgba(255,255,255,0.06)`
- Border-radius: 16px (`rounded-2xl`)
- Shadow: `0 8px 32px rgba(0,0,0,0.3)`
- Hover: border-color transitions to `rgba(255,143,102,0.2)`, translateY(-2px)

### Inputs / Forms
- Background: `rgba(30,33,43,0.6)` with backdrop-blur
- Border: 1px solid `rgba(255,255,255,0.08)`
- Focus: border-color `--primary-dark`, ring `rgba(255,143,102,0.15)`
- Border-radius: 12px
- Text: `--text-primary`, placeholder: `--text-muted`

### Badges
- Category badges: `--surface` bg, small uppercase text, rounded-full
- Status badges: semantic colors with 10% opacity background

## 5. Layout Principles

- **Max content width**: 1280px (`max-w-7xl`)
- **Horizontal padding**: 24px on mobile, consistent across breakpoints
- **Grid**: 3-column on desktop, 2-col on tablet, 1-col on mobile
- **Card gap**: 24px-32px
- **Section spacing**: 48px-64px vertical rhythm
- **Navbar height**: 64px, sticky, glassmorphic blur
