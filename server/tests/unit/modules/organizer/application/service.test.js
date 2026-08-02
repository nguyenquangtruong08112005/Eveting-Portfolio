/* eslint-env jest */

const mockTransaction = { query: jest.fn() };

const mockJwt = { verify: jest.fn() };
jest.mock('jsonwebtoken', () => mockJwt);

jest.mock('crypto', () => ({ randomUUID: jest.fn(() => 'fixed-uuid') }));

const mockTicketRepo = {
  runTransaction: jest.fn(),
  getAttendeeTicketsByEventId: jest.fn(),
  updateTicketInTransaction: jest.fn(),
};
jest.mock('@/providers/database/ticket.repository', () => mockTicketRepo);

const mockUserRepo = {
  getUsersByIds: jest.fn(),
  addHistoryEventIdInTransaction: jest.fn(),
  findUserByEmail: jest.fn(),
};
jest.mock('@/providers/database/user.repository', () => mockUserRepo);

const mockEventRepo = {
  getEventsByOrganizerId: jest.fn(),
  getEventRawById: jest.fn(),
  getEventDataById: jest.fn(),
  getEventById: jest.fn(),
  getEventInTransaction: jest.fn(),
  getEventEntriesByOrganizer: jest.fn(),
};
jest.mock('@/providers/database/event.repository', () => mockEventRepo);

const mockAnalyticsRepo = {
  getAnalyticsByEventIds: jest.fn(),
  incrementCheckInInTransaction: jest.fn(),
};
jest.mock('@/providers/database/analytics.repository', () => mockAnalyticsRepo);

const mockOrganizerRepo = {
  addOrganizerRoleToUser: jest.fn(),
  getOrganizerProfile: jest.fn(),
  updateOrganizerProfile: jest.fn(),
};
jest.mock('@/providers/database/organizer.repository', () => mockOrganizerRepo);

const mockOrderRepo = {
  getLedgerEntriesByOrganizer: jest.fn(),
};
jest.mock('@/providers/database/order.repository', () => mockOrderRepo);

const mockTicketService = {
  bookTicket: jest.fn(),
  confirmTicketPayment: jest.fn(),
};
jest.mock('@/modules/tickets', () => ({ service: mockTicketService }));

const mockSeatRepo = {
  getPerformanceSeatLayout: jest.fn(),
  savePerformanceSeatLayout: jest.fn(),
};
jest.mock('@/providers/database/seat.repository', () => mockSeatRepo);

const mockOrgTeamService = {
  ensureOrganizerTeam: jest.fn(),
  authorizeEventPermission: jest.fn(),
};
jest.mock('@/modules/memberships/application/organizer-team.service', () => mockOrgTeamService);

jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

jest.mock('@/shared/errors', () => {
  class AppError extends Error {
    constructor(message, statusCode, code) { super(message); this.statusCode = statusCode; this.code = code; }
  }
  return {
    AppError,
    BadRequestError: class extends AppError { constructor(m = 'Bad Request') { super(m, 400, 'BAD_REQUEST'); } },
    NotFoundError: class extends AppError { constructor(m = 'Not Found') { super(m, 404, 'NOT_FOUND'); } },
    ForbiddenError: class extends AppError { constructor(m = 'Forbidden') { super(m, 403, 'FORBIDDEN'); } },
  };
});

const mockAttendeeHelper = { mapAttendees: jest.fn() };
jest.mock('@/modules/organizer/application/attendee.helper', () => mockAttendeeHelper);

const mockProfileHelper = { mapOrganizerProfile: jest.fn(), buildOrganizerUpdateData: jest.fn() };
jest.mock('@/modules/organizer/application/profile.helper', () => mockProfileHelper);

const mockStatsHelper = { computeOrganizerStats: jest.fn() };
jest.mock('@/modules/organizer/application/stats.helper', () => mockStatsHelper);

const mockImportExportHelper = {
  parseImportWorkbook: jest.fn(),
  buildExportWorkbook: jest.fn(),
};
jest.mock('@/modules/organizer/application/import-export.helper', () => mockImportExportHelper);

const mockNotifHelper = { sendBroadcastNotification: jest.fn() };
jest.mock('@/modules/organizer/application/notification.helper', () => mockNotifHelper);

const { BadRequestError, NotFoundError, ForbiddenError, AppError } = require('@/shared/errors');
const service = require('@/modules/organizer/application/service');

const userId = 'user-1';
const organizerId = 'org-1';
const eventId = 'evt-1';
const ticketId = 'tkt-1';

const mockProfile = {
  id: organizerId, name: 'Test Org', avatarUrl: null, website: '',
  organizerInfo: {}, followersCount: 0, rating: 5.0,
};

beforeEach(() => {
  jest.resetAllMocks();
  mockTicketRepo.runTransaction.mockImplementation(async (cb) => cb(mockTransaction));
});

// --- Context Selection ---

describe('registerOrganizer', () => {
  it('creates organizer role and ensures team', async () => {
    mockOrganizerRepo.addOrganizerRoleToUser.mockResolvedValue(mockProfile);
    const result = await service.registerOrganizer(userId, { organizationName: 'Test Org' });
    expect(result).toBe(mockProfile);
    expect(mockOrganizerRepo.addOrganizerRoleToUser).toHaveBeenCalledWith(userId, { organizationName: 'Test Org' });
    expect(mockOrgTeamService.ensureOrganizerTeam).toHaveBeenCalledWith(userId, 'Test Org');
  });

  it('uses companyName when organizationName is missing', async () => {
    mockOrganizerRepo.addOrganizerRoleToUser.mockResolvedValue(mockProfile);
    await service.registerOrganizer(userId, { companyName: 'ACME' });
    expect(mockOrgTeamService.ensureOrganizerTeam).toHaveBeenCalledWith(userId, 'ACME');
  });
});

describe('getOrganizerProfile', () => {
  it('returns mapped profile', async () => {
    const raw = { id: organizerId, organizerInfo: { companyName: 'Test Org' } };
    mockOrganizerRepo.getOrganizerProfile.mockResolvedValue(raw);
    mockProfileHelper.mapOrganizerProfile.mockReturnValue(mockProfile);
    const result = await service.getOrganizerProfile(userId);
    expect(result).toEqual(mockProfile);
    expect(mockOrganizerRepo.getOrganizerProfile).toHaveBeenCalledWith(userId);
  });

  it('returns null when not found', async () => {
    mockOrganizerRepo.getOrganizerProfile.mockResolvedValue(null);
    mockProfileHelper.mapOrganizerProfile.mockReturnValue(null);
    expect(await service.getOrganizerProfile(userId)).toBeNull();
  });
});

describe('updateOrganizerProfile', () => {
  it('updates and returns profile', async () => {
    mockProfileHelper.buildOrganizerUpdateData.mockReturnValue({ 'organizerInfo.companyName': 'New Name' });
    mockOrganizerRepo.getOrganizerProfile.mockResolvedValue({ id: organizerId });
    mockProfileHelper.mapOrganizerProfile.mockReturnValue({ ...mockProfile, name: 'New Name' });
    const result = await service.updateOrganizerProfile(userId, { companyName: 'New Name' });
    expect(mockOrganizerRepo.updateOrganizerProfile).toHaveBeenCalledWith(userId, { 'organizerInfo.companyName': 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('skips update when no data to update', async () => {
    mockProfileHelper.buildOrganizerUpdateData.mockReturnValue({});
    mockOrganizerRepo.getOrganizerProfile.mockResolvedValue({ id: organizerId });
    mockProfileHelper.mapOrganizerProfile.mockReturnValue(mockProfile);
    const result = await service.updateOrganizerProfile(userId, {});
    expect(mockOrganizerRepo.updateOrganizerProfile).not.toHaveBeenCalled();
    expect(result).toBe(mockProfile);
  });
});

// --- Read / Dashboard paths ---

describe('getMyEvents', () => {
  const mockEvent = {
    id: eventId, name: 'Test Event', lifecycleStatus: 'published', status: 'active',
  };
  const mockRaw = {
    data: {
      ticketTypes: { vip: { available: 100 }, standard: { capacity: 200 } },
      minPrice: 50, capacity: 300,
    },
  };
  const mockTickets = [{ quantity: 3 }, { quantity: 2 }];

  it('enriches events with sold count, capacity, price', async () => {
    mockEventRepo.getEventsByOrganizerId.mockResolvedValue([mockEvent]);
    mockEventRepo.getEventRawById.mockResolvedValue(mockRaw);
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue(mockTickets);
    const result = await service.getMyEvents(organizerId);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: eventId, name: 'Test Event', status: 'published', lifecycleStatus: 'published',
      sold: 5, capacity: 300, price: 50,
    });
    expect(mockEventRepo.getEventsByOrganizerId).toHaveBeenCalledWith(organizerId, { page: 1, limit: 20, status: undefined });
  });

  it('returns empty array when no events', async () => {
    mockEventRepo.getEventsByOrganizerId.mockResolvedValue([]);
    expect(await service.getMyEvents(organizerId)).toEqual([]);
  });

  it('respects page, limit, status params', async () => {
    mockEventRepo.getEventsByOrganizerId.mockResolvedValue([]);
    await service.getMyEvents(organizerId, 2, 10, 'draft');
    expect(mockEventRepo.getEventsByOrganizerId).toHaveBeenCalledWith(organizerId, { page: 2, limit: 10, status: 'draft' });
  });

  it('falls back to event.status when lifecycleStatus is missing', async () => {
    mockEventRepo.getEventsByOrganizerId.mockResolvedValue([{ id: eventId, name: 'E', lifecycleStatus: null, status: 'active' }]);
    mockEventRepo.getEventRawById.mockResolvedValue({ data: null });
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([]);
    const result = await service.getMyEvents(organizerId);
    expect(result[0]).toMatchObject({ status: 'active', lifecycleStatus: 'active', sold: 0, capacity: 0, price: 0 });
  });

  it('uses raw lifecycleStatus and legacy quantity capacity', async () => {
    mockEventRepo.getEventsByOrganizerId.mockResolvedValue([{ id: eventId, name: 'E', lifecycleStatus: null, status: null }]);
    mockEventRepo.getEventRawById.mockResolvedValue({ data: { ticketTypes: { vip: null, std: { quantity: 5 } }, capacity: 40, lifecycleStatus: 'archived' } });
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([{ quantity: 2 }]);
    const result = await service.getMyEvents(organizerId);
    expect(result[0]).toMatchObject({ status: 'archived', lifecycleStatus: 'archived', sold: 2, capacity: 5, price: 0 });
  });

  it('falls back to raw capacity when computed totalCapacity is zero', async () => {
    mockEventRepo.getEventsByOrganizerId.mockResolvedValue([{ id: eventId, name: 'E' }]);
    mockEventRepo.getEventRawById.mockResolvedValue({ data: { ticketTypes: {}, capacity: 40, lifecycleStatus: 'archived' } });
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([]);
    const result = await service.getMyEvents(organizerId);
    expect(result[0]).toMatchObject({ status: 'archived', capacity: 40 });
  });

  it('defaults to draft and zero capacity when raw data is absent', async () => {
    mockEventRepo.getEventsByOrganizerId.mockResolvedValue([{ id: eventId, name: 'E' }]);
    mockEventRepo.getEventRawById.mockResolvedValue({ data: null });
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([]);
    const result = await service.getMyEvents(organizerId);
    expect(result[0]).toMatchObject({ status: 'draft', lifecycleStatus: 'draft', capacity: 0, price: 0 });
  });
});

describe('getLedger', () => {
  it('returns ledger entries', async () => {
    const entries = [{ id: 'l1', amount: 100 }];
    mockOrderRepo.getLedgerEntriesByOrganizer.mockResolvedValue(entries);
    expect(await service.getLedger(organizerId)).toBe(entries);
  });
});

describe('getOrganizerStats', () => {
  const stats = { totalRevenue: 1000, totalTicketsSold: 50, totalEvents: 1, upcomingEvents: 1 };

  it('computes stats when events exist', async () => {
    mockEventRepo.getEventEntriesByOrganizer.mockResolvedValue([{ id: eventId, date: Date.now() + 86400000 }]);
    mockAnalyticsRepo.getAnalyticsByEventIds.mockResolvedValue([{ totalRevenue: 1000, ticketsSold: { standard: 50 }, dailySales: {} }]);
    mockStatsHelper.computeOrganizerStats.mockReturnValue(stats);
    expect(await service.getOrganizerStats(organizerId)).toEqual(stats);
    expect(mockAnalyticsRepo.getAnalyticsByEventIds).toHaveBeenCalledWith([eventId]);
  });

  it('returns zeroed stats when no events (skips analytics fetch)', async () => {
    mockEventRepo.getEventEntriesByOrganizer.mockResolvedValue([]);
    mockStatsHelper.computeOrganizerStats.mockReturnValue({ totalRevenue: 0, totalTicketsSold: 0, totalEvents: 0, upcomingEvents: 0 });
    const result = await service.getOrganizerStats(organizerId);
    expect(result.totalEvents).toBe(0);
    expect(mockAnalyticsRepo.getAnalyticsByEventIds).not.toHaveBeenCalled();
  });
});

describe('getAttendeesByEventId', () => {
  it('returns empty when no tickets', async () => {
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([]);
    expect(await service.getAttendeesByEventId(eventId)).toEqual([]);
  });

  it('returns empty when tickets have no userIds', async () => {
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([{ id: 't1', userId: null }]);
    expect(await service.getAttendeesByEventId(eventId)).toEqual([]);
  });

  it('returns mapped attendees', async () => {
    const tickets = [{ id: 't1', userId: 'u1', type: 'vip', status: 'paid' }];
    const attendees = [{ ticket: { id: 't1' }, user: { id: 'u1' } }];
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue(tickets);
    mockUserRepo.getUsersByIds.mockResolvedValue({ u1: { name: 'A', email: 'a@b.com' } });
    mockAttendeeHelper.mapAttendees.mockReturnValue(attendees);
    expect(await service.getAttendeesByEventId(eventId)).toEqual(attendees);
    expect(mockUserRepo.getUsersByIds).toHaveBeenCalledWith(['u1']);
  });
});

describe('getSeatLayout', () => {
  it('returns layout', async () => {
    mockSeatRepo.getPerformanceSeatLayout.mockResolvedValue({ sections: [] });
    expect(await service.getSeatLayout(eventId, 'perf-1')).toEqual({ sections: [] });
  });

  it('throws NotFoundError when missing', async () => {
    mockSeatRepo.getPerformanceSeatLayout.mockResolvedValue(null);
    await expect(service.getSeatLayout(eventId, 'perf-1')).rejects.toThrow(NotFoundError);
  });
});

describe('saveSeatLayout', () => {
  it('rejects null layout', async () => {
    await expect(service.saveSeatLayout(eventId, 'perf-1', null)).rejects.toThrow(BadRequestError);
  });

  it('rejects missing sections array', async () => {
    await expect(service.saveSeatLayout(eventId, 'perf-1', {})).rejects.toThrow(BadRequestError);
  });

  it('rejects over 500 seats', async () => {
    const seats = Array.from({ length: 501 }, (_, i) => ({ id: `s${i}` }));
    await expect(service.saveSeatLayout(eventId, 'perf-1', { sections: [{ rows: [{ seats }] }] })).rejects.toThrow(BadRequestError);
  });

  it('throws NotFoundError when save returns null', async () => {
    mockSeatRepo.savePerformanceSeatLayout.mockResolvedValue(null);
    await expect(service.saveSeatLayout(eventId, 'perf-1', { sections: [{ rows: [{ seats: [{ id: 's1' }] }] }] })).rejects.toThrow(NotFoundError);
  });

  it('rejects a section without rows', async () => {
    await expect(service.saveSeatLayout(eventId, 'perf-1', { sections: [{}] })).rejects.toThrow(BadRequestError);
  });

  it('rejects a row without seats', async () => {
    await expect(service.saveSeatLayout(eventId, 'perf-1', { sections: [{ rows: [{}] }] })).rejects.toThrow(BadRequestError);
  });

  it('saves and returns layout', async () => {
    const layout = { sections: [{ rows: [{ seats: [{ id: 's1' }] }] }] };
    mockSeatRepo.savePerformanceSeatLayout.mockResolvedValue(layout);
    expect(await service.saveSeatLayout(eventId, 'perf-1', layout)).toBe(layout);
    expect(mockSeatRepo.savePerformanceSeatLayout).toHaveBeenCalledWith(eventId, 'perf-1', layout);
  });
});

// --- Mutation paths ---

describe('checkInByQr', () => {
  const qrToken = 'valid-qr';
  const mockPayload = { ticketId, eventId, userId: 'tu-1', ticketTypeId: 'vip' };

  const mockTicketRow = {
    id: ticketId, event_id: eventId, user_id: 'tu-1', organizer_id: organizerId,
    type: 'vip', seat: null, status: 'paid', quantity: 2, check_in_count: 0,
    last_check_in_at: null, checked_in_at: null, raw_data: { ticketTypeId: 'vip' },
  };

  const mockEventData = { id: eventId, name: 'Test' };

  function setupSuccess() {
    mockJwt.verify.mockReturnValue(mockPayload);
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [mockTicketRow] })
      .mockResolvedValueOnce({ rows: [{ entries: 0, exits: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(mockEventData);
    mockOrgTeamService.authorizeEventPermission.mockResolvedValue(undefined);
  }

  it('rejects invalid QR token', async () => {
    mockJwt.verify.mockImplementation(() => { throw new Error('jwt fail'); });
    await expect(service.checkInByQr('bad-token', userId)).rejects.toThrow(BadRequestError);
  });

  it('rejects incomplete payload', async () => {
    mockJwt.verify.mockReturnValue({ ticketId: 'only-id' });
    await expect(service.checkInByQr(qrToken, userId)).rejects.toThrow(BadRequestError);
  });

  it('rejects invalid direction', async () => {
    mockJwt.verify.mockReturnValue(mockPayload);
    await expect(service.checkInByQr(qrToken, userId, 'zoom')).rejects.toThrow(BadRequestError);
  });

  it('throws NotFoundError when ticket not found in DB', async () => {
    mockJwt.verify.mockReturnValue(mockPayload);
    mockTransaction.query.mockResolvedValueOnce({ rows: [] });
    await expect(service.checkInByQr(qrToken, userId)).rejects.toThrow(NotFoundError);
  });

  it('rejects payload mismatch', async () => {
    mockJwt.verify.mockReturnValue({ ...mockPayload, eventId: 'wrong-evt' });
    mockTransaction.query.mockResolvedValueOnce({ rows: [mockTicketRow] });
    await expect(service.checkInByQr(qrToken, userId)).rejects.toThrow(BadRequestError);
  });

  it('throws NotFoundError when event deleted between decode and tx', async () => {
    mockJwt.verify.mockReturnValue(mockPayload);
    mockTransaction.query.mockResolvedValueOnce({ rows: [mockTicketRow] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(null);
    await expect(service.checkInByQr(qrToken, userId)).rejects.toThrow(NotFoundError);
  });

  it('rejects when organizerTeamService denies permission', async () => {
    mockJwt.verify.mockReturnValue(mockPayload);
    mockTransaction.query.mockResolvedValueOnce({ rows: [mockTicketRow] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(mockEventData);
    mockOrgTeamService.authorizeEventPermission.mockRejectedValue(new ForbiddenError('permission denied'));
    await expect(service.checkInByQr(qrToken, userId)).rejects.toThrow(ForbiddenError);
  });

  it('rejects non-eligible ticket status', async () => {
    mockJwt.verify.mockReturnValue(mockPayload);
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [{ ...mockTicketRow, status: 'cancelled' }] })
      .mockResolvedValueOnce({ rows: [{ entries: 0, exits: 0 }] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(mockEventData);
    mockOrgTeamService.authorizeEventPermission.mockResolvedValue(undefined);
    await expect(service.checkInByQr(qrToken, userId)).rejects.toThrow(AppError);
  });

  it('rejects entry when ticket already reached check-in limit', async () => {
    mockJwt.verify.mockReturnValue(mockPayload);
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [{ ...mockTicketRow, check_in_count: 2 }] })
      .mockResolvedValueOnce({ rows: [{ entries: 2, exits: 0 }] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(mockEventData);
    mockOrgTeamService.authorizeEventPermission.mockResolvedValue(undefined);
    await expect(service.checkInByQr(qrToken, userId)).rejects.toThrow(AppError);
  });

  it('rejects exit when no recorded entries', async () => {
    mockJwt.verify.mockReturnValue(mockPayload);
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [mockTicketRow] })
      .mockResolvedValueOnce({ rows: [{ entries: 0, exits: 0 }] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(mockEventData);
    mockOrgTeamService.authorizeEventPermission.mockResolvedValue(undefined);
    await expect(service.checkInByQr(qrToken, userId, 'exit')).rejects.toThrow(AppError);
  });

  it('processes entry successfully — upgrades status, increments counts', async () => {
    setupSuccess();
    const result = await service.checkInByQr(qrToken, userId);
    expect(result.action).toBe('entry');
    expect(result.status).toBe('checkedIn');
    expect(result.checkInCount).toBe(1);
    expect(result.remaining).toBe(1);
    expect(result.entryCount).toBe(1);
    expect(result.currentlyInside).toBe(1);
    expect(mockTicketRepo.updateTicketInTransaction).toHaveBeenCalled();
    expect(mockUserRepo.addHistoryEventIdInTransaction).toHaveBeenCalled();
    expect(mockAnalyticsRepo.incrementCheckInInTransaction).toHaveBeenCalled();
  });

  it('processes exit successfully — no status change, no analytics increment', async () => {
    mockJwt.verify.mockReturnValue(mockPayload);
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [mockTicketRow] })
      .mockResolvedValueOnce({ rows: [{ entries: 1, exits: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(mockEventData);
    mockOrgTeamService.authorizeEventPermission.mockResolvedValue(undefined);
    const result = await service.checkInByQr(qrToken, userId, 'exit');
    expect(result.action).toBe('exit');
    expect(result.status).toBe('paid');
    expect(result.checkInCount).toBe(1);
    expect(result.exitCount).toBe(1);
    expect(result.currentlyInside).toBe(0);
    expect(mockTicketRepo.updateTicketInTransaction).not.toHaveBeenCalled();
    expect(mockAnalyticsRepo.incrementCheckInInTransaction).not.toHaveBeenCalled();
  });

  it('records check-in INSERT with correct params', async () => {
    setupSuccess();
    await service.checkInByQr(qrToken, userId);
    const insertCall = mockTransaction.query.mock.calls.find(c => c[0].includes('INSERT INTO ticket_check_ins'));
    expect(insertCall).toBeDefined();
    expect(insertCall[1][1]).toBe(ticketId);
    expect(insertCall[1][2]).toBe(eventId);
    expect(insertCall[1][3]).toBe(userId);
    expect(insertCall[1][5]).toBe('entry');
  });

  it('keeps checkedIn status and skips history add on second entry', async () => {
    mockJwt.verify.mockReturnValue(mockPayload);
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [{ ...mockTicketRow, status: 'checkedIn', quantity: 2, check_in_count: 1 }] })
      .mockResolvedValueOnce({ rows: [{ entries: 1, exits: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(mockEventData);
    mockOrgTeamService.authorizeEventPermission.mockResolvedValue(undefined);
    const result = await service.checkInByQr(qrToken, userId);
    expect(result.status).toBe('checkedIn');
    expect(result.remaining).toBe(0);
    const updates = mockTicketRepo.updateTicketInTransaction.mock.calls[0][2];
    expect(updates).toHaveProperty('checkInCount', 2);
    expect(updates).not.toHaveProperty('status');
    expect(mockUserRepo.addHistoryEventIdInTransaction).not.toHaveBeenCalled();
    expect(mockAnalyticsRepo.incrementCheckInInTransaction).toHaveBeenCalled();
  });

  it('derives timestamps from ticket row and forwards performance/version metadata', async () => {
    const lastCheckIn = new Date('2024-01-15T10:00:00.000Z');
    const checkedIn = new Date('2024-01-16T10:00:00.000Z');
    mockJwt.verify.mockReturnValue({ ...mockPayload, performanceId: 'perf-9', version: 'v2' });
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [{ ...mockTicketRow, raw_data: null, last_check_in_at: lastCheckIn, checked_in_at: checkedIn, check_in_count: 1 }] })
      .mockResolvedValueOnce({ rows: [{ entries: 1, exits: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(mockEventData);
    mockOrgTeamService.authorizeEventPermission.mockResolvedValue(undefined);
    const result = await service.checkInByQr(qrToken, userId);
    expect(result.lastCheckInAt).toBe(lastCheckIn.getTime());
    expect(result.checkedInAt).toBe(checkedIn.getTime());
    expect(mockOrgTeamService.authorizeEventPermission).toHaveBeenCalledWith(
      userId, eventId, 'SCAN_TICKETS',
      expect.objectContaining({ performanceId: 'perf-9', ticketTypeId: 'vip' }),
      mockTransaction
    );
    const insertCall = mockTransaction.query.mock.calls.find(c => c[0].includes('INSERT INTO ticket_check_ins'));
    expect(insertCall[1][6]).toBe('perf-9');
    expect(insertCall[1][7]).toBe('vip');
    expect(insertCall[1][8]).toBe(JSON.stringify({ qrVersion: 'v2' }));
  });

  it('falls back to ticket.type when raw data and payload lack ticketTypeId', async () => {
    mockJwt.verify.mockReturnValue({ ticketId, eventId, userId: 'tu-1' });
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [{ ...mockTicketRow, raw_data: {} }] })
      .mockResolvedValueOnce({ rows: [{ entries: 0, exits: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    mockEventRepo.getEventInTransaction.mockResolvedValue(mockEventData);
    mockOrgTeamService.authorizeEventPermission.mockResolvedValue(undefined);
    await service.checkInByQr(qrToken, userId);
    expect(mockOrgTeamService.authorizeEventPermission).toHaveBeenCalledWith(
      userId, eventId, 'SCAN_TICKETS',
      expect.objectContaining({ ticketTypeId: 'vip' }),
      mockTransaction
    );
    const insertCall = mockTransaction.query.mock.calls.find(c => c[0].includes('INSERT INTO ticket_check_ins'));
    expect(insertCall[1][7]).toBe('vip');
  });
});

describe('importAttendees', () => {
  const fileBuffer = Buffer.from('xlsx');
  const rows = [{ Email: 'a@b.com', ticketType: 'vip' }];

  it('throws when event not found', async () => {
    mockEventRepo.getEventDataById.mockResolvedValue(null);
    await expect(service.importAttendees(eventId, fileBuffer, organizerId)).rejects.toThrow('Event not found.');
  });

  it('throws when organizer does not own event', async () => {
    mockEventRepo.getEventDataById.mockResolvedValue({ id: eventId, organizerId: 'other-org' });
    await expect(service.importAttendees(eventId, fileBuffer, organizerId)).rejects.toThrow('Forbidden.');
  });

  it('imports each row, books and confirms ticket', async () => {
    mockImportExportHelper.parseImportWorkbook.mockReturnValue(rows);
    mockEventRepo.getEventDataById.mockResolvedValue({ id: eventId, organizerId });
    mockUserRepo.findUserByEmail.mockResolvedValue({ _id: 'u1' });
    mockTicketService.bookTicket.mockResolvedValue({ id: 'new-tkt' });
    mockTicketService.confirmTicketPayment.mockResolvedValue(undefined);
    const result = await service.importAttendees(eventId, fileBuffer, organizerId);
    expect(result.successCount).toBe(1);
    expect(result.failCount).toBe(0);
    expect(mockTicketService.bookTicket).toHaveBeenCalledWith('u1', eventId, 'vip');
  });

  it('reports failures per row without throwing', async () => {
    mockImportExportHelper.parseImportWorkbook.mockReturnValue([{ Email: 'unknown@b.com' }]);
    mockEventRepo.getEventDataById.mockResolvedValue({ id: eventId, organizerId });
    mockUserRepo.findUserByEmail.mockResolvedValue(null);
    const result = await service.importAttendees(eventId, fileBuffer, organizerId);
    expect(result.successCount).toBe(0);
    expect(result.failCount).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('reports missing email rows as failures', async () => {
    mockImportExportHelper.parseImportWorkbook.mockReturnValue([{ TicketType: 'vip' }]);
    mockEventRepo.getEventDataById.mockResolvedValue({ id: eventId, organizerId });
    const result = await service.importAttendees(eventId, fileBuffer, organizerId);
    expect(result.successCount).toBe(0);
    expect(result.failCount).toBe(1);
    expect(result.errors[0].error).toBe('Missing email.');
    expect(mockUserRepo.findUserByEmail).not.toHaveBeenCalled();
  });

  it('imports rows using lowercase email field and default ticket type', async () => {
    mockImportExportHelper.parseImportWorkbook.mockReturnValue([{ email: 'a@b.com' }]);
    mockEventRepo.getEventDataById.mockResolvedValue({ id: eventId, organizerId });
    mockUserRepo.findUserByEmail.mockResolvedValue({ _id: 'u1' });
    mockTicketService.bookTicket.mockResolvedValue({ id: 'new-tkt' });
    mockTicketService.confirmTicketPayment.mockResolvedValue(undefined);
    const result = await service.importAttendees(eventId, fileBuffer, organizerId);
    expect(result.successCount).toBe(1);
    expect(mockTicketService.bookTicket).toHaveBeenCalledWith('u1', eventId, 'Standard');
  });
});

describe('exportAttendees', () => {
  it('returns xlsx buffer', async () => {
    const xlsxBuffer = Buffer.from('xlsx-data');
    mockImportExportHelper.buildExportWorkbook.mockReturnValue({ xlsx: { writeBuffer: jest.fn().mockResolvedValue(xlsxBuffer) } });
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([{ id: 't1', userId: 'u1' }]);
    mockUserRepo.getUsersByIds.mockResolvedValue({ u1: { name: 'A', email: 'a@b.com' } });
    mockAttendeeHelper.mapAttendees.mockReturnValue([{ ticket: { id: 't1' }, user: { id: 'u1' } }]);
    const result = await service.exportAttendees(eventId);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe('xlsx-data');
  });
});

describe('broadcastNotification', () => {
  it('throws when event not found', async () => {
    mockEventRepo.getEventById.mockResolvedValue(null);
    await expect(service.broadcastNotification(eventId, 't', 'm', organizerId)).rejects.toThrow('Event not found.');
  });

  it('throws when organizer does not own event', async () => {
    mockEventRepo.getEventById.mockResolvedValue({ id: eventId, organizerId: 'other-org' });
    await expect(service.broadcastNotification(eventId, 't', 'm', organizerId)).rejects.toThrow('Forbidden.');
  });

  it('returns { count: 0 } when no tickets', async () => {
    mockEventRepo.getEventById.mockResolvedValue({ id: eventId, organizerId });
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([]);
    expect(await service.broadcastNotification(eventId, 't', 'm', organizerId)).toEqual({ count: 0 });
  });

  it('broadcasts via notification.helper and returns count', async () => {
    mockEventRepo.getEventById.mockResolvedValue({ id: eventId, organizerId });
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    mockNotifHelper.sendBroadcastNotification.mockResolvedValue({ count: 2 });
    const result = await service.broadcastNotification(eventId, 'Title', 'Message', organizerId);
    expect(result).toEqual({ count: 2 });
    expect(mockNotifHelper.sendBroadcastNotification).toHaveBeenCalledWith(['u1', 'u2'], 'Title', 'Message', eventId);
  });

  it('deduplicates user ids before broadcasting', async () => {
    mockEventRepo.getEventById.mockResolvedValue({ id: eventId, organizerId });
    mockTicketRepo.getAttendeeTicketsByEventId.mockResolvedValue([{ userId: 'u1' }, { userId: 'u1' }, { userId: 'u2' }]);
    mockNotifHelper.sendBroadcastNotification.mockResolvedValue({ count: 2 });
    const result = await service.broadcastNotification(eventId, 'Title', 'Message', organizerId);
    expect(result).toEqual({ count: 2 });
    expect(mockNotifHelper.sendBroadcastNotification).toHaveBeenCalledWith(['u1', 'u2'], 'Title', 'Message', eventId);
  });
});
