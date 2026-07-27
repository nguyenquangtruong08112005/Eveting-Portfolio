# Phase 05: Payments Engine & Idempotency Foundation

## Overview
Phase 05 builds the core financial transaction engine, implementing the strict `Idempotency-Key` specification, ZaloPay sandbox payment processing, webhook signature verification, order state machine, simulated payout automation, and organizer payment finance APIs.

## Deliverables
- Core Idempotency Engine middleware and storage provider (`IdempotencyService`).
- ZaloPay Payment Gateway integration module (`ZaloPayProvider`).
- Cryptographic Webhook signature validator (`verifyZaloPaySignature`).
- Simulated payout foundation with AES-256-GCM bank account encryption, eligibility (7-day hold, 100K minimum, first/high >= 10M VND admin approval gate), weekly batch, 5-minute reconciliation.
- Organizer payout dashboard data (summary, list, bank account) and admin payout approval endpoint.

## Tasks
1. [`01-idempotency-engine.md`](01-idempotency-engine.md) — Core Idempotency Engine (`Idempotency-Key` Spec) — **COMPLETED** ^[Recovery tasks A-C: engine correction, additive migration 065, route middleware ordering. Smoke 20/0 passed 2026-07-27]
2. [`02-payment-zalopay-payout.md`](02-payment-zalopay-payout.md) — ZaloPay Gateway Integration, Refund & Payout Safeguards — **IMPLEMENTED - RUNTIME VERIFICATION PENDING** ^[T2A: check-status FOR UPDATE lock + race smoke 40/0; T2B: attendee 3s×8 polling + pending-confirmation UI; T2C: check-status idempotency wiring; T2D: simulated payout foundation with migrations 066-069, AES-256-GCM bank encryption, eligibility, admin approval gate, simulated provider; T2E-1: automated weekly batch + 5-min reconciliation cron; T2E-2: organizer GET/PUT payout APIs + admin payout approve endpoint. Server commits d3ad9c3, 24a06b7, c1626b2. Web commit 769da37. Mobile-organizer commit 28ab1fd. Smoke evidence: foundation 19/0, automation 16/0, API 28/0. Pending: local ngrok + deployed staging ZaloPay sandbox transaction and callback verification. Refund workflow deferred by approved scope.]
