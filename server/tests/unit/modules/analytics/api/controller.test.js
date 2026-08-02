'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockAnalyticsService = {
  getAnalyticsByEventId: jest.fn(),
  recordTraffic: jest.fn(),
  getRevenueDashboard: jest.fn(),
  getTrafficDashboard: jest.fn(),
  getCheckInDashboard: jest.fn(),
};

jest.mock('@/modules/analytics/application/service', () => mockAnalyticsService);

const {
  getEventAnalytics,
  recordTraffic,
  getRevenueDashboard,
  getTrafficDashboard,
  getCheckInDashboard,
} = require('@/modules/analytics/api/controller');

const eventId = 'evt_001';

function mockReq(overrides = {}) {
  return {
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
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getEventAnalytics', () => {
  it('returns analytics data with 200', async () => {
    const analytics = { eventId, views: 100 };
    mockAnalyticsService.getAnalyticsByEventId.mockResolvedValue(analytics);
    const req = mockReq({ query: { eventId } });
    const res = mockRes();
    const next = jest.fn();

    await getEventAnalytics(req, res, next);

    expect(mockAnalyticsService.getAnalyticsByEventId).toHaveBeenCalledWith(eventId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(analytics);
  });

  it('throws NotFoundError when analytics is null', async () => {
    mockAnalyticsService.getAnalyticsByEventId.mockResolvedValue(null);
    const req = mockReq({ query: { eventId } });
    const res = mockRes();
    const next = jest.fn();

    await getEventAnalytics(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Analytics data not found for this event' })
    );
  });

  it('propagates async error via next', async () => {
    const err = new Error('DB fail');
    mockAnalyticsService.getAnalyticsByEventId.mockRejectedValue(err);
    const req = mockReq({ query: { eventId } });
    const res = mockRes();
    const next = jest.fn();

    await getEventAnalytics(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('recordTraffic', () => {
  it('records traffic and returns 202', async () => {
    const traffic = { id: 'traffic_001' };
    mockAnalyticsService.recordTraffic.mockResolvedValue(traffic);
    const req = mockReq({
      body: {
        eventId,
        visitorKey: 'vk_12345678',
        source: 'facebook',
        rawData: { path: '/test', referrer: 'https://example.com' },
      },
    });
    const res = mockRes();
    const next = jest.fn();

    await recordTraffic(req, res, next);

    expect(mockAnalyticsService.recordTraffic).toHaveBeenCalledWith(
      eventId, 'vk_12345678', 'facebook', { path: '/test', referrer: 'https://example.com' }
    );
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ recorded: true, trafficId: 'traffic_001' });
  });

  it('uses default source as direct', async () => {
    mockAnalyticsService.recordTraffic.mockResolvedValue({ id: 'traffic_002' });
    const req = mockReq({
      body: { eventId, visitorKey: 'vk_12345678' },
    });
    const res = mockRes();
    const next = jest.fn();

    await recordTraffic(req, res, next);

    expect(mockAnalyticsService.recordTraffic).toHaveBeenCalledWith(
      eventId, 'vk_12345678', 'direct', undefined
    );
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it('propagates async error via next', async () => {
    const err = new Error('Traffic recording failed');
    mockAnalyticsService.recordTraffic.mockRejectedValue(err);
    const req = mockReq({
      body: { eventId, visitorKey: 'vk_12345678' },
    });
    const res = mockRes();
    const next = jest.fn();

    await recordTraffic(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('getRevenueDashboard', () => {
  it('returns revenue dashboard with 200', async () => {
    const dashboard = { totalRevenue: 500000, ticketSales: [] };
    mockAnalyticsService.getRevenueDashboard.mockResolvedValue(dashboard);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();

    await getRevenueDashboard(req, res, next);

    expect(mockAnalyticsService.getRevenueDashboard).toHaveBeenCalledWith(eventId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(dashboard);
  });

  it('propagates async error via next', async () => {
    mockAnalyticsService.getRevenueDashboard.mockRejectedValue(new Error('Fail'));
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();

    await getRevenueDashboard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Fail' }));
  });
});

describe('getTrafficDashboard', () => {
  it('returns traffic dashboard with 200', async () => {
    const dashboard = { pageViews: 1000, uniqueVisitors: 500 };
    mockAnalyticsService.getTrafficDashboard.mockResolvedValue(dashboard);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();

    await getTrafficDashboard(req, res, next);

    expect(mockAnalyticsService.getTrafficDashboard).toHaveBeenCalledWith(eventId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(dashboard);
  });

  it('propagates async error via next', async () => {
    mockAnalyticsService.getTrafficDashboard.mockRejectedValue(new Error('Fail'));
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();

    await getTrafficDashboard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Fail' }));
  });
});

describe('getCheckInDashboard', () => {
  it('returns check-in dashboard with organizerAccess', async () => {
    const dashboard = { checkedIn: 50, total: 100 };
    const organizerAccess = { role: 'admin', scopes: [] };
    mockAnalyticsService.getCheckInDashboard.mockResolvedValue(dashboard);
    const req = mockReq({ params: { eventId }, organizerAccess });
    const res = mockRes();
    const next = jest.fn();

    await getCheckInDashboard(req, res, next);

    expect(mockAnalyticsService.getCheckInDashboard).toHaveBeenCalledWith(eventId, organizerAccess);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(dashboard);
  });

  it('passes undefined organizerAccess when not set', async () => {
    mockAnalyticsService.getCheckInDashboard.mockResolvedValue({});
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();

    await getCheckInDashboard(req, res, next);

    expect(mockAnalyticsService.getCheckInDashboard).toHaveBeenCalledWith(eventId, undefined);
  });

  it('propagates async error via next', async () => {
    mockAnalyticsService.getCheckInDashboard.mockRejectedValue(new Error('Fail'));
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();

    await getCheckInDashboard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Fail' }));
  });
});
