jest.mock('@/providers/database/rbac.repository', () => ({
  resolveUserPermissionNames: jest.fn(),
  getOrganizationMember: jest.fn(),
  createAuditLog: jest.fn(),
}));

jest.mock('@/providers/database/event.repository', () => ({
  getEventById: jest.fn(),
}));

jest.mock('@/providers/database/order.repository', () => ({
  getOrderById: jest.fn(),
}));

jest.mock('@/providers/database/ticket.repository', () => ({
  getTicketById: jest.fn(),
}));

jest.mock('@/providers/database/venue.repository', () => ({
  getVenueById: jest.fn(),
}));

jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

jest.mock('@/shared/errors', () => {
  const actual = jest.requireActual('@/shared/errors');
  return actual;
});

const eventRepository = require('@/providers/database/event.repository');
const orderRepository = require('@/providers/database/order.repository');
const ticketRepository = require('@/providers/database/ticket.repository');
const venueRepository = require('@/providers/database/venue.repository');
const rbacRepository = require('@/providers/database/rbac.repository');
const logger = require('@/shared/logger');

const {
  userHasRole,
  sendLegacyError,
  requireRole,
  requireOwnership,
} = require('@/shared/middleware/authz.middleware');

function makeRes() {
  const r = { statusCode: 200 };
  r.status = jest.fn((code) => { r.statusCode = code; return r; });
  r.json = jest.fn().mockReturnValue(r);
  r.send = jest.fn().mockReturnValue(r);
  return r;
}

describe('userHasRole', () => {
  it('returns false when req.user is falsy', () => {
    expect(userHasRole({ user: null }, 'admin')).toBe(false);
  });

  it('returns true when roles array includes target role', () => {
    const req = { user: { roles: ['user', 'admin'] } };
    expect(userHasRole(req, 'admin')).toBe(true);
  });

  it('returns false when roles array does not include target role', () => {
    const req = { user: { roles: ['user'] } };
    expect(userHasRole(req, 'admin')).toBe(false);
  });

  it('returns true when role string matches target', () => {
    const req = { user: { role: 'admin' } };
    expect(userHasRole(req, 'admin')).toBe(true);
  });

  it('returns false when role string does not match', () => {
    const req = { user: { role: 'user' } };
    expect(userHasRole(req, 'admin')).toBe(false);
  });

  it('returns false when roles is empty array', () => {
    const req = { user: { roles: [] } };
    expect(userHasRole(req, 'admin')).toBe(false);
  });
});

describe('sendLegacyError', () => {
  it('sets status from error and sends legacy message', () => {
    const res = makeRes();
    const err = { statusCode: 403, message: 'Forbidden' };
    sendLegacyError(res, err, 'Legacy: no access');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({ error: 'Legacy: no access' });
  });

  it('falls back to appError.message when legacyMessage not provided', () => {
    const res = makeRes();
    const err = { statusCode: 401, message: 'Unauthorized' };
    sendLegacyError(res, err);
    expect(res.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
});

describe('requireRole', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { uid: 'u1', roles: ['user'], originalUrl: '/test', method: 'GET' } };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns 401 when no user on request', () => {
    req.user = null;
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('No authenticated user') });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user has one of the allowed roles', () => {
    requireRole('admin', 'user')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user lacks all allowed roles', () => {
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('Requires one of roles') });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts nested array of roles (flat)', () => {
    requireRole(['admin', 'superadmin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next when user has the required role', () => {
    req.user.roles = ['admin'];
    requireRole('admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('logs a warning on unauthorized access', () => {
    req.user = null;
    requireRole('admin')(req, res, next);
    expect(logger.warn).toHaveBeenCalledWith(
      'Unauthorized access attempt: No user context',
      expect.any(Object)
    );
  });

  it('logs a warning on forbidden access', () => {
    requireRole('admin')(req, res, next);
    expect(logger.warn).toHaveBeenCalledWith(
      'Forbidden access attempt: Insufficient roles',
      expect.objectContaining({ userId: 'u1', requiredRoles: ['admin'] })
    );
  });
});

describe('requireOwnership', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { uid: 'owner-1', roles: ['user'] },
      params: { id: 'resource-1' },
      body: {},
      query: {},
    };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns 401 when no user', async () => {
    req.user = null;
    await requireOwnership('event')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('bypasses ownership check for admin users (default)', async () => {
    req.user.roles = ['admin'];
    await requireOwnership('event')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(eventRepository.getEventById).not.toHaveBeenCalled();
  });

  it('respects allowAdminBypass: false option', async () => {
    req.user.roles = ['admin'];
    eventRepository.getEventById.mockResolvedValue({ organizerId: 'other-owner' });
    await requireOwnership('event', 'id', { allowAdminBypass: false })(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 when resource id param is missing', async () => {
    req.params = {};
    await requireOwnership('event')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('Missing resource identifier') });
  });

  it('reads id from body when not in params', async () => {
    req.params = {};
    req.body.id = 'body-id';
    eventRepository.getEventById.mockResolvedValue({ organizerId: 'owner-1' });
    await requireOwnership('event')(req, res, next);
    expect(eventRepository.getEventById).toHaveBeenCalledWith('body-id');
    expect(next).toHaveBeenCalled();
  });

  it('reads id from query when not in params or body', async () => {
    req.params = {};
    req.query.id = 'query-id';
    eventRepository.getEventById.mockResolvedValue({ organizerId: 'owner-1' });
    await requireOwnership('event')(req, res, next);
    expect(eventRepository.getEventById).toHaveBeenCalledWith('query-id');
    expect(next).toHaveBeenCalled();
  });

  it('returns 404 when resource not found', async () => {
    eventRepository.getEventById.mockResolvedValue(null);
    await requireOwnership('event')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('not found') });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes ownership check when direct organizerId matches', async () => {
    eventRepository.getEventById.mockResolvedValue({ organizerId: 'owner-1' });
    await requireOwnership('event')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.targetResource).toEqual({ organizerId: 'owner-1' });
  });

  it('passes ownership check for ticket when userId matches', async () => {
    ticketRepository.getTicketById.mockResolvedValue({ userId: 'owner-1', eventId: 'evt-1' });
    await requireOwnership('ticket')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes ownership check for order when userId matches', async () => {
    orderRepository.getOrderById.mockResolvedValue({ user_id: 'owner-1', eventId: 'evt-1' });
    await requireOwnership('order')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes ownership check for venue when organizerId matches', async () => {
    venueRepository.getVenueById.mockResolvedValue({ organizer_id: 'owner-1' });
    await requireOwnership('venue')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('fallback: checks event organizerId for ticket ownership', async () => {
    req.params.id = 'ticket-1';
    ticketRepository.getTicketById.mockResolvedValue({ userId: 'other-user', eventId: 'evt-1' });
    eventRepository.getEventById.mockResolvedValue({ organizerId: 'owner-1' });
    await requireOwnership('ticket')(req, res, next);
    expect(eventRepository.getEventById).toHaveBeenCalledWith('evt-1');
    expect(next).toHaveBeenCalled();
  });

  it('fallback: checks event organizerId for order ownership', async () => {
    orderRepository.getOrderById.mockResolvedValue({ userId: 'other-user', eventId: 'evt-1' });
    eventRepository.getEventById.mockResolvedValue({ organizerId: 'owner-1' });
    await requireOwnership('order')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user does not own resource', async () => {
    eventRepository.getEventById.mockResolvedValue({ organizerId: 'different-owner' });
    await requireOwnership('event')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('ownership permission') });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when repository throws', async () => {
    eventRepository.getEventById.mockRejectedValue(new Error('DB crash'));
    await requireOwnership('event')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: expect.stringContaining('Internal Error') });
    expect(next).not.toHaveBeenCalled();
  });

  it('throws Error at middleware creation for unsupported resource type', () => {
    expect(() => requireOwnership('unknown')).toThrow('Unsupported resource type');
  });

  it('uses custom idParam', async () => {
    req.params.ticketId = 't-42';
    ticketRepository.getTicketById.mockResolvedValue({ userId: 'owner-1', eventId: 'evt-1' });
    await requireOwnership('ticket', 'ticketId')(req, res, next);
    expect(ticketRepository.getTicketById).toHaveBeenCalledWith('t-42');
    expect(next).toHaveBeenCalled();
  });
});
