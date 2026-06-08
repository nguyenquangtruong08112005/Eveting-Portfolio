const { ConflictError } = require('@/shared/errors');

async function applyPromotion(promotionRepository, transaction, promoCode, eventId, qty, totalPrice) {
  const foundPromo = await promotionRepository.findPromoByCodeInTransaction(transaction, promoCode);

  if (!foundPromo) return { appliedPromotion: null, totalPrice };

  const appliedPromotion = foundPromo;
  const now = new Date().getTime();

  if (appliedPromotion.validUntil <= now) throw new ConflictError('Promotion has expired.');
  if (appliedPromotion.usedCount >= appliedPromotion.usageLimit) throw new ConflictError('Promotion usage limit reached.');
  if (appliedPromotion.eventId && appliedPromotion.eventId !== eventId) throw new ConflictError('Promotion not valid for this event.');
  if (appliedPromotion.minTicketQuantity && qty < appliedPromotion.minTicketQuantity) {
    throw new ConflictError(`Promotion requires minimum ${appliedPromotion.minTicketQuantity} tickets.`);
  }

  if (appliedPromotion.discountType === 'percent') {
    totalPrice = totalPrice * (1 - appliedPromotion.discountValue);
  } else if (appliedPromotion.discountType === 'amount') {
    totalPrice = Math.max(0, totalPrice - appliedPromotion.discountValue);
  }

  return { appliedPromotion, totalPrice };
}

module.exports = { applyPromotion };
