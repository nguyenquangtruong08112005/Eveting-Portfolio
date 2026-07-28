const express = require('express');
const { param, body, query } = require('express-validator');
const multer = require('multer');
const organizerController = require('@/modules/organizer/api/controller');
const orderController = require('@/modules/organizer/api/order-operations.controller');
const paymentProfileController = require('@/modules/organizer/api/payment-profile.controller');
const analyticsController = require('@/modules/analytics/api/controller');
const teamController = require('@/modules/memberships/api/team.controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const { auditLog } = require('@/shared/middleware/authz.middleware');
const idempotency = require('@/shared/middleware/idempotency.middleware');
const {
    requirePrimaryOrganizer,
    requireEventPermission,
} = require('@/modules/memberships/api/organizer-rbac.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const eventIdValidation = [
    param('eventId').notEmpty().withMessage('eventId is required'),
    validateRequest,
];
const orderFilterValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 })
        .withMessage('limit must be between 1 and 100'),
    query('status').optional().isIn([
        'pending_payment',
        'paid',
        'cancelled',
        'expired',
        'failed',
    ]).withMessage('status is invalid'),
    query('search').optional().isLength({ max: 200 })
        .withMessage('search must be at most 200 characters'),
    validateRequest,
];

// Legacy mobile scanner contract. Keep its invalid-QR DTO isolated from the
// shared validation middleware used by every other organizer endpoint.
const validateLegacyQrToken = (req, res, next) => {
    const qrToken = req.body?.qrToken;
    if (typeof qrToken !== 'string' || qrToken.trim().length === 0) {
        return res.status(400).json({ valid: false, error: 'INVALID_TICKET' });
    }
    return next();
};

router.use(verifyAuthToken);

router.post(
    '/register',
    [
        body('organizationName').notEmpty().withMessage('organizationName is required'),
        validateRequest,
    ],
    auditLog('organizer:register', 'organizer', 'userId'),
    organizerController.registerOrganizer
);

router.post(
    '/orders/:orderId/tax-invoice-request',
    [
        param('orderId').notEmpty().withMessage('orderId is required'),
        body('companyName').trim().notEmpty().isLength({ max: 250 }),
        body('taxNumber').trim().notEmpty().isLength({ max: 50 }),
        body('billingAddress').trim().notEmpty().isLength({ max: 1000 }),
        body('recipientEmail').isEmail().withMessage('recipientEmail must be valid'),
        validateRequest,
    ],
    auditLog('tax-invoice:request', 'order', 'orderId'),
    paymentProfileController.requestTaxInvoice
);

router.post(
    '/team/invitations/:token/accept',
    [
        param('token').isLength({ min: 32, max: 200 })
            .withMessage('invitation token is invalid'),
        validateRequest,
    ],
    teamController.acceptInvitation
);

router.get('/team/memberships', teamController.getMyTeams);

router.post(
    '/check-in-qr',
    [
        validateLegacyQrToken,
        body('direction').optional().isIn(['entry', 'exit'])
            .withMessage('direction must be entry or exit'),
        validateRequest,
    ],
    auditLog('ticket:check-in', 'ticket', 'qrToken'),
    organizerController.checkInByQr
);

router.get('/me', requirePrimaryOrganizer, organizerController.getOrganizerProfile);
router.get('/ledger', requirePrimaryOrganizer, organizerController.getLedger);
router.put('/me', requirePrimaryOrganizer, organizerController.updateOrganizerProfile);

router.get(
    '/me/events',
    requirePrimaryOrganizer,
    [
        query('page').optional().isInt({ min: 1 })
            .withMessage('page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 })
            .withMessage('limit must be between 1 and 100'),
        validateRequest,
    ],
    organizerController.getMyEvents
);

router.get(
    '/me/stats',
    requirePrimaryOrganizer,
    organizerController.getStatsOverview
);

router.get(
    '/events/:eventId/stats',
    eventIdValidation,
    requireEventPermission('VIEW_REVENUE'),
    organizerController.getEventStats
);

router.get(
    '/events/:eventId/seat-layout',
    [
        ...eventIdValidation,
        query('performanceId').notEmpty().withMessage('performanceId is required'),
        validateRequest,
    ],
    requireEventPermission('EDIT_EVENT'),
    organizerController.getSeatLayout
);

router.put(
    '/events/:eventId/seat-layout',
    [
        ...eventIdValidation,
        query('performanceId').notEmpty().withMessage('performanceId is required'),
        body('layout').isObject().withMessage('layout must be an object'),
        validateRequest,
    ],
    requireEventPermission('EDIT_EVENT'),
    auditLog('seat-layout:update', 'event', 'eventId'),
    organizerController.saveSeatLayout
);

router.get(
    '/events/:eventId/analytics',
    eventIdValidation,
    requireEventPermission('VIEW_ANALYTICS'),
    analyticsController.getTrafficDashboard
);

router.get(
    '/events/:eventId/revenue',
    eventIdValidation,
    requireEventPermission('VIEW_REVENUE'),
    analyticsController.getRevenueDashboard
);

router.get(
    '/events/:eventId/check-in',
    eventIdValidation,
    requireEventPermission('VIEW_CHECKIN_REPORTS'),
    analyticsController.getCheckInDashboard
);

router.get(
    '/events/:eventId/orders/export',
    eventIdValidation,
    orderFilterValidation,
    requireEventPermission('EXPORT_ORDER_REPORTS'),
    auditLog('orders:export', 'event', 'eventId'),
    orderController.exportOrders
);

router.post(
    '/events/:eventId/orders/send-email',
    [
        ...eventIdValidation,
        body('orderIds').optional().isArray({ max: 100 })
            .withMessage('orderIds must contain at most 100 order IDs'),
        body('orderIds.*').optional().isString().notEmpty(),
        body('subject').trim().notEmpty().isLength({ max: 200 }),
        body('message').trim().notEmpty().isLength({ max: 10000 }),
        validateRequest,
    ],
    requireEventPermission('SEND_CUSTOMER_EMAIL'),
    auditLog('orders:send-email', 'event', 'eventId'),
    orderController.sendCustomerEmail
);

router.get(
    '/events/:eventId/orders',
    eventIdValidation,
    orderFilterValidation,
    requireEventPermission('VIEW_ORDERS'),
    orderController.listOrders
);

router.get(
    '/events/:eventId/tax-invoice-requests',
    [
        ...eventIdValidation,
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('status').optional().isIn([
            'REQUESTED',
            'PROCESSING',
            'ISSUED',
            'REJECTED',
        ]),
        validateRequest,
    ],
    requireEventPermission('VIEW_ORDERS'),
    orderController.listTaxInvoiceRequests
);

router.get(
    '/events/:eventId/attendees',
    eventIdValidation,
    requireEventPermission('VIEW_ORDERS'),
    organizerController.getEventAttendees
);

router.post(
    '/events/:eventId/attendees/import',
    eventIdValidation,
    requireEventPermission('EDIT_EVENT'),
    upload.single('file'),
    auditLog('attendees:import', 'event', 'eventId'),
    organizerController.importAttendees
);

router.get(
    '/events/:eventId/attendees/export',
    eventIdValidation,
    requireEventPermission('EXPORT_ORDER_REPORTS'),
    auditLog('attendees:export', 'event', 'eventId'),
    organizerController.exportAttendees
);

router.post(
    '/events/:eventId/broadcast',
    [
        ...eventIdValidation,
        body('title').trim().notEmpty().isLength({ max: 200 }),
        body('message').trim().notEmpty().isLength({ max: 10000 }),
        validateRequest,
    ],
    requireEventPermission('SEND_CUSTOMER_EMAIL'),
    auditLog('notification:broadcast', 'event', 'eventId'),
    organizerController.broadcastNotification
);

router.get(
    '/payment-profile',
    requirePrimaryOrganizer,
    paymentProfileController.getPaymentProfile
);

router.post(
    '/payment-profile',
    requirePrimaryOrganizer,
    [
        body('fullName').trim().notEmpty().isLength({ max: 200 }),
        body('bankAccountNumber').trim().matches(/^[0-9 ]{6,32}$/)
            .withMessage('bankAccountNumber must contain 6 to 24 digits'),
        body('bankName').trim().notEmpty().isLength({ max: 200 }),
        body('bankBranch').optional().trim().isLength({ max: 250 }),
        body('redInvoiceEnabled').isBoolean()
            .withMessage('redInvoiceEnabled must be boolean'),
        body('businessType').isIn(['individual', 'company', 'household'])
            .withMessage('businessType is invalid'),
        body('address').trim().notEmpty().isLength({ max: 1000 }),
        body('taxNumber').optional().trim().isLength({ max: 50 }),
        validateRequest,
    ],
    auditLog('organizer:update-payment-profile', 'organizer', 'userId'),
    paymentProfileController.savePaymentProfile
);

router.get(
    '/team/members',
    [
        query('teamId').optional().isString().notEmpty(),
        validateRequest,
    ],
    teamController.getTeamMembers
);

router.post(
    '/team/invite',
    [
        body('teamId').optional().isString().notEmpty(),
        body('email').isEmail().withMessage('email must be valid'),
        body('role').isIn(['ADMIN', 'MANAGER', 'CHECK_IN_STAFF'])
            .withMessage('role is invalid'),
        body('permissions').optional().isArray({ max: 12 }),
        body('scopes').optional().isArray({ max: 500 }),
        validateRequest,
    ],
    auditLog('organizer-team:invite', 'organizer-team', 'teamId'),
    teamController.inviteMember
);

router.patch(
    '/team/members/:memberId',
    [
        param('memberId').notEmpty(),
        body('role').optional().isIn(['ADMIN', 'MANAGER', 'CHECK_IN_STAFF']),
        body('status').optional().isIn(['ACTIVE', 'SUSPENDED']),
        body('permissions').optional().isArray({ max: 12 }),
        body('scopes').optional().isArray({ max: 500 }),
        validateRequest,
    ],
    auditLog('organizer-team:update-member', 'organizer-team-member', 'memberId'),
    teamController.updateMember
);

router.delete(
    '/team/members/:memberId',
    [
        param('memberId').notEmpty(),
        validateRequest,
    ],
    auditLog('organizer-team:remove-member', 'organizer-team-member', 'memberId'),
    teamController.removeMember
);

router.get(
    '/me/payout-summary',
    requirePrimaryOrganizer,
    organizerController.getPayoutSummary
);

router.get(
    '/me/payouts',
    requirePrimaryOrganizer,
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        validateRequest,
    ],
    organizerController.getPayoutList
);

router.get(
    '/me/payout-bank-account',
    requirePrimaryOrganizer,
    organizerController.getBankAccountInfo
);

router.put(
    '/me/payout-bank-account',
    requirePrimaryOrganizer,
    idempotency(),
    [
        body('accountNumber').notEmpty().withMessage('accountNumber is required'),
        body('accountHolder').notEmpty().withMessage('accountHolder is required'),
        body('bankName').notEmpty().withMessage('bankName is required'),
        validateRequest,
    ],
    auditLog('payout:register-bank', 'organizer', 'userId'),
    organizerController.registerBankAccount
);

module.exports = router;
