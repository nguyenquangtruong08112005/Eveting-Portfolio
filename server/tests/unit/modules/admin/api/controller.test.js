'use strict';

const mockAdminService = {
  getPendingEvents: jest.fn(),
  approveEvent: jest.fn(),
  rejectEvent: jest.fn(),
};

const mockPayoutRepository = {
  getAllPayoutsPaginated: jest.fn(),
};

const mockPayoutService = {
  adminApprovePayout: jest.fn(),
};

jest.mock('@/modules/admin/application/service', () => mockAdminService);
jest.mock('@/providers/database/payout.repository', () => mockPayoutRepository);
jest.mock('@/modules/payments/application/payout.service', () => mockPayoutService);
jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const {
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getPayoutList,
  approvePayout,
} = require('@/modules/admin/api/controller');

const uid = 'admin_001';

function mockReq(overrides = {}) {
  return {
    user: { uid },
    params: {},
    body: {},
    query: {},
    ip: '127.0.0.1',
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getPendingEvents', () => {
  it('returns paginated pending events with defaults', async () => {
    const events = [{ id: 'evt_1' }, { id: 'evt_2' }];
    mockAdminService.getPendingEvents.mockResolvedValue(events);
    const req = mockReq();
    const res = mockRes();

    await getPendingEvents(req, res);

    expect(mockAdminService.getPendingEvents).toHaveBeenCalledWith(1, 20);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ events, page: 1, limit: 20, total: 2 });
  });

  it('parses page and limit from query', async () => {
    mockAdminService.getPendingEvents.mockResolvedValue([]);
    const req = mockReq({ query: { page: '2', limit: '10' } });
    const res = mockRes();

    await getPendingEvents(req, res);

    expect(mockAdminService.getPendingEvents).toHaveBeenCalledWith(2, 10);
  });

  it('falls back to defaults on NaN', async () => {
    mockAdminService.getPendingEvents.mockResolvedValue([]);
    const req = mockReq({ query: { page: 'abc', limit: 'xyz' } });
    const res = mockRes();

    await getPendingEvents(req, res);

    expect(mockAdminService.getPendingEvents).toHaveBeenCalledWith(1, 20);
  });

  it('clamps limit to max 100', async () => {
    mockAdminService.getPendingEvents.mockResolvedValue([]);
    const req = mockReq({ query: { limit: '999' } });
    const res = mockRes();

    await getPendingEvents(req, res);

    expect(mockAdminService.getPendingEvents).toHaveBeenCalledWith(1, 100);
  });

  it('clamps page to minimum 1', async () => {
    mockAdminService.getPendingEvents.mockResolvedValue([]);
    const req = mockReq({ query: { page: '0' } });
    const res = mockRes();

    await getPendingEvents(req, res);

    expect(mockAdminService.getPendingEvents).toHaveBeenCalledWith(1, 20);
  });

  it('empty array fallback when events is not an array', async () => {
    mockAdminService.getPendingEvents.mockResolvedValue(null);
    const req = mockReq();
    const res = mockRes();

    await getPendingEvents(req, res);

    expect(res.json).toHaveBeenCalledWith({ events: [], page: 1, limit: 20, total: 0 });
  });

  it('returns 500 on service error', async () => {
    mockAdminService.getPendingEvents.mockRejectedValue(new Error('DB fail'));
    const req = mockReq();
    const res = mockRes();

    await getPendingEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'DB fail' });
  });
});

describe('approveEvent', () => {
  const eventId = 'evt_001';
  const result = { success: true, message: 'Event approved and published.' };

  it('approves event with admin user identity', async () => {
    mockAdminService.approveEvent.mockResolvedValue(result);
    const req = mockReq({ params: { id: eventId } });
    const res = mockRes();

    await approveEvent(req, res);

    expect(mockAdminService.approveEvent).toHaveBeenCalledWith(eventId, uid, '127.0.0.1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('uses system_admin when req.user is missing', async () => {
    mockAdminService.approveEvent.mockResolvedValue(result);
    const req = mockReq({ user: undefined, params: { id: eventId } });
    const res = mockRes();

    await approveEvent(req, res);

    expect(mockAdminService.approveEvent).toHaveBeenCalledWith(eventId, 'system_admin', '127.0.0.1');
  });

  it('falls back to req.user.id when uid not present', async () => {
    mockAdminService.approveEvent.mockResolvedValue(result);
    const req = mockReq({ user: { id: 'admin_by_id' }, params: { id: eventId } });
    const res = mockRes();

    await approveEvent(req, res);

    expect(mockAdminService.approveEvent).toHaveBeenCalledWith(eventId, 'admin_by_id', '127.0.0.1');
  });

  it('returns error with service statusCode', async () => {
    const err = new Error('Cannot approve');
    err.statusCode = 400;
    mockAdminService.approveEvent.mockRejectedValue(err);
    const req = mockReq({ params: { id: eventId } });
    const res = mockRes();

    await approveEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Cannot approve' });
  });

  it('returns 500 when error has no statusCode', async () => {
    mockAdminService.approveEvent.mockRejectedValue(new Error('Unexpected'));
    const req = mockReq({ params: { id: eventId } });
    const res = mockRes();

    await approveEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('rejectEvent', () => {
  const eventId = 'evt_001';

  it('rejects event with reason and admin identity', async () => {
    const result = { success: true, message: 'Event rejected.' };
    mockAdminService.rejectEvent.mockResolvedValue(result);
    const req = mockReq({ params: { id: eventId }, body: { reason: 'Inappropriate content' } });
    const res = mockRes();

    await rejectEvent(req, res);

    expect(mockAdminService.rejectEvent).toHaveBeenCalledWith(eventId, 'Inappropriate content', uid, '127.0.0.1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('handles missing reason gracefully', async () => {
    mockAdminService.rejectEvent.mockResolvedValue({ success: true });
    const req = mockReq({ params: { id: eventId }, body: {} });
    const res = mockRes();

    await rejectEvent(req, res);

    expect(mockAdminService.rejectEvent).toHaveBeenCalledWith(eventId, undefined, uid, '127.0.0.1');
  });

  it('uses system_admin when req.user is missing', async () => {
    mockAdminService.rejectEvent.mockResolvedValue({ success: true });
    const req = mockReq({ user: undefined, params: { id: eventId }, body: { reason: 'Spam' } });
    const res = mockRes();

    await rejectEvent(req, res);

    expect(mockAdminService.rejectEvent).toHaveBeenCalledWith(eventId, 'Spam', 'system_admin', '127.0.0.1');
  });

  it('returns error with service statusCode', async () => {
    const err = new Error('Cannot reject');
    err.statusCode = 409;
    mockAdminService.rejectEvent.mockRejectedValue(err);
    const req = mockReq({ params: { id: eventId }, body: { reason: 'Test' } });
    const res = mockRes();

    await rejectEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.send).toHaveBeenCalledWith({ error: 'Cannot reject' });
  });

  it('returns 500 when error has no statusCode', async () => {
    mockAdminService.rejectEvent.mockRejectedValue(new Error('Unexpected'));
    const req = mockReq({ params: { id: eventId }, body: { reason: 'Test' } });
    const res = mockRes();

    await rejectEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getPayoutList', () => {
  it('returns paginated payouts with defaults', async () => {
    const payouts = [{ id: 'po_1' }];
    mockPayoutRepository.getAllPayoutsPaginated.mockResolvedValue({ total: 1, payouts });
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await getPayoutList(req, res, next);

    expect(mockPayoutRepository.getAllPayoutsPaginated).toHaveBeenCalledWith(20, 0, null);
    expect(res.json).toHaveBeenCalledWith({ page: 1, limit: 20, total: 1, payouts });
    expect(next).not.toHaveBeenCalled();
  });

  it('parses page, limit, status from query', async () => {
    mockPayoutRepository.getAllPayoutsPaginated.mockResolvedValue({ total: 0, payouts: [] });
    const req = mockReq({ query: { page: '2', limit: '10', status: 'pending_admin_approval' } });
    const res = mockRes();
    const next = jest.fn();

    await getPayoutList(req, res, next);

    expect(mockPayoutRepository.getAllPayoutsPaginated).toHaveBeenCalledWith(10, 10, 'pending_admin_approval');
  });

  it('falls back to defaults on NaN query params', async () => {
    mockPayoutRepository.getAllPayoutsPaginated.mockResolvedValue({ total: 0, payouts: [] });
    const req = mockReq({ query: { page: 'abc', limit: 'xyz' } });
    const res = mockRes();
    const next = jest.fn();

    await getPayoutList(req, res, next);

    expect(mockPayoutRepository.getAllPayoutsPaginated).toHaveBeenCalledWith(20, 0, null);
  });

  it('propagates service error via next', async () => {
    const err = new Error('Payout fetch failed');
    mockPayoutRepository.getAllPayoutsPaginated.mockRejectedValue(err);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await getPayoutList(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('approvePayout', () => {
  const payoutId = 'po_001';

  it('approves payout with reason', async () => {
    const result = { id: payoutId, status: 'completed' };
    mockPayoutService.adminApprovePayout.mockResolvedValue(result);
    const req = mockReq({ params: { id: payoutId }, body: { reason: 'Verified' } });
    const res = mockRes();
    const next = jest.fn();

    await approvePayout(req, res, next);

    expect(mockPayoutService.adminApprovePayout).toHaveBeenCalledWith(payoutId, 'Verified');
    expect(res.json).toHaveBeenCalledWith(result);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes null reason when not provided', async () => {
    mockPayoutService.adminApprovePayout.mockResolvedValue({});
    const req = mockReq({ params: { id: payoutId }, body: {} });
    const res = mockRes();
    const next = jest.fn();

    await approvePayout(req, res, next);

    expect(mockPayoutService.adminApprovePayout).toHaveBeenCalledWith(payoutId, null);
  });

  it('propagates service error via next', async () => {
    const err = new Error('Payout approval failed');
    mockPayoutService.adminApprovePayout.mockRejectedValue(err);
    const req = mockReq({ params: { id: payoutId }, body: { reason: 'OK' } });
    const res = mockRes();
    const next = jest.fn();

    await approvePayout(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
