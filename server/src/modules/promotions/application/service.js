const { randomUUID } = require('crypto');
const defaultPromotionRepository = require('@/providers/database/promotion.repository');
const {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} = require('@/shared/errors');
const {
  calculateDiscountBreakdown,
  normalizeDiscountType,
  normalizePromotionCode,
  percentValueToBasisPoints,
  toNonNegativeInteger,
  toPositiveInteger,
} = require('./discount-calculator');
const {
  assertPromotionEligible,
  normalizeEligibilityContext,
  promotionRuleError,
} = require('./promotion-policy');

function optionalPositiveInteger(value, fieldName, fallback = null) {
  if (value == null || value === '') return fallback;
  return toPositiveInteger(value, fieldName);
}

function timestampValue(value, fieldName, fallback) {
  if (value == null || value === '') return fallback;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new BadRequestError(`${fieldName} must be a valid date or timestamp.`);
  }
  return timestamp;
}

function normalizeDiscountValue(type, value) {
  if (value == null || value === '') {
    throw new BadRequestError('discountValue is required.');
  }
  if (type === 'percent') {
    return percentValueToBasisPoints(value) / 10000;
  }
  return toPositiveInteger(value, 'discountValue');
}

function createPromotionService(promotionRepository = defaultPromotionRepository) {
  const getAllPromotions = async () => promotionRepository.getActivePromotions();

  const getPromotionsByOrganizer = async (organizerId) => {
    return promotionRepository.getPromotionsByOrganizer(organizerId);
  };

  const assertOwnedEvent = async (eventId, organizerId) => {
    if (!eventId) return;
    const event = await promotionRepository.getEventById(eventId);
    if (!event) throw new NotFoundError('Event not found.');
    if (event.organizerId !== organizerId) {
      throw new ForbiddenError('You do not own this event.');
    }
  };

  const createPromotion = async (organizerId, promoData) => {
    const code = normalizePromotionCode(promoData.code);
    const discountType = normalizeDiscountType(promoData.discountType || 'amount');
    const discountValue = normalizeDiscountValue(discountType, promoData.discountValue);
    const existingPromotion = await promotionRepository.findByCode(code);

    if (existingPromotion) {
      throw new ConflictError(`Promotion code '${code}' already exists.`);
    }

    await assertOwnedEvent(promoData.eventId, organizerId);

    const now = Date.now();
    const validFrom = timestampValue(promoData.validFrom, 'validFrom', now);
    const validUntil = timestampValue(
      promoData.validUntil,
      'validUntil',
      now + 30 * 24 * 60 * 60 * 1000
    );
    if (validUntil <= validFrom) {
      throw new BadRequestError('validUntil must be after validFrom.');
    }

    const minTicketQuantity = optionalPositiveInteger(
      promoData.minTicketQuantity,
      'minTicketQuantity',
      1
    );
    const maxTicketQuantity = optionalPositiveInteger(
      promoData.maxTicketQuantity,
      'maxTicketQuantity'
    );
    if (maxTicketQuantity != null && maxTicketQuantity < minTicketQuantity) {
      throw new BadRequestError('maxTicketQuantity must be at least minTicketQuantity.');
    }

    const promotion = {
      id: `promo_${randomUUID()}`,
      organizerId,
      code,
      name: promoData.name || 'Discount Code',
      description: promoData.description || '',
      imageUrl: promoData.imageUrl || promoData.promoImage || null,
      discountType,
      discountValue,
      maxDiscount: promoData.maxDiscount == null
        ? null
        : toNonNegativeInteger(promoData.maxDiscount, 'maxDiscount'),
      minOrder: promoData.minOrder == null
        ? 0
        : toNonNegativeInteger(promoData.minOrder, 'minOrder'),
      minTicketQuantity,
      maxTicketQuantity,
      eventId: promoData.eventId || null,
      validFrom,
      validUntil,
      usageLimit: optionalPositiveInteger(promoData.usageLimit, 'usageLimit', 100),
      usedCount: 0,
      ticketUsageLimit: optionalPositiveInteger(
        promoData.ticketUsageLimit,
        'ticketUsageLimit'
      ),
      usedTicketCount: 0,
      perUserLimit: optionalPositiveInteger(promoData.perUserLimit, 'perUserLimit', 1),
      isPublic: promoData.isPublic === true,
      isEnabled: promoData.isEnabled !== false,
      createdAt: now,
    };

    await promotionRepository.createPromotion(promotion.id, promotion);
    return promotion;
  };

  const updatePromotion = async (promoId, organizerId, updateData) => {
    const current = await promotionRepository.getPromotionById(promoId);
    if (!current) throw new NotFoundError('Promotion not found.');
    if (current.organizerId !== organizerId) throw new ForbiddenError();

    const updates = {};
    if (updateData.code !== undefined) {
      const code = normalizePromotionCode(updateData.code);
      if (code !== current.code) {
        const existingPromotion = await promotionRepository.findByCode(code);
        if (existingPromotion && existingPromotion.id !== promoId) {
          throw new ConflictError(`Promotion code '${code}' already exists.`);
        }
      }
      updates.code = code;
    }

    if (updateData.eventId !== undefined) {
      await assertOwnedEvent(updateData.eventId, organizerId);
      updates.eventId = updateData.eventId || null;
    }
    if (updateData.name !== undefined) updates.name = String(updateData.name);
    if (updateData.description !== undefined) updates.description = String(updateData.description);
    if (updateData.imageUrl !== undefined) updates.imageUrl = updateData.imageUrl || null;
    if (updateData.promoImage !== undefined) updates.imageUrl = updateData.promoImage || null;

    const nextType = updateData.discountType === undefined
      ? current.discountType
      : normalizeDiscountType(updateData.discountType);
    if (updateData.discountType !== undefined) updates.discountType = nextType;
    if (updateData.discountValue !== undefined) {
      updates.discountValue = normalizeDiscountValue(nextType, updateData.discountValue);
    } else if (
      updateData.discountType !== undefined &&
      current.discountValue != null
    ) {
      normalizeDiscountValue(nextType, current.discountValue);
    }

    for (const field of ['maxDiscount', 'minOrder']) {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field] == null
          ? null
          : toNonNegativeInteger(updateData[field], field);
      }
    }
    for (const field of ['usageLimit', 'perUserLimit', 'minTicketQuantity']) {
      if (updateData[field] !== undefined) {
        updates[field] = toPositiveInteger(updateData[field], field);
      }
    }
    for (const field of ['ticketUsageLimit', 'maxTicketQuantity']) {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field] == null
          ? null
          : toPositiveInteger(updateData[field], field);
      }
    }

    const nextMinimum = updates.minTicketQuantity ?? current.minTicketQuantity ?? 1;
    const nextMaximum = updates.maxTicketQuantity !== undefined
      ? updates.maxTicketQuantity
      : current.maxTicketQuantity;
    if (nextMaximum != null && nextMaximum < nextMinimum) {
      throw new BadRequestError('maxTicketQuantity must be at least minTicketQuantity.');
    }

    if (updateData.validFrom !== undefined) {
      updates.validFrom = timestampValue(updateData.validFrom, 'validFrom');
    }
    if (updateData.validUntil !== undefined) {
      updates.validUntil = timestampValue(updateData.validUntil, 'validUntil');
    }
    const nextValidFrom = updates.validFrom ?? current.validFrom;
    const nextValidUntil = updates.validUntil ?? current.validUntil;
    if (nextValidUntil <= nextValidFrom) {
      throw new BadRequestError('validUntil must be after validFrom.');
    }

    if (updateData.isPublic !== undefined) updates.isPublic = updateData.isPublic === true;
    if (updateData.isEnabled !== undefined) updates.isEnabled = updateData.isEnabled === true;

    await promotionRepository.updatePromotion(promoId, updates);
    return { ...current, ...updates, id: promoId };
  };

  const deletePromotion = async (promoId, organizerId) => {
    const promotion = await promotionRepository.getPromotionById(promoId);
    if (!promotion) throw new NotFoundError('Promotion not found.');
    if (promotion.organizerId !== organizerId) throw new ForbiddenError();
    await promotionRepository.deletePromotion(promoId);
    return { success: true };
  };

  const resolveContextScope = async (transaction, rawContext) => {
    const context = normalizeEligibilityContext(rawContext);
    let organizerId = context.organizerId;

    if (context.eventId) {
      const eventScope = await promotionRepository.getEventScopeInTransaction(
        transaction,
        context.eventId
      );
      if (!eventScope) throw new NotFoundError('Event not found.');
      if (organizerId && eventScope.organizerId !== organizerId) {
        throw promotionRuleError('PROMOTION_ORGANIZER_SCOPE_MISMATCH');
      }
      organizerId = eventScope.organizerId;
    }

    return { ...context, organizerId };
  };

  const loadPromotionInTransaction = async (transaction, rawContext, lock) => {
    const context = await resolveContextScope(transaction, rawContext);
    const promotion = await promotionRepository.findPromoByCodeInTransaction(
      transaction,
      context.code,
      lock,
      { organizerId: context.organizerId, eventId: context.eventId }
    );
    if (!promotion) {
      throw new AppError('Promotion not found.', 404, 'PROMOTION_NOT_FOUND');
    }
    return { promotion, context };
  };

  const evaluateInTransaction = async (transaction, rawContext, lock) => {
    const { promotion, context } = await loadPromotionInTransaction(
      transaction,
      rawContext,
      lock
    );
    const userUsageCount = context.userId
      ? await promotionRepository.getUserActiveUsageCountInTransaction(
        transaction,
        promotion.id,
        context.userId
      )
      : 0;
    assertPromotionEligible(promotion, context, userUsageCount);

    const calculation = context.subtotalVnd == null
      ? null
      : calculateDiscountBreakdown(promotion, context.subtotalVnd);
    return { promotion, context, calculation };
  };

  const quoteDiscountInTransaction = async (transaction, rawContext) => {
    if (!rawContext.userId) throw new UnauthorizedError();
    const result = await evaluateInTransaction(transaction, rawContext, false);
    return {
      valid: true,
      message: `Promotion ${result.promotion.code} applied.`,
      ...result.calculation,
      code: result.promotion.code,
      discountType: result.promotion.discountType,
      discountValue: Number(result.promotion.discountValue),
      minTicketQuantity: Number(result.promotion.minTicketQuantity || 1),
      maxTicketQuantity: result.promotion.maxTicketQuantity,
    };
  };

  const quoteDiscount = async (rawContext) => {
    return promotionRepository.withTransaction((transaction) => {
      return quoteDiscountInTransaction(transaction, rawContext);
    });
  };

  const tryQuoteDiscount = async (rawContext) => {
    try {
      return await quoteDiscount(rawContext);
    } catch (error) {
      if (error instanceof AppError && error.statusCode < 500) {
        return {
          valid: false,
          code: error.code,
          message: error.message,
          details: error.details,
        };
      }
      throw error;
    }
  };

  const validatePromotionCode = async (
    code,
    eventId,
    ticketQuantity = 1,
    options = {}
  ) => {
    return tryQuoteDiscount({
      code,
      eventId,
      ticketQuantity,
      subtotalVnd: options.subtotalVnd,
      organizerId: options.organizerId,
      userId: options.userId,
    });
  };

  const reserveDiscountInTransaction = async (transaction, rawContext) => {
    if (!transaction || typeof transaction.query !== 'function') {
      throw new BadRequestError('A checkout transaction is required.');
    }
    if (!rawContext.userId) throw new UnauthorizedError();
    if (!rawContext.orderId) throw new BadRequestError('orderId is required.');
    if (rawContext.subtotalVnd == null) {
      throw new BadRequestError('subtotalVnd is required.');
    }

    const loaded = await loadPromotionInTransaction(transaction, rawContext, true);
    const existingUsage = await promotionRepository.findUsageByOrderInTransaction(
      transaction,
      rawContext.orderId,
      true
    );

    if (existingUsage) {
      if (
        existingUsage.promotion_id !== loaded.promotion.id ||
        existingUsage.user_id !== loaded.context.userId
      ) {
        throw promotionRuleError('PROMOTION_NOT_STACKABLE');
      }
      if (existingUsage.status !== 'released') {
        if (
          Number(existingUsage.subtotal_amount) !== loaded.context.subtotalVnd ||
          Number(existingUsage.ticket_quantity) !== loaded.context.ticketQuantity ||
          existingUsage.event_id !== loaded.context.eventId
        ) {
          throw new AppError(
            'Promotion reservation retry does not match the original order.',
            422,
            'PROMOTION_RESERVATION_MISMATCH'
          );
        }
        return {
          valid: true,
          idempotent: true,
          usageId: existingUsage.id,
          status: existingUsage.status,
          code: loaded.promotion.code,
          currency: 'VND',
          subtotalAmount: Number(existingUsage.subtotal_amount),
          discountAmount: Number(existingUsage.discount_amount),
          totalAmount: Number(existingUsage.total_amount),
          discountType: loaded.promotion.discountType,
          discountValue: Number(loaded.promotion.discountValue),
        };
      }
      throw new ConflictError('A released promotion reservation cannot be reused.');
    }

    const userUsageCount = await promotionRepository.getUserActiveUsageCountInTransaction(
      transaction,
      loaded.promotion.id,
      loaded.context.userId
    );
    assertPromotionEligible(loaded.promotion, loaded.context, userUsageCount);
    const calculation = calculateDiscountBreakdown(
      loaded.promotion,
      loaded.context.subtotalVnd
    );

    const usage = await promotionRepository.createUsageInTransaction(transaction, {
      id: `vuse_${randomUUID()}`,
      promotionId: loaded.promotion.id,
      userId: loaded.context.userId,
      orderId: rawContext.orderId,
      eventId: loaded.context.eventId,
      organizerId: loaded.context.organizerId,
      ticketQuantity: loaded.context.ticketQuantity,
      subtotalAmount: calculation.subtotalAmount,
      discountAmount: calculation.discountAmount,
      totalAmount: calculation.totalAmount,
    });
    if (!usage) throw promotionRuleError('PROMOTION_USAGE_LIMIT_REACHED');

    return {
      valid: true,
      idempotent: false,
      usageId: usage.id,
      status: usage.status,
      code: loaded.promotion.code,
      ...calculation,
    };
  };

  const reserveDiscount = async (rawContext) => {
    return promotionRepository.withTransaction((transaction) => {
      return reserveDiscountInTransaction(transaction, rawContext);
    });
  };

  const redeemReservedDiscountInTransaction = async (transaction, orderId) => {
    if (!transaction || typeof transaction.query !== 'function') {
      throw new BadRequestError('A checkout transaction is required.');
    }
    if (!orderId) throw new BadRequestError('orderId is required.');
    return promotionRepository.markUsageRedeemedInTransaction(transaction, orderId);
  };

  const releaseReservedDiscountInTransaction = async (transaction, orderId) => {
    if (!transaction || typeof transaction.query !== 'function') {
      throw new BadRequestError('A checkout transaction is required.');
    }
    if (!orderId) throw new BadRequestError('orderId is required.');
    return promotionRepository.releaseUsageInTransaction(transaction, orderId);
  };

  return {
    createPromotion,
    deletePromotion,
    getAllPromotions,
    getPromotionsByOrganizer,
    quoteDiscount,
    quoteDiscountInTransaction,
    redeemReservedDiscountInTransaction,
    releaseReservedDiscountInTransaction,
    reserveDiscount,
    reserveDiscountInTransaction,
    tryQuoteDiscount,
    updatePromotion,
    validatePromotionCode,
  };
}

const service = createPromotionService();

module.exports = {
  ...service,
  createPromotionService,
};
