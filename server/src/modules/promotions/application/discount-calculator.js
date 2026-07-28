const { BadRequestError } = require('@/shared/errors');

const BASIS_POINTS_SCALE = 10000;
const NEW_CODE_PATTERN = /^[A-Z0-9]+$/;
const LEGACY_CODE_PATTERN = /^[A-Z0-9_]+$/;

function normalizePromotionCode(value, options = {}) {
  const code = String(value || '').trim().toUpperCase();
  const pattern = options.allowLegacy ? LEGACY_CODE_PATTERN : NEW_CODE_PATTERN;

  if (!code) {
    throw new BadRequestError('Promotion code is required.');
  }
  if (code.length > 50 || !pattern.test(code)) {
    throw new BadRequestError('Promotion code must contain only uppercase letters and numbers.');
  }

  return code;
}

function toNonNegativeInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new BadRequestError(`${fieldName} must be a non-negative integer.`);
  }
  return number;
}

function toPositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer.`);
  }
  return number;
}

function normalizeDiscountType(value) {
  const type = String(value || '').trim().toLowerCase();
  if (type === 'fixed' || type === 'amount') return 'amount';
  if (type === 'percent') return 'percent';
  throw new BadRequestError('discountType must be percent or amount.');
}

function percentValueToBasisPoints(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new BadRequestError('Percentage discountValue must be greater than zero.');
  }

  // Existing mobile payloads store 20% as 0.20. New callers may use 20.
  const basisPoints = number <= 1
    ? Math.round(number * BASIS_POINTS_SCALE)
    : Math.round(number * 100);

  if (basisPoints < 1 || basisPoints > BASIS_POINTS_SCALE) {
    throw new BadRequestError('Percentage discountValue cannot exceed 100%.');
  }
  return basisPoints;
}

function calculateDiscountBreakdown(promotion, subtotalValue) {
  const subtotalAmount = toNonNegativeInteger(subtotalValue, 'subtotalVnd');
  const discountType = normalizeDiscountType(promotion.discountType);
  let discountAmount;
  let percentageBasisPoints = null;

  if (discountType === 'percent') {
    percentageBasisPoints = percentValueToBasisPoints(promotion.discountValue);
    discountAmount = Number(
      (BigInt(subtotalAmount) * BigInt(percentageBasisPoints)) /
      BigInt(BASIS_POINTS_SCALE)
    );
  } else {
    discountAmount = Math.min(
      subtotalAmount,
      toNonNegativeInteger(promotion.discountValue, 'discountValue')
    );
  }

  if (promotion.maxDiscount != null) {
    discountAmount = Math.min(
      discountAmount,
      toNonNegativeInteger(promotion.maxDiscount, 'maxDiscount')
    );
  }

  const totalAmount = subtotalAmount - discountAmount;

  return {
    code: promotion.code,
    currency: 'VND',
    subtotalAmount,
    discountAmount,
    totalAmount,
    discountType,
    discountValue: Number(promotion.discountValue),
    maxDiscount: promotion.maxDiscount == null ? null : Number(promotion.maxDiscount),
    percentageBasisPoints,
    breakdown: {
      subtotalAmount,
      discountAmount,
      totalAmount,
      currency: 'VND',
    },
  };
}

module.exports = {
  BASIS_POINTS_SCALE,
  calculateDiscountBreakdown,
  normalizeDiscountType,
  normalizePromotionCode,
  percentValueToBasisPoints,
  toNonNegativeInteger,
  toPositiveInteger,
};
