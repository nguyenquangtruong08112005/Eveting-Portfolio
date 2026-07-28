const { AppError, BadRequestError } = require('@/shared/errors');
const {
  normalizePromotionCode,
  toNonNegativeInteger,
  toPositiveInteger,
} = require('./discount-calculator');

const ERROR_MESSAGES = {
  PROMOTION_NOT_STACKABLE: 'Only one promotion or voucher code can be applied per order.',
  PROMOTION_DISABLED: 'Promotion is not active.',
  PROMOTION_NOT_STARTED: 'Promotion is not active yet.',
  PROMOTION_EXPIRED: 'Promotion has expired.',
  PROMOTION_USAGE_LIMIT_REACHED: 'Promotion usage limit reached.',
  PROMOTION_TICKET_USAGE_LIMIT_REACHED: 'Promotion ticket usage limit reached.',
  PROMOTION_USER_LIMIT_REACHED: 'Promotion per-user limit reached.',
  PROMOTION_EVENT_SCOPE_MISMATCH: 'Promotion is not valid for this event.',
  PROMOTION_ORGANIZER_SCOPE_MISMATCH: 'Promotion is not valid for this organizer.',
  PROMOTION_MINIMUM_SUBTOTAL: 'Order subtotal does not meet the promotion minimum.',
  PROMOTION_MINIMUM_TICKETS: 'Order does not meet the promotion minimum ticket quantity.',
  PROMOTION_MAXIMUM_TICKETS: 'Order exceeds the promotion maximum ticket quantity.',
};

function promotionRuleError(code, details = {}) {
  const error = new AppError(ERROR_MESSAGES[code] || 'Promotion cannot be applied.', 409, code);
  error.details = details;
  return error;
}

function resolveSingleDiscountCode(input = {}) {
  const candidates = [];
  if (input.code != null && String(input.code).trim()) candidates.push(input.code);
  if (input.promoCode != null && String(input.promoCode).trim()) candidates.push(input.promoCode);
  if (input.voucherCode != null && String(input.voucherCode).trim()) candidates.push(input.voucherCode);
  if (Array.isArray(input.codes)) candidates.push(...input.codes);

  const normalized = [...new Set(
    candidates.map((code) => normalizePromotionCode(code, { allowLegacy: true }))
  )];

  if (normalized.length === 0) {
    throw new BadRequestError('One promotion or voucher code is required.');
  }
  if (normalized.length > 1) {
    throw promotionRuleError('PROMOTION_NOT_STACKABLE');
  }

  return normalized[0];
}

function normalizeEligibilityContext(input = {}) {
  return {
    code: resolveSingleDiscountCode(input),
    userId: input.userId || null,
    eventId: input.eventId || null,
    organizerId: input.organizerId || null,
    subtotalVnd: input.subtotalVnd == null
      ? null
      : toNonNegativeInteger(input.subtotalVnd, 'subtotalVnd'),
    ticketQuantity: input.ticketQuantity == null
      ? 1
      : toPositiveInteger(input.ticketQuantity, 'ticketQuantity'),
    now: input.now == null ? Date.now() : Number(input.now),
  };
}

function assertPromotionEligible(promotion, context, userUsageCount = 0) {
  if (!promotion) {
    throw new AppError('Promotion not found.', 404, 'PROMOTION_NOT_FOUND');
  }

  const now = context.now;
  if (promotion.isEnabled === false) {
    throw promotionRuleError('PROMOTION_DISABLED');
  }
  if (promotion.validFrom != null && Number(promotion.validFrom) > now) {
    throw promotionRuleError('PROMOTION_NOT_STARTED');
  }
  if (promotion.validUntil != null && Number(promotion.validUntil) <= now) {
    throw promotionRuleError('PROMOTION_EXPIRED');
  }
  if (promotion.usageLimit != null && Number(promotion.usedCount) >= Number(promotion.usageLimit)) {
    throw promotionRuleError('PROMOTION_USAGE_LIMIT_REACHED');
  }

  const nextTicketCount = Number(promotion.usedTicketCount || 0) + context.ticketQuantity;
  if (
    promotion.ticketUsageLimit != null &&
    nextTicketCount > Number(promotion.ticketUsageLimit)
  ) {
    throw promotionRuleError('PROMOTION_TICKET_USAGE_LIMIT_REACHED');
  }
  if (
    promotion.perUserLimit != null &&
    userUsageCount >= Number(promotion.perUserLimit)
  ) {
    throw promotionRuleError('PROMOTION_USER_LIMIT_REACHED');
  }
  if (promotion.eventId && promotion.eventId !== context.eventId) {
    throw promotionRuleError('PROMOTION_EVENT_SCOPE_MISMATCH');
  }
  if (context.organizerId && promotion.organizerId !== context.organizerId) {
    throw promotionRuleError('PROMOTION_ORGANIZER_SCOPE_MISMATCH');
  }
  if (
    context.subtotalVnd != null &&
    Number(promotion.minOrder || 0) > context.subtotalVnd
  ) {
    throw promotionRuleError('PROMOTION_MINIMUM_SUBTOTAL', {
      minimumSubtotal: Number(promotion.minOrder),
    });
  }
  if (context.ticketQuantity < Number(promotion.minTicketQuantity || 1)) {
    throw promotionRuleError('PROMOTION_MINIMUM_TICKETS', {
      minimumTicketQuantity: Number(promotion.minTicketQuantity || 1),
    });
  }
  if (
    promotion.maxTicketQuantity != null &&
    context.ticketQuantity > Number(promotion.maxTicketQuantity)
  ) {
    throw promotionRuleError('PROMOTION_MAXIMUM_TICKETS', {
      maximumTicketQuantity: Number(promotion.maxTicketQuantity),
    });
  }
}

module.exports = {
  ERROR_MESSAGES,
  assertPromotionEligible,
  normalizeEligibilityContext,
  promotionRuleError,
  resolveSingleDiscountCode,
};
