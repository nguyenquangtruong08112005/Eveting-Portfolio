const promoService = require('@/modules/promotions/application/service');
const asyncHandler = require('@/shared/middleware/asyncHandler');
const logger = require('@/shared/logger');

const requestUserId = (req) => req.user && (req.user.uid || req.user.id);

const getAllPromotions = asyncHandler(async (req, res) => {
  const promotions = await promoService.getAllPromotions();
  res.status(200).json(promotions);
});

const applyPromotion = asyncHandler(async (req, res) => {
  const { code, eventId, quantity, subtotalVnd } = req.body;
  const result = await promoService.validatePromotionCode(
    code,
    eventId,
    quantity || 1,
    {
      subtotalVnd,
      userId: requestUserId(req),
    }
  );

  if (!result.valid) {
    const status = result.code === 'PROMOTION_NOT_FOUND' ? 404 : 409;
    return res.status(status).json({ error: result.message, code: result.code });
  }
  return res.status(200).json(result);
});

const getOrganizerPromotions = asyncHandler(async (req, res) => {
  const promotions = await promoService.getPromotionsByOrganizer(requestUserId(req));
  res.status(200).json(promotions);
});

const createPromotion = asyncHandler(async (req, res) => {
  const promotion = await promoService.createPromotion(requestUserId(req), req.body);
  logger.info('Promotion created', {
    promotionId: promotion.id,
    organizerId: promotion.organizerId,
  });
  res.status(201).json(promotion);
});

const updatePromotion = asyncHandler(async (req, res) => {
  const promotion = await promoService.updatePromotion(
    req.params.id,
    requestUserId(req),
    req.body
  );
  logger.info('Promotion updated', {
    promotionId: promotion.id,
    organizerId: requestUserId(req),
  });
  res.status(200).json(promotion);
});

const deletePromotion = asyncHandler(async (req, res) => {
  await promoService.deletePromotion(req.params.id, requestUserId(req));
  logger.info('Promotion deleted', {
    promotionId: req.params.id,
    organizerId: requestUserId(req),
  });
  res.status(204).send();
});

module.exports = {
  applyPromotion,
  createPromotion,
  deletePromotion,
  getAllPromotions,
  getOrganizerPromotions,
  updatePromotion,
};
