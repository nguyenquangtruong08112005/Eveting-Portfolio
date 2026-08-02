'use strict';

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

const mockReviewService = {
  getReviewsByEventId: jest.fn(),
  createReview: jest.fn(),
  canReviewEvent: jest.fn(),
};

jest.mock('@/modules/reviews/application/service', () => mockReviewService);

const { getEventReviews, createReview } = require('@/modules/reviews/api/controller');

const uid = 'user_001';
const eventId = 'event_001';

function mockReq(overrides = {}) {
  return {
    user: { uid },
    params: { eventId },
    body: {},
    query: {},
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

describe('getEventReviews', () => {
  it('returns reviews with default pagination', async () => {
    const result = { items: [], total: 0 };
    mockReviewService.getReviewsByEventId.mockResolvedValue(result);
    const req = mockReq();
    const res = mockRes();

    await getEventReviews(req, res);

    expect(mockReviewService.getReviewsByEventId).toHaveBeenCalledWith(eventId, 1, 10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('parses page and limit from query', async () => {
    mockReviewService.getReviewsByEventId.mockResolvedValue({ items: [] });
    const req = mockReq({ query: { page: '2', limit: '5' } });
    const res = mockRes();

    await getEventReviews(req, res);

    expect(mockReviewService.getReviewsByEventId).toHaveBeenCalledWith(eventId, 2, 5);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('falls back to defaults when query params are NaN', async () => {
    mockReviewService.getReviewsByEventId.mockResolvedValue({ items: [] });
    const req = mockReq({ query: { page: 'abc', limit: 'xyz' } });
    const res = mockRes();

    await getEventReviews(req, res);

    expect(mockReviewService.getReviewsByEventId).toHaveBeenCalledWith(eventId, 1, 10);
  });

  it('returns 500 on service error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReviewService.getReviewsByEventId.mockRejectedValue(new Error('DB down'));
    const req = mockReq();
    const res = mockRes();

    await getEventReviews(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    spy.mockRestore();
  });
});

describe('createReview', () => {
  it('creates review and returns 201', async () => {
    const newReview = { id: 'rev_1', rating: 5, comment: 'Great!' };
    mockReviewService.canReviewEvent.mockResolvedValue(true);
    mockReviewService.createReview.mockResolvedValue(newReview);
    const req = mockReq({ body: { rating: 5, comment: 'Great!' } });
    const res = mockRes();

    await createReview(req, res);

    expect(mockReviewService.canReviewEvent).toHaveBeenCalledWith(uid, eventId);
    expect(mockReviewService.createReview).toHaveBeenCalledWith(uid, eventId, 5, 'Great!');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newReview);
  });

  it('returns 400 when rating missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();

    await createReview(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Invalid rating (1-5).' });
    expect(mockReviewService.canReviewEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when rating is 0', async () => {
    const req = mockReq({ body: { rating: 0 } });
    const res = mockRes();

    await createReview(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Invalid rating (1-5).' });
  });

  it('returns 400 when rating is 6', async () => {
    const req = mockReq({ body: { rating: 6 } });
    const res = mockRes();

    await createReview(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Invalid rating (1-5).' });
  });

  it('returns 403 when user cannot review', async () => {
    mockReviewService.canReviewEvent.mockResolvedValue(false);
    const req = mockReq({ body: { rating: 4, comment: 'ok' } });
    const res = mockRes();

    await createReview(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({ error: 'Forbidden: You must attend the event to review.' });
    expect(mockReviewService.createReview).not.toHaveBeenCalled();
  });

  it('returns 500 on service error from canReviewEvent', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReviewService.canReviewEvent.mockRejectedValue(new Error('DB down'));
    const req = mockReq({ body: { rating: 5, comment: 'Great' } });
    const res = mockRes();

    await createReview(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    spy.mockRestore();
  });

  it('returns 500 on service error from createReview', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReviewService.canReviewEvent.mockResolvedValue(true);
    mockReviewService.createReview.mockRejectedValue(new Error('Creation failed'));
    const req = mockReq({ body: { rating: 5, comment: 'Great' } });
    const res = mockRes();

    await createReview(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    spy.mockRestore();
  });
});