'use strict';

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

const rbacRepository = require('@/providers/database/rbac.repository');
const eventRepository = require('@/providers/database/event.repository');
const ticketRepository = require('@/providers/database/ticket.repository');
const logger = require('@/shared/logger');

const {
  userHasRole,
  requireRole,
  requireOwnership,
  requirePermission,
  requireOrganizationRole,
  auditLog,
} = require('@/shared/middleware/authz.middleware');

function makeRes() {
  const r = { statusCode: 200 };
  r.status = jest.fn((code) => { r.statusCode = code; return r; });
  r.json = jest.fn().mockReturnValue(r);
  r.send = jest.fn().mockReturnValue(r);
  return r;
}

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('userHasRole (remaining branches)', () => {
  it('returns true when role is an array containing the target', () => {
    const req = { user: { role: ['user', 'admin'] } };
    expect(userHasRole(req, 'admin')).toBe(true);
  });

  it('filters falsy entries from a single string role', () => {
    const req = { user: { role: undefined } };
    expect(userHasRole(req, 'admin')).toBe(false);
  });
});

describe('requireRole (remaining branches)', () => {
  it('resolves userId from req.user.id for forbidden logging', () => {
    const req = { user: { id: 'by-id', roles: ['user'] }, originalUrl: '/x', method: 'GET' };
    const res = makeRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(logger.warn).toHaveBeenCalledWith(
      'Forbidden access attempt: Insufficient roles',
      expect.objectContaining({ userId: 'by-id' })
    );
  });

  it('resolves userId from req.user.user_id for forbidden logging', () => {
    const req = { user: { user_id: 'by-uid', roles: ['user'] }, originalUrl: '/x', method: 'GET' };
    const res = makeRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(logger.warn).toHaveBeenCalledWith(
      'Forbidden access attempt: Insufficient roles',
      expect.objectContaining({ userId: 'by-uid' })
    );
  });

  it('uses req.user.role string when roles is absent', () => {
    const req = { user: { role: 'user' }, originalUrl: '/x', method: 'GET' };
    const res = makeRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(logger.warn).toHaveBeenCalledWith(
      'Forbidden access attempt: Insufficient roles',
      expect.objectContaining({ userRoles: 'user', requiredRoles: ['admin'] })
    );
  });
});

describe('requireOwnership (remaining branches)', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { uid: 'owner-1' },
      params: { id: 'ticket-1' },
      body: {},
      query: {},
    };
    res = makeRes();
    next = jest.fn();
  });

  it('matches owner when the user identity comes from req.user.id', async () => {
    req.user = { id: 'owner-1' };
    eventRepository.getEventById.mockResolvedValue({ organizerId: 'owner-1' });
    await requireOwnership('event')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.targetResource).toEqual({ organizerId: 'owner-1' });
  });

  it('matches owner when the user identity comes from req.user.user_id', async () => {
    req.user = { user_id: 'owner-1' };
    eventRepository.getEventById.mockResolvedValue({ organizer_id: 'owner-1' });
    await requireOwnership('event')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('denies ticket ownership when the linked event cannot be loaded', async () => {
    ticketRepository.getTicketById.mockResolvedValue({ userId: 'buyer', eventId: 'evt-1' });
    eventRepository.getEventById.mockResolvedValue(null);
    await requireOwnership('ticket')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('denies ticket ownership when the linked event organizer differs', async () => {
    ticketRepository.getTicketById.mockResolvedValue({ userId: 'buyer', eventId: 'evt-1' });
    eventRepository.getEventById.mockResolvedValue({ organizerId: 'someone-else' });
    await requireOwnership('ticket')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('reads organizer_id from the linked event during the ownership fallback', async () => {
    ticketRepository.getTicketById.mockResolvedValue({ userId: 'buyer', eventId: 'evt-1' });
    eventRepository.getEventById.mockResolvedValue({ organizer_id: 'someone-else' });
    await requireOwnership('ticket')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('swallows event lookup errors during the ticket ownership fallback', async () => {
    ticketRepository.getTicketById.mockResolvedValue({ userId: 'buyer', eventId: 'evt-1' });
    eventRepository.getEventById.mockRejectedValue(new Error('db down'));
    await requireOwnership('ticket')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requirePermission', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { uid: 'u1' } };
    res = makeRes();
    next = jest.fn();
  });

  it('returns 401 when there is no user', async () => {
    req.user = null;
    await requirePermission('events.create')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: No authenticated user.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the user identity cannot be resolved', async () => {
    req.user = {};
    await requirePermission('events.create')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: Cannot resolve user identity.' });
  });

  it('resolves permissions using req.user.id', async () => {
    req.user = { id: 'by-id' };
    rbacRepository.resolveUserPermissionNames.mockResolvedValue(['events.create']);
    await requirePermission('events.create')(req, res, next);
    expect(rbacRepository.resolveUserPermissionNames).toHaveBeenCalledWith('by-id');
    expect(next).toHaveBeenCalled();
  });

  it('resolves permissions using req.user.user_id and grants on any matching permission', async () => {
    req.user = { user_id: 'by-uid' };
    rbacRepository.resolveUserPermissionNames.mockResolvedValue(['events.read']);
    await requirePermission('events.read', 'events.create')(req, res, next);
    expect(rbacRepository.resolveUserPermissionNames).toHaveBeenCalledWith('by-uid');
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when none of the required permissions match', async () => {
    rbacRepository.resolveUserPermissionNames.mockResolvedValue(['orders.read']);
    await requirePermission('events.create')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden: Requires one of permissions: events.create',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when permission resolution fails', async () => {
    rbacRepository.resolveUserPermissionNames.mockRejectedValue(new Error('boom'));
    await requirePermission('events.create')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Internal Server Error checking permissions.',
    });
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('requireOrganizationRole', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { uid: 'u1' }, params: { orgId: 'org-1' }, body: {}, query: {} };
    res = makeRes();
    next = jest.fn();
  });

  it('returns 401 when there is no user', async () => {
    req.user = null;
    await requireOrganizationRole('orgId', 'admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: No authenticated user.' });
  });

  it('returns 400 when the organization id is missing', async () => {
    req.params = {};
    await requireOrganizationRole('orgId', 'admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Bad Request: Organization identifier required.' });
  });

  it('reads orgId from the request body', async () => {
    req.params = {};
    req.body.orgId = 'org-body';
    rbacRepository.getOrganizationMember.mockResolvedValue({ role: 'admin' });
    await requireOrganizationRole('orgId', 'admin')(req, res, next);
    expect(rbacRepository.getOrganizationMember).toHaveBeenCalledWith('org-body', 'u1');
    expect(next).toHaveBeenCalled();
  });

  it('reads orgId from the query string', async () => {
    req.params = {};
    req.query.orgId = 'org-query';
    rbacRepository.getOrganizationMember.mockResolvedValue({ role: 'admin' });
    await requireOrganizationRole('orgId', 'admin')(req, res, next);
    expect(rbacRepository.getOrganizationMember).toHaveBeenCalledWith('org-query', 'u1');
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when the user identity cannot be resolved', async () => {
    req.user = {};
    await requireOrganizationRole('orgId', 'admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: Cannot resolve user identity.' });
  });

  it('returns 403 when the user is not a member', async () => {
    rbacRepository.getOrganizationMember.mockResolvedValue(null);
    await requireOrganizationRole('orgId', 'admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Not a member of this organization.' });
  });

  it('returns 403 when the membership role is not allowed', async () => {
    rbacRepository.getOrganizationMember.mockResolvedValue({ role: 'viewer' });
    await requireOrganizationRole('orgId', 'admin', 'manager')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden: Requires one of organization roles: admin, manager',
    });
  });

  it('sets organizationMembership and calls next on success', async () => {
    const membership = { role: 'manager' };
    rbacRepository.getOrganizationMember.mockResolvedValue(membership);
    await requireOrganizationRole('orgId', 'admin', 'manager')(req, res, next);
    expect(req.organizationMembership).toBe(membership);
    expect(next).toHaveBeenCalled();
  });

  it('returns 500 when the membership lookup fails', async () => {
    rbacRepository.getOrganizationMember.mockRejectedValue(new Error('boom'));
    await requireOrganizationRole('orgId', 'admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: 'Internal Server Error checking organization membership.',
    });
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('auditLog', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { uid: 'u1' },
      body: {},
      params: {},
      query: {},
      method: 'POST',
      url: '/events',
      ip: '1.2.3.4',
    };
    res = makeRes();
    next = jest.fn();
    rbacRepository.createAuditLog.mockResolvedValue(undefined);
  });

  it('records an audit entry from params and calls next', () => {
    req.params.eventId = 'evt-1';
    auditLog('update', 'event', 'eventId')(req, res, next);
    expect(next).toHaveBeenCalled();
    res.json({ ok: true });
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        action: 'update',
        resourceType: 'event',
        resourceId: 'evt-1',
        metadata: expect.objectContaining({ method: 'POST', path: '/events', statusCode: 200 }),
        ipAddress: '1.2.3.4',
      })
    );
  });

  it('falls back to the default id param name', () => {
    req.params.id = 'evt-1';
    auditLog('create', 'event')(req, res, next);
    res.json({ id: 'evt-1' });
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'evt-1' })
    );
  });

  it('reads the resource id from the request body', () => {
    req.body.eventId = 'evt-body';
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'evt-body' })
    );
  });

  it('reads the resource id from the query string', () => {
    req.query.eventId = 'evt-query';
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'evt-query' })
    );
  });

  it('reads the resource id from the response body', () => {
    req.user = null;
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({ eventId: 'evt-resp' });
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: null, resourceId: 'evt-resp' })
    );
  });

  it('falls back to the authenticated user id', () => {
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'u1' })
    );
  });

  it('uses req.user.id as the fallback identity', () => {
    req.user = { id: 'by-id' };
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'by-id', resourceId: 'by-id' })
    );
  });

  it('uses req.user.user_id as the fallback identity', () => {
    req.user = { user_id: 'by-uid' };
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'by-uid', resourceId: 'by-uid' })
    );
  });

  it('skips logging when no resource id can be resolved', () => {
    req.user = null;
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).not.toHaveBeenCalled();
  });

  it('extracts the ticket id from nested webhook data with a string embed_data', () => {
    req.user = null;
    req.body.data = JSON.stringify({ embed_data: JSON.stringify({ ticket_id: 'tkt-1' }) });
    auditLog('payment', 'ticket', 'ticketId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'tkt-1' })
    );
  });

  it('extracts the ticket id from nested webhook data with an object embed_data', () => {
    req.user = null;
    req.body.data = JSON.stringify({ embed_data: { ticketId: 'tkt-2' } });
    auditLog('payment', 'ticket', 'ticketId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'tkt-2' })
    );
  });

  it('ignores malformed webhook data without crashing', () => {
    req.user = null;
    req.body.data = 'not-json';
    auditLog('payment', 'ticket', 'ticketId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).not.toHaveBeenCalled();
  });

  it('skips webhook extraction when embed_data is absent', () => {
    req.user = null;
    req.body.data = JSON.stringify({ order_id: 'ord-1' });
    auditLog('payment', 'ticket', 'ticketId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).not.toHaveBeenCalled();
  });

  it('skips logging when embed_data has no ticket id', () => {
    req.user = null;
    req.body.data = JSON.stringify({ embed_data: JSON.stringify({ order_id: 'ord-1' }) });
    auditLog('payment', 'ticket', 'ticketId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).not.toHaveBeenCalled();
  });

  it('logs an error when audit log creation fails', async () => {
    rbacRepository.createAuditLog.mockRejectedValue(new Error('audit db down'));
    req.params.eventId = 'evt-1';
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({});
    await flushPromises();
    expect(logger.error).toHaveBeenCalledWith('auditLog error', { error: 'audit db down' });
  });

  it('uses connection.remoteAddress when req.ip is absent', () => {
    req.ip = undefined;
    req.connection = { remoteAddress: '5.6.7.8' };
    req.params.eventId = 'evt-1';
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: '5.6.7.8' })
    );
  });

  it('falls back to an empty ipAddress when ip and connection are absent', () => {
    req.ip = undefined;
    req.connection = {};
    req.params.eventId = 'evt-1';
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({});
    expect(rbacRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: '' })
    );
  });

  it('passes the response body through res.json unchanged', () => {
    const originalJson = res.json;
    req.params.eventId = 'evt-1';
    auditLog('create', 'event', 'eventId')(req, res, next);
    res.json({ ok: true });
    expect(originalJson).toHaveBeenCalledWith({ ok: true });
  });
});
