# Phase 05: Payments Engine & Idempotency Foundation

## Overview
Phase 05 builds the core financial transaction engine, implementing the strict `Idempotency-Key` specification, ZaloPay sandbox payment processing, webhook signature verification, order state machine, refund workflows, and payout safeguards for organizers.

## Deliverables
- Core Idempotency Engine middleware and storage provider (`IdempotencyService`).
- ZaloPay Payment Gateway integration module (`ZaloPayProvider`).
- Cryptographic Webhook signature validator (`verifyZaloPaySignature`).
- Financial safeguards against double-refunding and unauthorized payouts.

## Tasks
1. [`01-idempotency-engine.md`](01-idempotency-engine.md) — Core Idempotency Engine (`Idempotency-Key` Spec) — **COMPLETED** ^[Recovery tasks A-C: engine correction, additive migration 065, route middleware ordering. Smoke 20/0 passed 2026-07-27]
2. [`02-payment-zalopay-payout.md`](02-payment-zalopay-payout.md) — ZaloPay Gateway Integration, Refund & Payout Safeguards — **PENDING** ^[No refund or payout work included by current approved scope; T2 T2A/T2B/T2C sub-tasks address payment-state concurrency, attendee polling, and check-status idempotency; ZaloPay sandbox gateway was not fully integrated or tested with a real provider transaction]
