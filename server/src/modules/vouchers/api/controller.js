const voucherService = require('@/modules/vouchers/application/service');
const asyncHandler = require('@/shared/middleware/asyncHandler');

const requestUserId = (req) => req.user && (req.user.uid || req.user.id);

const validateVoucher = asyncHandler(async (req, res) => {
  const { code, orderTotal, eventId, ticketQuantity } = req.body;
  const result = await voucherService.validateVoucher(code, orderTotal, eventId, {
    ticketQuantity,
    userId: requestUserId(req),
  });
  res.status(200).json(result);
});

const quoteVoucher = asyncHandler(async (req, res) => {
  const {
    code,
    promoCode,
    voucherCode,
    codes,
    eventId,
    subtotalVnd,
    ticketQuantity,
  } = req.body;
  const result = await voucherService.quoteVoucher({
    code,
    promoCode,
    voucherCode,
    codes,
    eventId,
    subtotalVnd,
    ticketQuantity,
    userId: requestUserId(req),
  });
  res.status(200).json(result);
});

module.exports = {
  quoteVoucher,
  validateVoucher,
};
