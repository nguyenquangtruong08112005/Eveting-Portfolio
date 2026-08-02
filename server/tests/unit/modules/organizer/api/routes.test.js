'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, organizerController, orderController, paymentProfileController,
  analyticsController, teamController, verifyAuthToken, validateRequest, auditLog,
  idempotency, requirePrimaryOrganizer, requireEventPermission;
let mockAuditMiddleware, mockIdempotencyMiddleware, mockRbacMiddleware;

beforeEach(() => {
  mockAuditMiddleware = jest.fn();
  mockIdempotencyMiddleware = jest.fn();
  mockRbacMiddleware = jest.fn();

  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/organizer/api/controller', () => ({
    registerOrganizer: jest.fn(),
    checkInByQr: jest.fn(),
    getOrganizerProfile: jest.fn(),
    getLedger: jest.fn(),
    updateOrganizerProfile: jest.fn(),
    getMyEvents: jest.fn(),
    getStatsOverview: jest.fn(),
    getEventStats: jest.fn(),
    getSeatLayout: jest.fn(),
    saveSeatLayout: jest.fn(),
    getEventAttendees: jest.fn(),
    importAttendees: jest.fn(),
    exportAttendees: jest.fn(),
    broadcastNotification: jest.fn(),
    getPayoutSummary: jest.fn(),
    getPayoutList: jest.fn(),
    getBankAccountInfo: jest.fn(),
    registerBankAccount: jest.fn(),
  }));
  jest.mock('@/modules/organizer/api/order-operations.controller', () => ({
    exportOrders: jest.fn(),
    sendCustomerEmail: jest.fn(),
    listOrders: jest.fn(),
    listTaxInvoiceRequests: jest.fn(),
  }));
  jest.mock('@/modules/organizer/api/payment-profile.controller', () => ({
    getPaymentProfile: jest.fn(),
    savePaymentProfile: jest.fn(),
    requestTaxInvoice: jest.fn(),
  }));
  jest.mock('@/modules/analytics/api/controller', () => ({
    getTrafficDashboard: jest.fn(),
    getRevenueDashboard: jest.fn(),
    getCheckInDashboard: jest.fn(),
  }));
  jest.mock('@/modules/memberships/api/team.controller', () => ({
    acceptInvitation: jest.fn(),
    getMyTeams: jest.fn(),
    getTeamMembers: jest.fn(),
    inviteMember: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));
  jest.mock('@/shared/middleware/authz.middleware', () => ({
    auditLog: jest.fn(() => mockAuditMiddleware),
  }));
  jest.mock('@/shared/middleware/idempotency.middleware', () => jest.fn(() => mockIdempotencyMiddleware));
  jest.mock('@/modules/memberships/api/organizer-rbac.middleware', () => ({
    requirePrimaryOrganizer: jest.fn(),
    requireEventPermission: jest.fn(() => mockRbacMiddleware),
  }));
  jest.mock('multer', () => {
    const m = jest.fn(() => ({ memoryStorage: () => ({}), single: () => jest.fn() }));
    m.memoryStorage = jest.fn(() => ({}));
    return m;
  });

  organizerController = require('@/modules/organizer/api/controller');
  orderController = require('@/modules/organizer/api/order-operations.controller');
  paymentProfileController = require('@/modules/organizer/api/payment-profile.controller');
  analyticsController = require('@/modules/analytics/api/controller');
  teamController = require('@/modules/memberships/api/team.controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
  const authz = require('@/shared/middleware/authz.middleware');
  auditLog = authz.auditLog;
  idempotency = require('@/shared/middleware/idempotency.middleware');
  const rbac = require('@/modules/memberships/api/organizer-rbac.middleware');
  requirePrimaryOrganizer = rbac.requirePrimaryOrganizer;
  requireEventPermission = rbac.requireEventPermission;
});

afterEach(() => {
  jest.resetModules();
});

test('organizer api routes', () => {
  require('@/modules/organizer/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(35);

  const isPost = (r, p) => r.method === 'POST' && r.path === p;
  const isGet = (r, p) => r.method === 'GET' && r.path === p;
  const isPut = (r, p) => r.method === 'PUT' && r.path === p;
  const isPatch = (r, p) => r.method === 'PATCH' && r.path === p;
  const isDel = (r, p) => r.method === 'DELETE' && r.path === p;

  const useMw = rs[0];
  expect(useMw.method).toBe('USE');
  expect(useMw.path).toBe('/');
  expect(useMw.handlers[0]).toBe(verifyAuthToken);

  const t = (idx) => rs[idx];

  expect(isPost(t(1), '/register')).toBe(true);
  expect(t(1).handlers[1]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('organizer:register', 'organizer', 'userId');
  expect(t(1).handlers[2]).toBe(organizerController.registerOrganizer);

  expect(isPost(t(2), '/orders/:orderId/tax-invoice-request')).toBe(true);
  expect(t(2).handlers[1]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('tax-invoice:request', 'order', 'orderId');
  expect(t(2).handlers[2]).toBe(paymentProfileController.requestTaxInvoice);

  expect(isPost(t(3), '/team/invitations/:token/accept')).toBe(true);
  expect(t(3).handlers[1]).toBe(teamController.acceptInvitation);

  expect(isGet(t(4), '/team/memberships')).toBe(true);
  expect(t(4).handlers[0]).toBe(teamController.getMyTeams);

  expect(isPost(t(5), '/check-in-qr')).toBe(true);
  expect(t(5).handlers[1]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('ticket:check-in', 'ticket', 'qrToken');
  expect(t(5).handlers[2]).toBe(organizerController.checkInByQr);

  expect(isGet(t(6), '/me')).toBe(true);
  expect(t(6).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(6).handlers[1]).toBe(organizerController.getOrganizerProfile);

  expect(isGet(t(7), '/ledger')).toBe(true);
  expect(t(7).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(7).handlers[1]).toBe(organizerController.getLedger);

  expect(isPut(t(8), '/me')).toBe(true);
  expect(t(8).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(8).handlers[1]).toBe(organizerController.updateOrganizerProfile);

  expect(isGet(t(9), '/me/events')).toBe(true);
  expect(t(9).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(9).handlers[2]).toBe(organizerController.getMyEvents);

  expect(isGet(t(10), '/me/stats')).toBe(true);
  expect(t(10).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(10).handlers[1]).toBe(organizerController.getStatsOverview);

  expect(isGet(t(11), '/events/:eventId/stats')).toBe(true);
  expect(t(11).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('VIEW_REVENUE');
  expect(t(11).handlers[2]).toBe(organizerController.getEventStats);

  expect(isGet(t(12), '/events/:eventId/seat-layout')).toBe(true);
  expect(t(12).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('EDIT_EVENT');
  expect(t(12).handlers[2]).toBe(organizerController.getSeatLayout);

  expect(isPut(t(13), '/events/:eventId/seat-layout')).toBe(true);
  expect(Array.isArray(t(13).handlers[0])).toBe(true);
  expect(t(13).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('EDIT_EVENT');
  expect(t(13).handlers[2]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('seat-layout:update', 'event', 'eventId');
  expect(t(13).handlers[3]).toBe(organizerController.saveSeatLayout);

  expect(isGet(t(14), '/events/:eventId/analytics')).toBe(true);
  expect(t(14).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('VIEW_ANALYTICS');
  expect(t(14).handlers[2]).toBe(analyticsController.getTrafficDashboard);

  expect(isGet(t(15), '/events/:eventId/revenue')).toBe(true);
  expect(t(15).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('VIEW_REVENUE');
  expect(t(15).handlers[2]).toBe(analyticsController.getRevenueDashboard);

  expect(isGet(t(16), '/events/:eventId/check-in')).toBe(true);
  expect(t(16).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('VIEW_CHECKIN_REPORTS');
  expect(t(16).handlers[2]).toBe(analyticsController.getCheckInDashboard);

  expect(isGet(t(17), '/events/:eventId/orders/export')).toBe(true);
  expect(t(17).handlers[2]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('EXPORT_ORDER_REPORTS');
  expect(t(17).handlers[3]).toBe(mockAuditMiddleware);
  expect(t(17).handlers[4]).toBe(orderController.exportOrders);

  expect(isPost(t(18), '/events/:eventId/orders/send-email')).toBe(true);
  expect(Array.isArray(t(18).handlers[0])).toBe(true);
  expect(t(18).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('SEND_CUSTOMER_EMAIL');
  expect(t(18).handlers[2]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('orders:send-email', 'event', 'eventId');
  expect(t(18).handlers[3]).toBe(orderController.sendCustomerEmail);

  expect(isGet(t(19), '/events/:eventId/orders')).toBe(true);
  expect(t(19).handlers[2]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('VIEW_ORDERS');
  expect(t(19).handlers[3]).toBe(orderController.listOrders);

  expect(isGet(t(20), '/events/:eventId/tax-invoice-requests')).toBe(true);
  expect(Array.isArray(t(20).handlers[0])).toBe(true);
  expect(t(20).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('VIEW_ORDERS');
  expect(t(20).handlers[2]).toBe(orderController.listTaxInvoiceRequests);

  expect(isGet(t(21), '/events/:eventId/attendees')).toBe(true);
  expect(t(21).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('VIEW_ORDERS');
  expect(t(21).handlers[2]).toBe(organizerController.getEventAttendees);

  expect(isPost(t(22), '/events/:eventId/attendees/import')).toBe(true);
  expect(t(22).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('EDIT_EVENT');
  expect(t(22).handlers[3]).toBe(mockAuditMiddleware);
  expect(t(22).handlers[4]).toBe(organizerController.importAttendees);

  expect(isGet(t(23), '/events/:eventId/attendees/export')).toBe(true);
  expect(t(23).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('EXPORT_ORDER_REPORTS');
  expect(t(23).handlers[2]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('attendees:export', 'event', 'eventId');
  expect(t(23).handlers[3]).toBe(organizerController.exportAttendees);

  expect(isPost(t(24), '/events/:eventId/broadcast')).toBe(true);
  expect(Array.isArray(t(24).handlers[0])).toBe(true);
  expect(t(24).handlers[1]).toBe(mockRbacMiddleware);
  expect(requireEventPermission).toHaveBeenCalledWith('SEND_CUSTOMER_EMAIL');
  expect(t(24).handlers[2]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('notification:broadcast', 'event', 'eventId');
  expect(t(24).handlers[3]).toBe(organizerController.broadcastNotification);

  expect(isGet(t(25), '/payment-profile')).toBe(true);
  expect(t(25).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(25).handlers[1]).toBe(paymentProfileController.getPaymentProfile);

  expect(isPost(t(26), '/payment-profile')).toBe(true);
  expect(t(26).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(26).handlers[2]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('organizer:update-payment-profile', 'organizer', 'userId');
  expect(t(26).handlers[3]).toBe(paymentProfileController.savePaymentProfile);

  expect(isGet(t(27), '/team/members')).toBe(true);
  expect(t(27).handlers[1]).toBe(teamController.getTeamMembers);

  expect(isPost(t(28), '/team/invite')).toBe(true);
  expect(t(28).handlers[1]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('organizer-team:invite', 'organizer-team', 'teamId');
  expect(t(28).handlers[2]).toBe(teamController.inviteMember);

  expect(isPatch(t(29), '/team/members/:memberId')).toBe(true);
  expect(t(29).handlers[1]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('organizer-team:update-member', 'organizer-team-member', 'memberId');
  expect(t(29).handlers[2]).toBe(teamController.updateMember);

  expect(isDel(t(30), '/team/members/:memberId')).toBe(true);
  expect(t(30).handlers[1]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('organizer-team:remove-member', 'organizer-team-member', 'memberId');
  expect(t(30).handlers[2]).toBe(teamController.removeMember);

  expect(isGet(t(31), '/me/payout-summary')).toBe(true);
  expect(t(31).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(31).handlers[1]).toBe(organizerController.getPayoutSummary);

  expect(isGet(t(32), '/me/payouts')).toBe(true);
  expect(t(32).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(32).handlers[2]).toBe(organizerController.getPayoutList);

  expect(isGet(t(33), '/me/payout-bank-account')).toBe(true);
  expect(t(33).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(33).handlers[1]).toBe(organizerController.getBankAccountInfo);

  expect(isPut(t(34), '/me/payout-bank-account')).toBe(true);
  expect(t(34).handlers[0]).toBe(requirePrimaryOrganizer);
  expect(t(34).handlers[1]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(t(34).handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('payout:register-bank', 'organizer', 'userId');
  expect(t(34).handlers[4]).toBe(organizerController.registerBankAccount);
});
