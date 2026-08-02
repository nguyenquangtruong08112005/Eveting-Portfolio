'use strict';

jest.mock('@/modules/memberships/application/organizer-team.service', () => ({
  requirePrimaryOrganizer: jest.fn(),
  authorizeEventPermission: jest.fn(),
  authorizeTeamPermission: jest.fn(),
}));

const organizerTeamService = require('@/modules/memberships/application/organizer-team.service');
const { BadRequestError } = require('@/shared/errors');

const {
  requirePrimaryOrganizer,
  requireEventPermission,
  requireTeamPermission,
} = require('@/modules/memberships/api/organizer-rbac.middleware');

const uid = 'user_001';
const access = { role: 'ADMIN', permissions: ['EDIT_EVENT'], isOwner: true };

function mockReq(overrides = {}) {
  return { user: { uid }, body: {}, params: {}, query: {}, ...overrides };
}

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requirePrimaryOrganizer', () => {
  it('delegates to the service and calls next on success', async () => {
    organizerTeamService.requirePrimaryOrganizer.mockResolvedValue(true);
    const req = mockReq();
    const next = jest.fn();
    await requirePrimaryOrganizer(req, {}, next);
    expect(organizerTeamService.requirePrimaryOrganizer).toHaveBeenCalledWith(uid);
    expect(next).toHaveBeenCalled();
  });

  it('forwards service errors via next', async () => {
    const err = new Error('Primary organizer access is required');
    organizerTeamService.requirePrimaryOrganizer.mockRejectedValue(err);
    const req = mockReq();
    const next = jest.fn();
    await requirePrimaryOrganizer(req, {}, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('requireEventPermission', () => {
  it('reads eventId from query when options.fromQuery is set', async () => {
    organizerTeamService.authorizeEventPermission.mockResolvedValue(access);
    const req = mockReq({ query: { eventId: 'evt_1' } });
    const next = jest.fn();
    await requireEventPermission('EDIT_EVENT', { fromQuery: true })(req, {}, next);
    expect(organizerTeamService.authorizeEventPermission).toHaveBeenCalledWith(uid, 'evt_1', 'EDIT_EVENT');
    expect(req.organizerAccess).toBe(access);
    expect(next).toHaveBeenCalled();
  });

  it('reads eventId from params by default', async () => {
    organizerTeamService.authorizeEventPermission.mockResolvedValue(access);
    const req = mockReq({ params: { eventId: 'evt_2' } });
    const next = jest.fn();
    await requireEventPermission('MANAGE_EVENT')(req, {}, next);
    expect(organizerTeamService.authorizeEventPermission).toHaveBeenCalledWith(uid, 'evt_2', 'MANAGE_EVENT');
    expect(req.organizerAccess).toBe(access);
    expect(next).toHaveBeenCalled();
  });

  it('falls back to body.eventId when not in params', async () => {
    organizerTeamService.authorizeEventPermission.mockResolvedValue(access);
    const req = mockReq({ body: { eventId: 'evt_3' } });
    const next = jest.fn();
    await requireEventPermission('VIEW_EVENT')(req, {}, next);
    expect(organizerTeamService.authorizeEventPermission).toHaveBeenCalledWith(uid, 'evt_3', 'VIEW_EVENT');
    expect(next).toHaveBeenCalled();
  });

  it('throws BadRequestError when eventId is missing', async () => {
    const req = mockReq();
    const next = jest.fn();
    await requireEventPermission('EDIT_EVENT')(req, {}, next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(next.mock.calls[0][0].message).toBe('eventId is required');
  });

  it('forwards service errors via next', async () => {
    const err = new Error('Organizer team permission required: EDIT_EVENT');
    organizerTeamService.authorizeEventPermission.mockRejectedValue(err);
    const req = mockReq({ params: { eventId: 'evt_1' } });
    const next = jest.fn();
    await requireEventPermission('EDIT_EVENT')(req, {}, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('requireTeamPermission', () => {
  it('reads teamId from params', async () => {
    organizerTeamService.authorizeTeamPermission.mockResolvedValue(access);
    const req = mockReq({ params: { teamId: 'team_1' } });
    const next = jest.fn();
    await requireTeamPermission('MANAGE_TEAM')(req, {}, next);
    expect(organizerTeamService.authorizeTeamPermission).toHaveBeenCalledWith(uid, 'team_1', 'MANAGE_TEAM');
    expect(req.organizerAccess).toBe(access);
    expect(next).toHaveBeenCalled();
  });

  it('reads teamId from body', async () => {
    organizerTeamService.authorizeTeamPermission.mockResolvedValue(access);
    const req = mockReq({ body: { teamId: 'team_2' } });
    const next = jest.fn();
    await requireTeamPermission('MANAGE_TEAM')(req, {}, next);
    expect(organizerTeamService.authorizeTeamPermission).toHaveBeenCalledWith(uid, 'team_2', 'MANAGE_TEAM');
    expect(next).toHaveBeenCalled();
  });

  it('reads teamId from query', async () => {
    organizerTeamService.authorizeTeamPermission.mockResolvedValue(access);
    const req = mockReq({ query: { teamId: 'team_3' } });
    const next = jest.fn();
    await requireTeamPermission('MANAGE_TEAM')(req, {}, next);
    expect(organizerTeamService.authorizeTeamPermission).toHaveBeenCalledWith(uid, 'team_3', 'MANAGE_TEAM');
    expect(next).toHaveBeenCalled();
  });

  it('throws BadRequestError when teamId is missing', async () => {
    const req = mockReq();
    const next = jest.fn();
    await requireTeamPermission('MANAGE_TEAM')(req, {}, next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(next.mock.calls[0][0].message).toBe('teamId is required');
  });

  it('forwards service errors via next', async () => {
    const err = new Error('Organizer team not found');
    organizerTeamService.authorizeTeamPermission.mockRejectedValue(err);
    const req = mockReq({ params: { teamId: 'team_1' } });
    const next = jest.fn();
    await requireTeamPermission('MANAGE_TEAM')(req, {}, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(err);
  });
});
