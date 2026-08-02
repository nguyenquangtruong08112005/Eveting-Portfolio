'use strict';

const mockReviewRepo = {
  getReviewsByEventId: jest.fn(),
  createReview: jest.fn(),
  checkUserTicketForEvent: jest.fn(),
};

jest.mock('@/providers/database/review.repository', () => mockReviewRepo);

let mockUuid = 'rev-0000';
jest.mock('uuid', () => ({
  v4: jest.fn(() => mockUuid),
}));

const service = require('@/modules/reviews/application/service');

beforeEach(() => {
  jest.clearAllMocks();
  mockUuid = 'rev-0000';
});

describe('getReviewsByEventId', () => {
  it('delegates to repository with event ID, page, and limit', async () => {
    const expected = { reviews: [], pagination: { currentPage: 1, limit: 10, totalPages: 0, totalItems: 0 } };
    mockReviewRepo.getReviewsByEventId.mockResolvedValue(expected);

    const result = await service.getReviewsByEventId('evt_1', 1, 10);

    expect(result).toEqual(expected);
    expect(mockReviewRepo.getReviewsByEventId).toHaveBeenCalledWith('evt_1', 1, 10);
  });

  it('passes through pagination parameters', async () => {
    mockReviewRepo.getReviewsByEventId.mockResolvedValue({ reviews: [], pagination: {} });

    await service.getReviewsByEventId('evt_1', 3, 25);

    expect(mockReviewRepo.getReviewsByEventId).toHaveBeenCalledWith('evt_1', 3, 25);
  });

  it('returns reviews with user metadata', async () => {
    const reviews = [{
      id: 'rev_1',
      eventId: 'evt_1',
      userId: 'user_1',
      rating: 5,
      comment: 'Great event!',
      createdAt: 1700000000000,
      user: { name: 'Alice', profilePicUrl: 'https://example.com/pic.jpg' },
    }];
    mockReviewRepo.getReviewsByEventId.mockResolvedValue({
      reviews,
      pagination: { currentPage: 1, limit: 10, totalPages: 1, totalItems: 1 },
    });

    const result = await service.getReviewsByEventId('evt_1', 1, 10);

    expect(result.reviews[0]).toMatchObject({ rating: 5, comment: 'Great event!' });
    expect(result.reviews[0].user.name).toBe('Alice');
  });

  it('propagates repository failure', async () => {
    mockReviewRepo.getReviewsByEventId.mockRejectedValue(new Error('DB error'));

    await expect(
      service.getReviewsByEventId('evt_1', 1, 10)
    ).rejects.toThrow('DB error');
  });
});

describe('canReviewEvent', () => {
  it('returns true when user has a valid ticket', async () => {
    mockReviewRepo.checkUserTicketForEvent.mockResolvedValue(true);

    const result = await service.canReviewEvent('user_1', 'evt_1');

    expect(result).toBe(true);
    expect(mockReviewRepo.checkUserTicketForEvent).toHaveBeenCalledWith('user_1', 'evt_1');
  });

  it('returns false when user has no ticket', async () => {
    mockReviewRepo.checkUserTicketForEvent.mockResolvedValue(false);

    const result = await service.canReviewEvent('user_1', 'evt_1');

    expect(result).toBe(false);
  });

  it('propagates repository failure', async () => {
    mockReviewRepo.checkUserTicketForEvent.mockRejectedValue(new Error('DB connection lost'));

    await expect(
      service.canReviewEvent('user_1', 'evt_1')
    ).rejects.toThrow('DB connection lost');
  });
});

describe('createReview', () => {
  it('creates a review with generated ID and current timestamp', async () => {
    const newReview = {
      id: 'rev_1',
      userId: 'user_1',
      eventId: 'evt_1',
      rating: 5,
      comment: 'Amazing!',
      createdAt: expect.any(Number),
    };
    mockReviewRepo.createReview.mockImplementation((_id, data) => Promise.resolve(data));

    const result = await service.createReview('user_1', 'evt_1', 5, 'Amazing!');

    expect(result.id).toBe('rev_rev-0000');
    expect(result.userId).toBe('user_1');
    expect(result.eventId).toBe('evt_1');
    expect(result.rating).toBe(5);
    expect(result.comment).toBe('Amazing!');
    expect(result.createdAt).toBeGreaterThan(0);
  });

  it('converts rating to number', async () => {
    mockReviewRepo.createReview.mockImplementation((_id, data) => Promise.resolve(data));

    const result = await service.createReview('user_1', 'evt_1', '3', 'Okay');

    expect(result.rating).toBe(3);
    expect(typeof result.rating).toBe('number');
  });

  it('passes generated ID and review data to repository', async () => {
    mockReviewRepo.createReview.mockImplementation((_id, data) => Promise.resolve(data));

    await service.createReview('user_1', 'evt_1', 4, 'Good');

    expect(mockReviewRepo.createReview).toHaveBeenCalledTimes(1);
    const [reviewId, reviewData] = mockReviewRepo.createReview.mock.calls[0];
    expect(reviewId).toBe('rev_rev-0000');
    expect(reviewData).toMatchObject({
      id: 'rev_rev-0000',
      userId: 'user_1',
      eventId: 'evt_1',
      rating: 4,
      comment: 'Good',
    });
  });

  it('generates unique IDs for each review', async () => {
    const { v4 } = require('uuid');
    v4.mockReturnValueOnce('id-1').mockReturnValueOnce('id-2');

    mockReviewRepo.createReview.mockImplementation((_id, data) => Promise.resolve(data));

    await service.createReview('user_1', 'evt_1', 1, 'First');
    await service.createReview('user_2', 'evt_1', 2, 'Second');

    expect(mockReviewRepo.createReview).toHaveBeenCalledTimes(2);
    expect(mockReviewRepo.createReview.mock.calls[0][0]).toBe('rev_id-1');
    expect(mockReviewRepo.createReview.mock.calls[1][0]).toBe('rev_id-2');
  });

  it('includes createdAt as a numeric timestamp', async () => {
    jest.useFakeTimers({ now: 1700000000000 });
    mockReviewRepo.createReview.mockImplementation((_id, data) => Promise.resolve(data));

    const result = await service.createReview('user_1', 'evt_1', 5, 'Great');

    expect(result.createdAt).toBe(1700000000000);
    jest.useRealTimers();
  });

  it('propagates repository failure on create', async () => {
    mockReviewRepo.createReview.mockRejectedValue(new Error('Insert failed'));

    await expect(
      service.createReview('user_1', 'evt_1', 5, 'Great')
    ).rejects.toThrow('Insert failed');
  });

  it('returns data returned by repository', async () => {
    const persistedReview = {
      id: 'rev_rev-0000',
      userId: 'user_1',
      eventId: 'evt_1',
      rating: 3,
      comment: 'Meh',
      createdAt: 1700000000000,
    };
    mockReviewRepo.createReview.mockResolvedValue(persistedReview);

    const result = await service.createReview('user_1', 'evt_1', 3, 'Meh');

    expect(result).toEqual(persistedReview);
  });

  it('handles comment passed as undefined', async () => {
    mockReviewRepo.createReview.mockImplementation((_id, data) => Promise.resolve(data));

    const result = await service.createReview('user_1', 'evt_1', 4, undefined);

    expect(result.comment).toBeUndefined();
    expect(mockReviewRepo.createReview).toHaveBeenCalled();
  });
});
