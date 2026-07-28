const express = require('express');
const { body, param } = require('express-validator');
const promoController = require('@/modules/promotions/api/controller');
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');

const router = express.Router();
const newCodeValidator = () => body('code')
  .isString()
  .trim()
  .matches(/^[A-Za-z0-9]+$/)
  .withMessage('code must contain only letters and numbers');

const legacyCodeValidator = () => body('code')
  .isString()
  .trim()
  .matches(/^[A-Za-z0-9_]+$/)
  .withMessage('code contains unsupported characters');

const optionalInteger = (field, minimum) => body(field)
  .optional({ nullable: true })
  .isInt({ min: minimum })
  .withMessage(`${field} must be an integer greater than or equal to ${minimum}`);

const organizerPayloadValidators = [
  body('discountType')
    .optional()
    .isIn(['percent', 'amount', 'fixed'])
    .withMessage('discountType must be percent or amount'),
  body('discountValue')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('discountValue must be greater than zero'),
  body('eventId').optional({ nullable: true }).isString(),
  body('validFrom').optional().isNumeric(),
  body('validUntil').optional().isNumeric(),
  optionalInteger('usageLimit', 1),
  optionalInteger('ticketUsageLimit', 1),
  optionalInteger('perUserLimit', 1),
  optionalInteger('minTicketQuantity', 1),
  optionalInteger('maxTicketQuantity', 1),
  optionalInteger('minOrder', 0),
  optionalInteger('maxDiscount', 0),
  body('isPublic').optional().isBoolean(),
  body('isEnabled').optional().isBoolean(),
];

router.get('/', publicApiLimiter, promoController.getAllPromotions);

router.post(
  '/apply',
  verifyAuthToken,
  [
    legacyCodeValidator(),
    body('eventId').optional({ nullable: true }).isString(),
    body('quantity').optional().isInt({ min: 1 }),
    body('subtotalVnd').optional().isInt({ min: 0 }),
    validateRequest,
  ],
  promoController.applyPromotion
);

router.get(
  '/organizer',
  verifyAuthToken,
  isOrganizer,
  promoController.getOrganizerPromotions
);

router.post(
  '/organizer',
  verifyAuthToken,
  isOrganizer,
  [
    newCodeValidator(),
    body('discountValue')
      .exists()
      .isFloat({ gt: 0 })
      .withMessage('discountValue must be greater than zero'),
    ...organizerPayloadValidators,
    validateRequest,
  ],
  promoController.createPromotion
);

router.put(
  '/organizer/:id',
  verifyAuthToken,
  isOrganizer,
  [
    param('id').isString().notEmpty(),
    body('code')
      .optional()
      .isString()
      .trim()
      .matches(/^[A-Za-z0-9]+$/)
      .withMessage('code must contain only letters and numbers'),
    ...organizerPayloadValidators,
    validateRequest,
  ],
  promoController.updatePromotion
);

router.delete(
  '/organizer/:id',
  verifyAuthToken,
  isOrganizer,
  [param('id').isString().notEmpty(), validateRequest],
  promoController.deletePromotion
);

module.exports = router;
