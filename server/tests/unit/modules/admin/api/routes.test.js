'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, adminController, verifyAuthToken, isAdmin, requireRole, auditLog, validateRequest, idempotency;
let mockAuditMiddleware, mockRoleMiddleware, mockIdempotencyMiddleware;

beforeEach(() => {
  mockAuditMiddleware = jest.fn();
  mockRoleMiddleware = jest.fn();
  mockIdempotencyMiddleware = jest.fn();

  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/admin/api/controller', () => ({
    getPendingEvents: jest.fn(),
    approveEvent: jest.fn(),
    rejectEvent: jest.fn(),
    getPayoutList: jest.fn(),
    approvePayout: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({
    verifyAuthToken: jest.fn(),
    isAdmin: jest.fn(),
  }));
  jest.mock('@/shared/middleware/admin.middleware', () => ({
    isAdmin: jest.fn(),
  }));
  jest.mock('@/shared/middleware/authz.middleware', () => ({
    requireRole: jest.fn(() => mockRoleMiddleware),
    auditLog: jest.fn(() => mockAuditMiddleware),
  }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({
    validateRequest: jest.fn(),
  }));
  jest.mock('@/shared/middleware/idempotency.middleware', () => jest.fn(() => mockIdempotencyMiddleware));

  adminController = require('@/modules/admin/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  isAdmin = require('@/shared/middleware/admin.middleware').isAdmin;
  const authz = require('@/shared/middleware/authz.middleware');
  requireRole = authz.requireRole;
  auditLog = authz.auditLog;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
  idempotency = require('@/shared/middleware/idempotency.middleware');
});

afterEach(() => {
  jest.resetModules();
});

test('admin api routes', () => {
  require('@/modules/admin/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(6);

  const [useMw, getPending, postApprove, postReject, getPayouts, postApprovePayout] = rs;

  expect(useMw.method).toBe('USE');
  expect(useMw.path).toBe('/');
  expect(useMw.handlers[0]).toBe(verifyAuthToken);
  expect(useMw.handlers[1]).toBe(isAdmin);
  expect(useMw.handlers[2]).toBe(mockRoleMiddleware);
  expect(requireRole).toHaveBeenCalledWith('admin');

  expect(getPending.method).toBe('GET');
  expect(getPending.path).toBe('/events/pending');
  expect(getPending.handlers[0]).toBe(adminController.getPendingEvents);

  expect(postApprove.method).toBe('POST');
  expect(postApprove.path).toBe('/events/:id/approve');
  expect(Array.isArray(postApprove.handlers[0])).toBe(true);
  expect(postApprove.handlers[1]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('event:approve', 'event', 'id');
  expect(postApprove.handlers[2]).toBe(adminController.approveEvent);

  expect(postReject.method).toBe('POST');
  expect(postReject.path).toBe('/events/:id/reject');
  expect(postReject.handlers[1]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('event:reject', 'event', 'id');
  expect(postReject.handlers[2]).toBe(adminController.rejectEvent);

  expect(getPayouts.method).toBe('GET');
  expect(getPayouts.path).toBe('/payouts');
  expect(Array.isArray(getPayouts.handlers[0])).toBe(true);
  expect(getPayouts.handlers[1]).toBe(adminController.getPayoutList);

  expect(postApprovePayout.method).toBe('POST');
  expect(postApprovePayout.path).toBe('/payouts/:id/approve');
  expect(postApprovePayout.handlers[0]).toBe(mockIdempotencyMiddleware);
  expect(postApprovePayout.handlers[postApprovePayout.handlers.length - 1]).toBe(adminController.approvePayout);
  expect(auditLog).toHaveBeenCalledWith('payout:approve', 'payout', 'id');
});
