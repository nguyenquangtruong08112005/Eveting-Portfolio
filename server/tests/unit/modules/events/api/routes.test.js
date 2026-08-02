'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, eventController, verifyAuthToken, optionalAuthToken,
  requireVerifiedEmail, requireRole, requireOwnership, auditLog, validateRequest,
  publicApiLimiter, normalizeEventBuilderPayload, createEventValidation,
  updateEventValidation, vietnamLocationsValidation, attendeeAnswersValidation;
let mockRoleMiddleware, mockOwnershipMiddleware, mockAuditMiddleware;

function isGet(r, p) { return r.method === 'GET' && r.path === p; }
function isPost(r, p) { return r.method === 'POST' && r.path === p; }
function isPut(r, p) { return r.method === 'PUT' && r.path === p; }
function isDel(r, p) { return r.method === 'DELETE' && r.path === p; }

function expectValidationArray(arr, vr) {
  expect(Array.isArray(arr)).toBe(true);
  expect(arr[arr.length - 1]).toBe(vr);
}

beforeEach(() => {
  mockRoleMiddleware = jest.fn();
  mockOwnershipMiddleware = jest.fn();
  mockAuditMiddleware = jest.fn();

  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/events/api/controller', () => ({
    searchEvents: jest.fn(), getDestinations: jest.fn(), getVietnamLocations: jest.fn(),
    findNearbyEvents: jest.fn(), getRecommendations: jest.fn(), getAllEvents: jest.fn(),
    getEventWeather: jest.fn(), getEventById: jest.fn(), createEvent: jest.fn(),
    updateEvent: jest.fn(), saveOrderAttendeeAnswers: jest.fn(),
    cancelEventController: jest.fn(), submitDraftController: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({
    verifyAuthToken: jest.fn(), optionalAuthToken: jest.fn(), requireVerifiedEmail: jest.fn(),
  }));
  jest.mock('@/shared/middleware/authz.middleware', () => ({
    requireRole: jest.fn(() => mockRoleMiddleware),
    requireOwnership: jest.fn(() => mockOwnershipMiddleware),
    auditLog: jest.fn(() => mockAuditMiddleware),
  }));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({ publicApiLimiter: jest.fn() }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));
  jest.mock('@/modules/events/api/validation', () => ({
    normalizeEventBuilderPayload: jest.fn(),
    createEventValidation: [jest.fn()],
    updateEventValidation: [jest.fn()],
    vietnamLocationsValidation: [jest.fn()],
    attendeeAnswersValidation: [jest.fn()],
  }));
  jest.mock('@/modules/reviews', () => ({ router: 'reviewsSubRouter' }));
  jest.mock('@/modules/media', () => ({ router: 'mediaSubRouter' }));

  eventController = require('@/modules/events/api/controller');
  const authMid = require('@/shared/middleware/auth.middleware');
  verifyAuthToken = authMid.verifyAuthToken;
  optionalAuthToken = authMid.optionalAuthToken;
  requireVerifiedEmail = authMid.requireVerifiedEmail;
  publicApiLimiter = require('@/shared/middleware/rateLimit.middleware').publicApiLimiter;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
  const authz = require('@/shared/middleware/authz.middleware');
  requireRole = authz.requireRole;
  requireOwnership = authz.requireOwnership;
  auditLog = authz.auditLog;
  const val = require('@/modules/events/api/validation');
  normalizeEventBuilderPayload = val.normalizeEventBuilderPayload;
  createEventValidation = val.createEventValidation;
  updateEventValidation = val.updateEventValidation;
  vietnamLocationsValidation = val.vietnamLocationsValidation;
  attendeeAnswersValidation = val.attendeeAnswersValidation;
});

afterEach(() => { jest.resetModules(); });

test('events api routes', () => {
  require('@/modules/events/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(15);

  const [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14] = rs;

  // ── Public GET routes with rate limit + validation array ──

  // GET /search
  expect(isGet(r0, '/search')).toBe(true);
  expect(r0.handlers[0]).toBe(publicApiLimiter);
  expectValidationArray(r0.handlers[1], validateRequest);
  expect(r0.handlers[2]).toBe(eventController.searchEvents);

  // GET /destinations
  expect(isGet(r1, '/destinations')).toBe(true);
  expect(r1.handlers[0]).toBe(publicApiLimiter);
  expectValidationArray(r1.handlers[1], validateRequest);
  expect(r1.handlers[2]).toBe(eventController.getDestinations);

  // GET /vietnam-locations — uses pre-built vietnamLocationsValidation array
  expect(isGet(r2, '/vietnam-locations')).toBe(true);
  expect(r2.handlers[0]).toBe(publicApiLimiter);
  expect(r2.handlers[1]).toBe(vietnamLocationsValidation);
  expect(r2.handlers[2]).toBe(eventController.getVietnamLocations);

  // GET /nearby
  expect(isGet(r3, '/nearby')).toBe(true);
  expect(r3.handlers[0]).toBe(publicApiLimiter);
  expectValidationArray(r3.handlers[1], validateRequest);
  expect(r3.handlers[2]).toBe(eventController.findNearbyEvents);

  // GET /recommendations — requires auth token
  expect(isGet(r4, '/recommendations')).toBe(true);
  expect(r4.handlers[0]).toBe(verifyAuthToken);
  expectValidationArray(r4.handlers[1], validateRequest);
  expect(r4.handlers[2]).toBe(eventController.getRecommendations);

  // GET /
  expect(isGet(r5, '/')).toBe(true);
  expect(r5.handlers[0]).toBe(publicApiLimiter);
  expectValidationArray(r5.handlers[1], validateRequest);
  expect(r5.handlers[2]).toBe(eventController.getAllEvents);

  // GET /:eventId/weather
  expect(isGet(r6, '/:eventId/weather')).toBe(true);
  expect(r6.handlers[0]).toBe(publicApiLimiter);
  expectValidationArray(r6.handlers[1], validateRequest);
  expect(r6.handlers[2]).toBe(eventController.getEventWeather);

  // GET /:eventId — publicApiLimiter + optionalAuthToken + validation
  expect(isGet(r7, '/:eventId')).toBe(true);
  expect(r7.handlers[0]).toBe(publicApiLimiter);
  expect(r7.handlers[1]).toBe(optionalAuthToken);
  expectValidationArray(r7.handlers[2], validateRequest);
  expect(r7.handlers[3]).toBe(eventController.getEventById);

  // ── Authenticated write routes ──

  // POST / — create event
  expect(isPost(r8, '/')).toBe(true);
  expect(r8.handlers[0]).toBe(verifyAuthToken);
  expect(r8.handlers[1]).toBe(requireVerifiedEmail);
  expect(r8.handlers[2]).toBe(mockRoleMiddleware);
  expect(r8.handlers[3]).toBe(normalizeEventBuilderPayload);
  expect(r8.handlers[4]).toBe(createEventValidation);
  expect(r8.handlers[5]).toBe(mockAuditMiddleware);
  expect(r8.handlers[6]).toBe(eventController.createEvent);
  expect(requireRole).toHaveBeenNthCalledWith(1, 'organizer', 'admin');
  expect(auditLog).toHaveBeenNthCalledWith(1, 'event:create', 'event', 'id');

  // PUT /:eventId — update event
  expect(isPut(r9, '/:eventId')).toBe(true);
  expect(r9.handlers[0]).toBe(verifyAuthToken);
  expect(r9.handlers[1]).toBe(mockRoleMiddleware);
  expect(r9.handlers[2]).toBe(mockOwnershipMiddleware);
  expect(r9.handlers[3]).toBe(normalizeEventBuilderPayload);
  expect(r9.handlers[4]).toBe(updateEventValidation);
  expect(r9.handlers[5]).toBe(mockAuditMiddleware);
  expect(r9.handlers[6]).toBe(eventController.updateEvent);
  expect(requireRole).toHaveBeenNthCalledWith(2, 'organizer', 'admin');
  expect(requireOwnership).toHaveBeenNthCalledWith(1, 'Event', 'eventId');
  expect(auditLog).toHaveBeenNthCalledWith(2, 'event:update', 'event', 'eventId');

  // PUT /:eventId/orders/:orderId/attendees
  expect(isPut(r10, '/:eventId/orders/:orderId/attendees')).toBe(true);
  expect(r10.handlers[0]).toBe(verifyAuthToken);
  expect(r10.handlers[1]).toBe(attendeeAnswersValidation);
  expect(r10.handlers[2]).toBe(eventController.saveOrderAttendeeAnswers);

  // DELETE /:eventId
  expect(isDel(r11, '/:eventId')).toBe(true);
  expect(r11.handlers[0]).toBe(verifyAuthToken);
  expect(r11.handlers[1]).toBe(mockRoleMiddleware);
  expect(r11.handlers[2]).toBe(mockOwnershipMiddleware);
  expectValidationArray(r11.handlers[3], validateRequest);
  expect(r11.handlers[4]).toBe(mockAuditMiddleware);
  expect(r11.handlers[5]).toBe(eventController.cancelEventController);
  expect(requireRole).toHaveBeenNthCalledWith(3, 'organizer', 'admin');
  expect(requireOwnership).toHaveBeenNthCalledWith(2, 'Event', 'eventId');
  expect(auditLog).toHaveBeenNthCalledWith(3, 'event:cancel', 'event', 'eventId');

  // POST /:eventId/submit-draft
  expect(isPost(r12, '/:eventId/submit-draft')).toBe(true);
  expect(r12.handlers[0]).toBe(verifyAuthToken);
  expect(r12.handlers[1]).toBe(requireVerifiedEmail);
  expect(r12.handlers[2]).toBe(mockRoleMiddleware);
  expect(r12.handlers[3]).toBe(mockOwnershipMiddleware);
  expectValidationArray(r12.handlers[4], validateRequest);
  expect(r12.handlers[5]).toBe(mockAuditMiddleware);
  expect(r12.handlers[6]).toBe(eventController.submitDraftController);
  expect(requireRole).toHaveBeenNthCalledWith(4, 'organizer', 'admin');
  expect(requireOwnership).toHaveBeenNthCalledWith(3, 'Event', 'eventId');
  expect(auditLog).toHaveBeenNthCalledWith(4, 'event:submit-draft', 'event', 'eventId');

  // ── Sub-router mounts ──

  expect(r13.method).toBe('USE');
  expect(r13.path).toBe('/:eventId/reviews');
  expect(r13.handlers[0]).toBe('reviewsSubRouter');

  expect(r14.method).toBe('USE');
  expect(r14.path).toBe('/:eventId/media');
  expect(r14.handlers[0]).toBe('mediaSubRouter');
});
