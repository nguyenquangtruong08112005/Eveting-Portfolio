const promotionService = require('@/modules/promotions/application/service');
const { BadRequestError } = require('@/shared/errors');

const validateVoucher = async (
  code,
  orderTotal,
  eventId = null,
  options = {}
) => {
  if (orderTotal === undefined || orderTotal === null) {
    throw new BadRequestError('Order total is required.');
  }

  return promotionService.tryQuoteDiscount({
    code,
    eventId,
    subtotalVnd: orderTotal,
    ticketQuantity: options.ticketQuantity || 1,
    organizerId: options.organizerId,
    userId: options.userId,
  });
};

const quoteVoucher = async (input) => {
  return promotionService.tryQuoteDiscount({
    code: input.code,
    promoCode: input.promoCode,
    voucherCode: input.voucherCode,
    codes: input.codes,
    eventId: input.eventId,
    subtotalVnd: input.subtotalVnd,
    ticketQuantity: input.ticketQuantity || 1,
    organizerId: input.organizerId,
    userId: input.userId,
  });
};

module.exports = {
  quoteVoucher,
  validateVoucher,
};
