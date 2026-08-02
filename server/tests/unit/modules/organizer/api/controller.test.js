'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockOrganizerService = {
  checkInByQr: jest.fn(),
  registerOrganizer: jest.fn(),
  getOrganizerProfile: jest.fn(),
  getMyEvents: jest.fn(),
  getOrganizerStats: jest.fn(),
  updateOrganizerProfile: jest.fn(),
  getAttendeesByEventId: jest.fn(),
  importAttendees: jest.fn(),
  exportAttendees: jest.fn(),
  broadcastNotification: jest.fn(),
  getLedger: jest.fn(),
  getSeatLayout: jest.fn(),
  saveSeatLayout: jest.fn(),
};
jest.mock('@/modules/organizer/application/service', () => mockOrganizerService);

const mockAnalyticsService = { getAnalyticsByEventId: jest.fn() };
jest.mock('@/modules/analytics/application/service', () => mockAnalyticsService);

const mockEventRepo = { getEventById: jest.fn() };
jest.mock('@/providers/database/event.repository', () => mockEventRepo);

const mockPayoutRepo = {
  getPayoutSummaryByOrganizer: jest.fn(),
  getPayoutsByOrganizerPaginated: jest.fn(),
  getBankAccountSafe: jest.fn(),
};
jest.mock('@/providers/database/payout.repository', () => mockPayoutRepo);

const mockPayoutService = { registerBankAccount: jest.fn() };
jest.mock('@/modules/payments/application/payout.service', () => mockPayoutService);

jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const {
  verifyEventOwnership,
  checkInByQr,
  registerOrganizer,
  getOrganizerProfile,
  getMyEvents,
  getStatsOverview,
  getEventStats,
  updateOrganizerProfile,
  getEventAttendees,
  importAttendees,
  exportAttendees,
  broadcastNotification,
  getLedger,
  getSeatLayout,
  saveSeatLayout,
  getPayoutSummary,
  getPayoutList,
  getBankAccountInfo,
  registerBankAccount,
} = require('@/modules/organizer/api/controller');

const uid = 'user_001';
const eventId = 'evt_001';
const orgId = 'org_001';

function mockReq(overrides = {}) {
  return {
    user: { uid },
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('verifyEventOwnership', () => {
  it('throws BadRequestError when eventId is missing', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await verifyEventOwnership(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: 'eventId is missing.' }));
  });

  it('throws NotFoundError when event not found', async () => {
    mockEventRepo.getEventById.mockResolvedValue(null);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await verifyEventOwnership(req, res, next);
    expect(mockEventRepo.getEventById).toHaveBeenCalledWith(eventId);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, message: 'Event not found.' }));
  });

  it('throws ForbiddenError when organizer is not the owner', async () => {
    mockEventRepo.getEventById.mockResolvedValue({ id: eventId, organizerId: 'other_org' });
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await verifyEventOwnership(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, message: 'You are not the owner of this event.' }));
  });

  it('sets req.event and calls next on success', async () => {
    const event = { id: eventId, organizerId: orgId };
    mockEventRepo.getEventById.mockResolvedValue(event);
    const req = mockReq({ params: { eventId }, user: { uid: orgId } });
    const res = mockRes();
    const next = jest.fn();
    await verifyEventOwnership(req, res, next);
    expect(req.event).toBe(event);
    expect(next).toHaveBeenCalledWith();
  });

  it('reads eventId from body when params missing', async () => {
    const event = { id: eventId, organizerId: orgId };
    mockEventRepo.getEventById.mockResolvedValue(event);
    const req = mockReq({ body: { eventId }, user: { uid: orgId } });
    const res = mockRes();
    const next = jest.fn();
    await verifyEventOwnership(req, res, next);
    expect(mockEventRepo.getEventById).toHaveBeenCalledWith(eventId);
    expect(next).toHaveBeenCalledWith();
  });

  it('reads eventId from query when params and body missing', async () => {
    const event = { id: eventId, organizerId: orgId };
    mockEventRepo.getEventById.mockResolvedValue(event);
    const req = mockReq({ query: { eventId }, user: { uid: orgId } });
    const res = mockRes();
    const next = jest.fn();
    await verifyEventOwnership(req, res, next);
    expect(mockEventRepo.getEventById).toHaveBeenCalledWith(eventId);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('checkInByQr', () => {
  const ticketInfo = {
    id: 'tkt_001', userId: 'u1', type: 'vip', seat: 'A1',
    status: 'checkedIn', checkedInAt: new Date().toISOString(),
    checkInCount: 1, quantity: 2, remaining: 1, currentlyInside: 1,
  };

  it('returns 200 with ticket info on entry', async () => {
    mockOrganizerService.checkInByQr.mockResolvedValue({ action: 'entry', ...ticketInfo });
    const req = mockReq({ body: { qrToken: 'valid-qr' } });
    const res = mockRes();
    const next = jest.fn();
    await checkInByQr(req, res, next);
    expect(mockOrganizerService.checkInByQr).toHaveBeenCalledWith('valid-qr', uid, 'entry');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      valid: true, action: 'entry', message: 'Check-in successful',
      ticketInfo: expect.objectContaining({ ticketId: ticketInfo.id }),
    });
  });

  it('returns 200 with check-out message on exit', async () => {
    mockOrganizerService.checkInByQr.mockResolvedValue({ action: 'exit', ...ticketInfo });
    const req = mockReq({ body: { qrToken: 'valid-qr', direction: 'exit' } });
    const res = mockRes();
    const next = jest.fn();
    await checkInByQr(req, res, next);
    expect(mockOrganizerService.checkInByQr).toHaveBeenCalledWith('valid-qr', uid, 'exit');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Check-out successful' }));
  });

  it('returns 400 with INVALID_TICKET on BAD_REQUEST error', async () => {
    const err = new Error('Invalid ticket');
    err.code = 'BAD_REQUEST';
    mockOrganizerService.checkInByQr.mockRejectedValue(err);
    const req = mockReq({ body: { qrToken: 'bad-qr' } });
    const res = mockRes();
    const next = jest.fn();
    await checkInByQr(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ valid: false, error: 'INVALID_TICKET' });
  });

  it('returns 409 with duplicate info on TICKET_ALREADY_CHECKED_IN error', async () => {
    const err = new Error('Ticket already checked in');
    err.code = 'TICKET_ALREADY_CHECKED_IN';
    err.details = { previousCheckIn: '2024-01-01T00:00:00Z' };
    mockOrganizerService.checkInByQr.mockRejectedValue(err);
    const req = mockReq({ body: { qrToken: 'dup-qr' } });
    const res = mockRes();
    const next = jest.fn();
    await checkInByQr(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      valid: false, duplicate: true,
      error: { code: 'TICKET_ALREADY_CHECKED_IN', message: 'Ticket already checked in', details: err.details },
    });
  });

  it('propagates unexpected errors via next', async () => {
    const err = new Error('Unexpected DB failure');
    mockOrganizerService.checkInByQr.mockRejectedValue(err);
    const req = mockReq({ body: { qrToken: 'qr' } });
    const res = mockRes();
    const next = jest.fn();
    await checkInByQr(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('defaults direction to entry', async () => {
    mockOrganizerService.checkInByQr.mockResolvedValue({ action: 'entry', ...ticketInfo });
    const req = mockReq({ body: { qrToken: 'qr' } });
    const res = mockRes();
    const next = jest.fn();
    await checkInByQr(req, res, next);
    expect(mockOrganizerService.checkInByQr).toHaveBeenCalledWith('qr', uid, 'entry');
  });
});

describe('registerOrganizer', () => {
  it('calls service and returns 200', async () => {
    const body = { organizationName: 'My Org' };
    mockOrganizerService.registerOrganizer.mockResolvedValue(undefined);
    const req = mockReq({ body });
    const res = mockRes();
    const next = jest.fn();
    await registerOrganizer(req, res, next);
    expect(mockOrganizerService.registerOrganizer).toHaveBeenCalledWith(uid, body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Register successful.' });
  });

  it('propagates service error via next', async () => {
    const err = new Error('Registration failed');
    mockOrganizerService.registerOrganizer.mockRejectedValue(err);
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = jest.fn();
    await registerOrganizer(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('getOrganizerProfile', () => {
  it('returns profile with 200', async () => {
    const profile = { id: orgId, name: 'Test Org' };
    mockOrganizerService.getOrganizerProfile.mockResolvedValue(profile);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getOrganizerProfile(req, res, next);
    expect(mockOrganizerService.getOrganizerProfile).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(profile);
  });

  it('propagates error via next', async () => {
    mockOrganizerService.getOrganizerProfile.mockRejectedValue(new Error('fail'));
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getOrganizerProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'fail' }));
  });
});

describe('getMyEvents', () => {
  const events = [{ id: eventId, name: 'Test' }];

  it('returns paginated events with 200', async () => {
    mockOrganizerService.getMyEvents.mockResolvedValue(events);
    const req = mockReq({ query: { page: '2', limit: '10', status: 'published' } });
    const res = mockRes();
    const next = jest.fn();
    await getMyEvents(req, res, next);
    expect(mockOrganizerService.getMyEvents).toHaveBeenCalledWith(uid, 2, 10, 'published');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: events });
  });

  it('defaults page to 1 and limit to 20', async () => {
    mockOrganizerService.getMyEvents.mockResolvedValue([]);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getMyEvents(req, res, next);
    expect(mockOrganizerService.getMyEvents).toHaveBeenCalledWith(uid, 1, 20, undefined);
  });

  it('clamps page to min 1', async () => {
    mockOrganizerService.getMyEvents.mockResolvedValue([]);
    const req = mockReq({ query: { page: '0' } });
    const res = mockRes();
    const next = jest.fn();
    await getMyEvents(req, res, next);
    expect(mockOrganizerService.getMyEvents).toHaveBeenCalledWith(uid, 1, 20, undefined);
  });

  it('clamps limit to max 100', async () => {
    mockOrganizerService.getMyEvents.mockResolvedValue([]);
    const req = mockReq({ query: { limit: '999' } });
    const res = mockRes();
    const next = jest.fn();
    await getMyEvents(req, res, next);
    expect(mockOrganizerService.getMyEvents).toHaveBeenCalledWith(uid, 1, 100, undefined);
  });

  it('falls back to defaults on NaN query params', async () => {
    mockOrganizerService.getMyEvents.mockResolvedValue([]);
    const req = mockReq({ query: { page: 'abc', limit: 'xyz' } });
    const res = mockRes();
    const next = jest.fn();
    await getMyEvents(req, res, next);
    expect(mockOrganizerService.getMyEvents).toHaveBeenCalledWith(uid, 1, 20, undefined);
  });

  it('propagates error via next', async () => {
    mockOrganizerService.getMyEvents.mockRejectedValue(new Error('fail'));
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getMyEvents(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'fail' }));
  });
});

describe('getStatsOverview', () => {
  it('returns stats with 200', async () => {
    const stats = { totalRevenue: 1000, totalTicketsSold: 50 };
    mockOrganizerService.getOrganizerStats.mockResolvedValue(stats);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getStatsOverview(req, res, next);
    expect(mockOrganizerService.getOrganizerStats).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(stats);
  });
});

describe('getEventStats', () => {
  it('returns analytics with 200', async () => {
    const analytics = { views: 100 };
    mockAnalyticsService.getAnalyticsByEventId.mockResolvedValue(analytics);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getEventStats(req, res, next);
    expect(mockAnalyticsService.getAnalyticsByEventId).toHaveBeenCalledWith(eventId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(analytics);
  });

  it('returns empty object when analytics is null', async () => {
    mockAnalyticsService.getAnalyticsByEventId.mockResolvedValue(null);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getEventStats(req, res, next);
    expect(res.json).toHaveBeenCalledWith({});
  });
});

describe('updateOrganizerProfile', () => {
  it('returns updated profile with 200', async () => {
    const profile = { id: orgId, name: 'Updated' };
    mockOrganizerService.updateOrganizerProfile.mockResolvedValue(profile);
    const req = mockReq({ body: { name: 'Updated' } });
    const res = mockRes();
    const next = jest.fn();
    await updateOrganizerProfile(req, res, next);
    expect(mockOrganizerService.updateOrganizerProfile).toHaveBeenCalledWith(uid, { name: 'Updated' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(profile);
  });
});

describe('getEventAttendees', () => {
  it('returns attendees with 200', async () => {
    const attendees = [{ userId: 'u1' }];
    mockOrganizerService.getAttendeesByEventId.mockResolvedValue(attendees);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getEventAttendees(req, res, next);
    expect(mockOrganizerService.getAttendeesByEventId).toHaveBeenCalledWith(eventId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ attendees });
  });
});

describe('importAttendees', () => {
  it('throws BadRequestError when no file uploaded', async () => {
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await importAttendees(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: 'No file uploaded. Please upload an Excel/CSV file.' }));
  });

  it('returns 200 with import result', async () => {
    const result = { successCount: 1, failCount: 0 };
    mockOrganizerService.importAttendees.mockResolvedValue(result);
    const req = mockReq({ params: { eventId }, file: { buffer: Buffer.from('xlsx') } });
    const res = mockRes();
    const next = jest.fn();
    await importAttendees(req, res, next);
    expect(mockOrganizerService.importAttendees).toHaveBeenCalledWith(eventId, req.file.buffer, uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('uses organizerAccess.ownerOrganizerId when present', async () => {
    mockOrganizerService.importAttendees.mockResolvedValue({});
    const req = mockReq({
      params: { eventId },
      file: { buffer: Buffer.from('xlsx') },
      organizerAccess: { ownerOrganizerId: 'team_org' },
    });
    const res = mockRes();
    const next = jest.fn();
    await importAttendees(req, res, next);
    expect(mockOrganizerService.importAttendees).toHaveBeenCalledWith(eventId, req.file.buffer, 'team_org');
  });
});

describe('exportAttendees', () => {
  it('returns xlsx buffer with correct headers', async () => {
    const buffer = Buffer.from('xlsx-data');
    mockOrganizerService.exportAttendees.mockResolvedValue(buffer);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await exportAttendees(req, res, next);
    expect(mockOrganizerService.exportAttendees).toHaveBeenCalledWith(eventId);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', `attachment; filename=attendees_${eventId}.xlsx`);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });
});

describe('broadcastNotification', () => {
  const title = 'Test Title';
  const message = 'Test Message';

  it('returns 200 with sent count', async () => {
    mockOrganizerService.broadcastNotification.mockResolvedValue({ count: 5 });
    const req = mockReq({ params: { eventId }, body: { title, message } });
    const res = mockRes();
    const next = jest.fn();
    await broadcastNotification(req, res, next);
    expect(mockOrganizerService.broadcastNotification).toHaveBeenCalledWith(eventId, title, message, uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, sentTo: 5 });
  });

  it('uses organizerAccess.ownerOrganizerId when present', async () => {
    mockOrganizerService.broadcastNotification.mockResolvedValue({ count: 0 });
    const req = mockReq({
      params: { eventId },
      body: { title, message },
      organizerAccess: { ownerOrganizerId: 'team_org' },
    });
    const res = mockRes();
    const next = jest.fn();
    await broadcastNotification(req, res, next);
    expect(mockOrganizerService.broadcastNotification).toHaveBeenCalledWith(eventId, title, message, 'team_org');
  });
});

describe('getLedger', () => {
  it('returns ledger entries with 200', async () => {
    const entries = [{ id: 'l1', amount: 100 }];
    mockOrganizerService.getLedger.mockResolvedValue(entries);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getLedger(req, res, next);
    expect(mockOrganizerService.getLedger).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ entries });
  });
});

describe('getSeatLayout', () => {
  it('returns layout with 200', async () => {
    const layout = { sections: [] };
    mockOrganizerService.getSeatLayout.mockResolvedValue(layout);
    const req = mockReq({ params: { eventId }, query: { performanceId: 'perf-1' } });
    const res = mockRes();
    const next = jest.fn();
    await getSeatLayout(req, res, next);
    expect(mockOrganizerService.getSeatLayout).toHaveBeenCalledWith(eventId, 'perf-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(layout);
  });

  it('passes undefined performanceId when missing', async () => {
    mockOrganizerService.getSeatLayout.mockResolvedValue({});
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getSeatLayout(req, res, next);
    expect(mockOrganizerService.getSeatLayout).toHaveBeenCalledWith(eventId, undefined);
  });
});

describe('saveSeatLayout', () => {
  it('saves and returns layout with 200', async () => {
    const layout = { sections: [{ rows: [] }] };
    mockOrganizerService.saveSeatLayout.mockResolvedValue(layout);
    const req = mockReq({ params: { eventId }, query: { performanceId: 'perf-1' }, body: { layout } });
    const res = mockRes();
    const next = jest.fn();
    await saveSeatLayout(req, res, next);
    expect(mockOrganizerService.saveSeatLayout).toHaveBeenCalledWith(eventId, 'perf-1', layout);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(layout);
  });
});

describe('getPayoutSummary', () => {
  it('returns payout summary with 200', async () => {
    const summary = { eligibleNetAmount: 1000, pendingApprovalAmount: 200, processingAmount: 0, completedAmount: 500 };
    mockPayoutRepo.getPayoutSummaryByOrganizer.mockResolvedValue(summary);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getPayoutSummary(req, res, next);
    expect(mockPayoutRepo.getPayoutSummaryByOrganizer).toHaveBeenCalledWith(uid);
    expect(res.json).toHaveBeenCalledWith({
      eligibleNetAmount: 1000,
      pendingApprovalAmount: 200,
      processingAmount: 0,
      completedAmount: 500,
      nextScheduledPayoutAt: expect.any(String),
    });
  });
});

describe('getPayoutList', () => {
  const payouts = [{ id: 'p1', amount: 100 }];

  it('returns paginated payouts with 200', async () => {
    mockPayoutRepo.getPayoutsByOrganizerPaginated.mockResolvedValue({ total: 1, payouts });
    const req = mockReq({ query: { page: '2', limit: '10' } });
    const res = mockRes();
    const next = jest.fn();
    await getPayoutList(req, res, next);
    expect(mockPayoutRepo.getPayoutsByOrganizerPaginated).toHaveBeenCalledWith(uid, 10, 10);
    expect(res.json).toHaveBeenCalledWith({ page: 2, limit: 10, total: 1, payouts });
  });

  it('defaults page to 1 and limit to 20', async () => {
    mockPayoutRepo.getPayoutsByOrganizerPaginated.mockResolvedValue({ total: 0, payouts: [] });
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getPayoutList(req, res, next);
    expect(mockPayoutRepo.getPayoutsByOrganizerPaginated).toHaveBeenCalledWith(uid, 20, 0);
  });

  it('clamps page to min 1', async () => {
    mockPayoutRepo.getPayoutsByOrganizerPaginated.mockResolvedValue({ total: 0, payouts: [] });
    const req = mockReq({ query: { page: '-1' } });
    const res = mockRes();
    const next = jest.fn();
    await getPayoutList(req, res, next);
    expect(mockPayoutRepo.getPayoutsByOrganizerPaginated).toHaveBeenCalledWith(uid, 20, 0);
  });

  it('clamps limit to max 100', async () => {
    mockPayoutRepo.getPayoutsByOrganizerPaginated.mockResolvedValue({ total: 0, payouts: [] });
    const req = mockReq({ query: { limit: '200' } });
    const res = mockRes();
    const next = jest.fn();
    await getPayoutList(req, res, next);
    expect(mockPayoutRepo.getPayoutsByOrganizerPaginated).toHaveBeenCalledWith(uid, 100, 0);
  });
});

describe('getBankAccountInfo', () => {
  it('returns registered: false when no account', async () => {
    mockPayoutRepo.getBankAccountSafe.mockResolvedValue(null);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getBankAccountInfo(req, res, next);
    expect(mockPayoutRepo.getBankAccountSafe).toHaveBeenCalledWith(uid);
    expect(res.json).toHaveBeenCalledWith({ registered: false });
  });

  it('returns masked account info when registered', async () => {
    const acct = { maskedDisplay: '****1234', createdAt: '2024-01-01', updatedAt: '2024-06-01' };
    mockPayoutRepo.getBankAccountSafe.mockResolvedValue(acct);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getBankAccountInfo(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ registered: true, ...acct });
  });
});

describe('registerBankAccount', () => {
  it('calls payout service and returns result', async () => {
    const result = { success: true };
    mockPayoutService.registerBankAccount.mockResolvedValue(result);
    const body = { accountNumber: '123456', accountHolder: 'John', bankName: 'VCB' };
    const req = mockReq({ body });
    const res = mockRes();
    const next = jest.fn();
    await registerBankAccount(req, res, next);
    expect(mockPayoutService.registerBankAccount).toHaveBeenCalledWith(uid, '123456', 'John', 'VCB');
    expect(res.json).toHaveBeenCalledWith(result);
  });
});
