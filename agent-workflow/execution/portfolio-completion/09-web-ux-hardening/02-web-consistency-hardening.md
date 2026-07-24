# Task 09-T2: Web Consistency, Form Validation & Responsive Flow Polish

## 1. Goal
Perform a comprehensive UX consistency pass across all web views, hardening form validation error states, loading skeletons, error boundaries, and responsive breakpoint behavior.

## 2. Why
Delivers a flawless, professional web user experience expected of a senior-level engineering portfolio.

## 3. Dependencies
- Task `09-T1` (Bo Cong Thuong Removal & Portfolio Demo Disclosures).

## 4. Preconditions
- Web pages building without TypeScript or linting errors.

## 5. In-Scope / Out-of-Scope
- **In-Scope:**
  - Auditing all web forms (Login, Register, Checkout, Event Builder, Organizer Profile, Seat Map Editor) for inline validation errors (Zod + React Hook Form).
  - Replacing generic loading spinners with custom UI skeletons (`LoadingSkeleton.tsx`).
  - Hardening React Error Boundaries (`error.tsx`, `not-found.tsx`) with user-friendly recovery actions.
  - Verifying mobile responsive layouts down to 320px screen width.
  - Ensuring dark/light theme toggle operates smoothly without hydration mismatch warnings (`suppressHydrationWarning`).
- **Out-of-Scope:**
  - Rewriting Tailwind CSS framework to another CSS-in-JS library.

## 6. Likely Source Modules / Files
- `web/src/app/` — [Discovery Target: Next.js pages & layouts]
- `web/src/components/ui/` — [Discovery Target: Shared UI components]
- `web/src/features/` — [Discovery Target: Feature view modules]

## 7. Contracts / Behavior to Preserve
- Standard Next.js 16 App Router conventions (`layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`).

## 8. Ordered Implementation Steps
1. Audit all form components in `web/src/features/` ensuring Zod schema validation messages display localized strings in Vietnamese/English.
2. Add `loading.tsx` skeletons for heavy pages (`/search`, `/attendee/events/[id]`, `/organizer/dashboard`).
3. Audit responsive CSS utilities (`sm:`, `md:`, `lg:`, `xl:`) across mobile, tablet, and desktop viewports.
4. Verify accessibility features (keyboard tab navigation, ARIA labels on modal dialogs).
5. Run full Next.js production build `npm run build`.

## 9. Database / Migration Needs
- None.

## 10. Security Requirements
- Ensure sensitive error tracebacks are hidden in production error boundaries.

## 11. Test / Build / Smoke Commands
- `npm run lint` (in `web/`)
- `npm run build` (in `web/`)

## 12. Acceptance Criteria
- [ ] Production build `npm run build` passes with zero errors or TypeScript warnings.
- [ ] Form submission errors display clear inline field guidance.
- [ ] Zero horizontal scrollbars or overflow issues on 375px mobile viewport.

## 13. Rollback / Feature-Flag Strategy
- Revert individual page layout tweaks via Git if responsive CSS regressions occur.

## 14. Required Artifacts / Handoff Report
- Web build output log and responsive design verification summary.

## 15. Blocker Questions
- Are there any specific browser versions (e.g. Safari iOS 15) that require explicit CSS prefix polyfills?
