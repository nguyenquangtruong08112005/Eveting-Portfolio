'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, ticketController, verifyAuthToken, requireVerifiedEmail,
  validateRequest, idempotency, bookingLimiter, auditLog, requireOwnership;
let mockAuditMiddleware, mockOwnershipMiddleware, mockIdempotencyMiddleware;

beforeEach(() => {
  mockAuditMiddleware = jest.fn();
  mockOwnershipMiddleware = jest.fn();
  mockIdempotencyMiddleware = jest.fn();

  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/tickets/api/controller', () => ({
    getCurrentUserTickets: jest.fn(),
    bookTicket: jest.fn(),
    bookOrderAtomic: jest.fn(),
    createCheckout: jest.fn(),
    submitOrderAttendees: jest.fn(),
    getPerformanceSeatAvailability: jest.fn(),
    holdPerformanceSeats: jest.fn(),
    releasePerformanceSeatHold: jest.fn(),
    getTicketDetails: jest.fn(),
    holdSeat: jest.fn(),
    releaseSeat: jest.fn(),
    bookHeldSeats: jest.fn(),
    getSeatsWithStatuses: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({
    verifyAuthToken: jest.fn(),
    requireVerifiedEmail: jest.fn(),
  }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));
  jest.mock('@/shared/middleware/idempotency.middleware', () => jest.fn(() => mockIdempotencyMiddleware));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({ bookingLimiter: jest.fn() }));
  jest.mock('@/shared/middleware/authz.middleware', () => ({
    auditLog: jest.fn(() => mockAuditMiddleware),
    requireOwnership: jest.fn(() => mockOwnershipMiddleware),
  }));

  ticketController = require('@/modules/tickets/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  requireVerifiedEmail = require('@/shared/middleware/auth.middleware').requireVerifiedEmail;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
  idempotency = require('@/shared/middleware/idempotency.middleware');
  bookingLimiter = require('@/shared/middleware/rateLimit.middleware').bookingLimiter;
  const authz = require('@/shared/middleware/authz.middleware');
  auditLog = authz.auditLog;
  requireOwnership = authz.requireOwnership;
});

afterEach(() => {
  jest.resetModules();
});

test('tickets api routes', () => {
  require('@/modules/tickets/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(13);

  const isGet = (r, p) => r.method === 'GET' && r.path === p;
  const isPost = (r, p) => r.method === 'POST' && r.path === p;
  const isPut = (r, p) => r.method === 'PUT' && r.path === p;
  const isDel = (r, p) => r.method === 'DELETE' && r.path === p;

  const [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12] = rs;

  expect(isGet(r0, '/')).toBe(true);
  expect(r0.handlers[0]).toBe(verifyAuthToken);
  expect(r0.handlers[1]).toBe(ticketController.getCurrentUserTickets);

  expect(isPost(r1, '/book')).toBe(true);
  expect(r1.handlers[0]).toBe(verifyAuthToken);
  expect(r1.handlers[1]).toBe(requireVerifiedEmail);
  expect(r1.handlers[2]).toBe(bookingLimiter);
  expect(r1.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('ticket:book', 'ticket', 'id');
  expect(r1.handlers[8]).toBe(validateRequest);
  expect(r1.handlers[9]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(r1.handlers[10]).toBe(ticketController.bookTicket);

  expect(isPost(r2, '/book-order')).toBe(true);
  expect(r2.handlers[0]).toBe(verifyAuthToken);
  expect(r2.handlers[1]).toBe(requireVerifiedEmail);
  expect(r2.handlers[2]).toBe(bookingLimiter);
  expect(r2.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('ticket:book-order', 'event', 'eventId');
  expect(r2.handlers[9]).toBe(validateRequest);
  expect(r2.handlers[10]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(r2.handlers[11]).toBe(ticketController.bookOrderAtomic);

  expect(isPost(r3, '/checkout')).toBe(true);
  expect(r3.handlers[0]).toBe(verifyAuthToken);
  expect(r3.handlers[1]).toBe(requireVerifiedEmail);
  expect(r3.handlers[2]).toBe(bookingLimiter);
  expect(r3.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('ticket:checkout', 'event', 'eventId');
  expect(r3.handlers[12]).toBe(validateRequest);
  expect(r3.handlers[13]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(r3.handlers[14]).toBe(ticketController.createCheckout);

  expect(isPut(r4, '/orders/:orderId/attendees')).toBe(true);
  expect(r4.handlers[0]).toBe(verifyAuthToken);
  expect(r4.handlers[1]).toBe(requireVerifiedEmail);
  expect(r4.handlers[2]).toBe(bookingLimiter);
  expect(r4.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('order:attendees', 'order', 'orderId');
  expect(r4.handlers[7]).toBe(validateRequest);
  expect(r4.handlers[8]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(r4.handlers[9]).toBe(ticketController.submitOrderAttendees);

  expect(isGet(r5, '/events/:eventId/seats')).toBe(true);
  expect(r5.handlers.length).toBe(4);
  expect(typeof r5.handlers[0]).toBe('function');
  expect(typeof r5.handlers[1]).toBe('function');
  expect(r5.handlers[2]).toBe(validateRequest);
  expect(r5.handlers[3]).toBe(ticketController.getPerformanceSeatAvailability);

  expect(isPost(r6, '/events/:eventId/seats/hold')).toBe(true);
  expect(r6.handlers[0]).toBe(verifyAuthToken);
  expect(r6.handlers[1]).toBe(requireVerifiedEmail);
  expect(r6.handlers[2]).toBe(bookingLimiter);
  expect(r6.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('seat:hold', 'event', 'eventId');
  expect(r6.handlers[8]).toBe(validateRequest);
  expect(r6.handlers[9]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(r6.handlers[10]).toBe(ticketController.holdPerformanceSeats);

  expect(isDel(r7, '/events/:eventId/seats/hold')).toBe(true);
  expect(r7.handlers[0]).toBe(verifyAuthToken);
  expect(r7.handlers[1]).toBe(bookingLimiter);
  expect(r7.handlers[2]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('seat:release', 'event', 'eventId');
  expect(r7.handlers[8]).toBe(validateRequest);
  expect(r7.handlers[9]).toBe(ticketController.releasePerformanceSeatHold);

  expect(isGet(r8, '/:ticketId')).toBe(true);
  expect(r8.handlers[0]).toBe(verifyAuthToken);
  expect(r8.handlers[3]).toBe(mockOwnershipMiddleware);
  expect(requireOwnership).toHaveBeenCalledWith('Ticket', 'ticketId');
  expect(r8.handlers[4]).toBe(ticketController.getTicketDetails);

  expect(isPost(r9, '/hold-seat')).toBe(true);
  expect(r9.handlers[0]).toBe(verifyAuthToken);
  expect(r9.handlers[1]).toBe(requireVerifiedEmail);
  expect(r9.handlers[2]).toBe(bookingLimiter);
  expect(r9.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('seat:hold', 'event', 'eventId');
  expect(r9.handlers[6]).toBe(validateRequest);
  expect(r9.handlers[7]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(r9.handlers[8]).toBe(ticketController.holdSeat);

  expect(isPost(r10, '/release-seat')).toBe(true);
  expect(r10.handlers[2]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('seat:release', 'event', 'eventId');
  expect(r10.handlers[6]).toBe(ticketController.releaseSeat);

  expect(isPost(r11, '/book-held-seats')).toBe(true);
  expect(r11.handlers[0]).toBe(verifyAuthToken);
  expect(r11.handlers[1]).toBe(requireVerifiedEmail);
  expect(r11.handlers[2]).toBe(bookingLimiter);
  expect(r11.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('seat:book-held', 'event', 'eventId');
  expect(r11.handlers[7]).toBe(validateRequest);
  expect(r11.handlers[8]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(r11.handlers[9]).toBe(ticketController.bookHeldSeats);

  expect(isGet(r12, '/event/:eventId/seats')).toBe(true);
  expect(r12.handlers[0]).toBe(verifyAuthToken);
  expect(r12.handlers[3]).toBe(ticketController.getSeatsWithStatuses);
});
