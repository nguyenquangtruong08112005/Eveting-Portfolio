#!/usr/bin/env node

require('../../src/alias-bootstrap');

const {
  calculateDiscountBreakdown,
} = require('@/modules/promotions/application/discount-calculator');
const {
  createPromotionService,
} = require('@/modules/promotions/application/service');

const failures = [];

function assert(label, condition) {
  if (condition) {
    console.log(`PASS ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL ${label}`);
  }
}

function createFakeRepository(overrides = {}) {
  const promotion = {
    id: 'promo_test',
    organizerId: 'organizer_1',
    code: 'SAVE20',
    eventId: 'event_1',
    validFrom: Date.now() - 1000,
    validUntil: Date.now() + 60000,
    usageLimit: 10,
    usedCount: 0,
    ticketUsageLimit: null,
    usedTicketCount: 0,
    perUserLimit: 2,
    minOrder: 100000,
    minTicketQuantity: 1,
    maxTicketQuantity: 5,
    discountType: 'percent',
    discountValue: 0.2,
    maxDiscount: null,
    isEnabled: true,
    ...overrides,
  };
  const usages = new Map();
  let transactionTail = Promise.resolve();

  const repository = {
    withTransaction(callback) {
      let release;
      const previous = transactionTail;
      transactionTail = new Promise((resolve) => {
        release = resolve;
      });
      return previous
        .then(() => callback({ query() {} }))
        .finally(release);
    },
    async getEventScopeInTransaction(transaction, eventId) {
      if (eventId !== 'event_1') return null;
      return { eventId, organizerId: 'organizer_1' };
    },
    async findPromoByCodeInTransaction(transaction, code, lock, scope) {
      if (code !== promotion.code) return null;
      if (scope.organizerId && scope.organizerId !== promotion.organizerId) return null;
      if (scope.eventId && promotion.eventId && scope.eventId !== promotion.eventId) return null;
      return { ...promotion };
    },
    async getUserActiveUsageCountInTransaction(transaction, promotionId, userId) {
      return [...usages.values()].filter((usage) => (
        usage.promotion_id === promotionId &&
        usage.user_id === userId &&
        ['reserved', 'redeemed'].includes(usage.status)
      )).length;
    },
    async findUsageByOrderInTransaction(transaction, orderId) {
      return usages.get(orderId) || null;
    },
    async createUsageInTransaction(transaction, usage) {
      if (
        promotion.usageLimit != null &&
        promotion.usedCount >= promotion.usageLimit
      ) return null;
      if (
        promotion.ticketUsageLimit != null &&
        promotion.usedTicketCount + usage.ticketQuantity > promotion.ticketUsageLimit
      ) return null;

      promotion.usedCount += 1;
      promotion.usedTicketCount += usage.ticketQuantity;
      const stored = {
        id: usage.id,
        promotion_id: usage.promotionId,
        user_id: usage.userId,
        order_id: usage.orderId,
        event_id: usage.eventId,
        organizer_id: usage.organizerId,
        ticket_quantity: usage.ticketQuantity,
        subtotal_amount: usage.subtotalAmount,
        discount_amount: usage.discountAmount,
        total_amount: usage.totalAmount,
        status: 'reserved',
      };
      usages.set(usage.orderId, stored);
      return stored;
    },
    async markUsageRedeemedInTransaction(transaction, orderId) {
      const usage = usages.get(orderId);
      if (!usage || usage.status !== 'reserved') return null;
      usage.status = 'redeemed';
      return usage;
    },
    async releaseUsageInTransaction(transaction, orderId) {
      const usage = usages.get(orderId);
      if (!usage || usage.status === 'released') return usage || null;
      usage.status = 'released';
      promotion.usedCount = Math.max(0, promotion.usedCount - 1);
      promotion.usedTicketCount = Math.max(
        0,
        promotion.usedTicketCount - usage.ticket_quantity
      );
      return usage;
    },
  };

  return { promotion, repository, usages };
}

function reservation(orderId, userId = 'user_1', ticketQuantity = 1) {
  return {
    code: 'SAVE20',
    orderId,
    userId,
    eventId: 'event_1',
    subtotalVnd: 125000,
    ticketQuantity,
  };
}

async function expectCode(label, promise, expectedCode) {
  try {
    await promise;
    assert(label, false);
  } catch (error) {
    assert(label, error.code === expectedCode);
  }
}

async function run() {
  const percent = calculateDiscountBreakdown(
    { code: 'PERCENT', discountType: 'percent', discountValue: 0.15 },
    99999
  );
  assert('fractional percentage uses deterministic integer floor', percent.discountAmount === 14999);
  assert('percentage total is integer VND', percent.totalAmount === 85000);

  const fixed = calculateDiscountBreakdown(
    { code: 'FIXED', discountType: 'amount', discountValue: 50000 },
    120000
  );
  assert('fixed VND discount is exact', fixed.discountAmount === 50000);
  assert('fixed VND total is exact', fixed.totalAmount === 70000);

  const capped = calculateDiscountBreakdown(
    {
      code: 'CAPPED',
      discountType: 'percent',
      discountValue: 25,
      maxDiscount: 30000,
    },
    200000
  );
  assert('percentage max discount cap is enforced', capped.discountAmount === 30000);

  const quoteState = createFakeRepository();
  const quoteService = createPromotionService(quoteState.repository);
  const quote = await quoteService.quoteDiscount(reservation('order_quote'));
  assert('quote returns deterministic breakdown', quote.discountAmount === 25000);
  assert('quote never accepts a trusted discount input', quote.totalAmount === 100000);

  const belowMinimum = await quoteService.tryQuoteDiscount({
    ...reservation('order_minimum'),
    subtotalVnd: 99999,
  });
  assert(
    'minimum subtotal is enforced',
    belowMinimum.code === 'PROMOTION_MINIMUM_SUBTOTAL'
  );

  const stacked = await quoteService.tryQuoteDiscount({
    ...reservation('order_stacked'),
    voucherCode: 'OTHER20',
  });
  assert('multiple codes are rejected as non-stackable', stacked.code === 'PROMOTION_NOT_STACKABLE');

  const concurrencyState = createFakeRepository({ usageLimit: 1, perUserLimit: 10 });
  const concurrencyService = createPromotionService(concurrencyState.repository);
  const concurrent = await Promise.allSettled([
    concurrencyService.reserveDiscount(reservation('order_a', 'user_a')),
    concurrencyService.reserveDiscount(reservation('order_b', 'user_b')),
  ]);
  assert(
    'concurrent limit-one reservations allow exactly one success',
    concurrent.filter((result) => result.status === 'fulfilled').length === 1
  );
  assert(
    'concurrent loser receives usage-limit error',
    concurrent.some((result) => (
      result.status === 'rejected' &&
      result.reason.code === 'PROMOTION_USAGE_LIMIT_REACHED'
    ))
  );

  const userState = createFakeRepository({ usageLimit: 10, perUserLimit: 1 });
  const userService = createPromotionService(userState.repository);
  await userService.reserveDiscount(reservation('order_user_1'));
  await expectCode(
    'per-user order limit is enforced transactionally',
    userService.reserveDiscount(reservation('order_user_2')),
    'PROMOTION_USER_LIMIT_REACHED'
  );

  const idempotent = await userService.reserveDiscount(reservation('order_user_1'));
  assert('same-order reservation retry is idempotent', idempotent.idempotent === true);

  const ticketState = createFakeRepository({
    usageLimit: 10,
    perUserLimit: 10,
    ticketUsageLimit: 3,
  });
  const ticketService = createPromotionService(ticketState.repository);
  await ticketService.reserveDiscount(reservation('order_ticket_1', 'user_a', 2));
  await expectCode(
    'ticket usage cap is enforced transactionally',
    ticketService.reserveDiscount(reservation('order_ticket_2', 'user_b', 2)),
    'PROMOTION_TICKET_USAGE_LIMIT_REACHED'
  );

  await ticketState.repository.withTransaction((transaction) => {
    return ticketService.releaseReservedDiscountInTransaction(
      transaction,
      'order_ticket_1'
    );
  });
  const afterRelease = await ticketService.reserveDiscount(
    reservation('order_ticket_3', 'user_b', 2)
  );
  assert('release returns capacity for a later order', afterRelease.valid === true);

  if (failures.length > 0) {
    console.error(`\n${failures.length} promotion smoke assertion(s) failed.`);
    process.exitCode = 1;
    return;
  }
  console.log('\nAll Phase 07 promotion business smokes passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
