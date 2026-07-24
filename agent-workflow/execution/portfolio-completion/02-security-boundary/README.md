# Phase 02: Public API Security Boundary & Controls

## Overview
Phase 02 hardens the public API perimeter by enforcing strict Role-Based Access Control (RBAC) and resource ownership boundaries, input validation (Zod schemas), parameterized SQL queries, Redis rate limiting, CORS policies, private Docker container networking, Cloudflare WAF integration, and Google Play Integrity / mobile attestation architecture.

## Deliverables
- Centralized RBAC and resource ownership verification middleware (`requireRole`, `requireOwnership`).
- Input validation middleware enforcing strict Zod payload validation on all routes.
- Distributed Redis rate limiter per IP / User ID.
- Strict CORS origin whitelist and private Docker service isolation.
- Cloudflare WAF rule configuration documentation.
- Play Integrity / Mobile attestation design document.

## Tasks
1. [`01-rbac-ownership-boundary.md`](01-rbac-ownership-boundary.md) — Public API Security Boundary & RBAC Ownership Enforcement
2. [`02-rate-limit-cors-waf.md`](02-rate-limit-cors-waf.md) — Rate Limiting, CORS & Cloudflare WAF Hardening
3. [`03-mobile-attestation-design.md`](03-mobile-attestation-design.md) — Mobile Attestation & App Integrity Design
