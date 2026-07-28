const promotionRepository = require('./promotion.repository');

function toVoucher(promotion) {
  if (!promotion) return null;
  return {
    ...promotion,
    validTo: promotion.validUntil,
  };
}

const findByCode = async (code, scope) => {
  return toVoucher(await promotionRepository.findByCode(code, scope));
};

const incrementUsage = async () => {
  throw new Error(
    'Voucher usage must be reserved through promotionService.reserveDiscountInTransaction().'
  );
};

module.exports = {
  findByCode,
  incrementUsage,
};
