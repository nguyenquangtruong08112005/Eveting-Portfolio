'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockEventService = {
  getAllEvents: jest.fn(),
  getEventById: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  cancelEvent: jest.fn(),
  submitDraft: jest.fn(),
  searchEvents: jest.fn(),
  findNearbyEvents: jest.fn(),
  getRecommendations: jest.fn(),
  getEventWeather: jest.fn(),
  getDestinations: jest.fn(),
  getVietnamLocations: jest.fn(),
  saveOrderAttendeeAnswers: jest.fn(),
};

jest.mock('@/modules/events/application/service', () => mockEventService);

const mockEventRepo = {
  getEventLifecycleOwnership: jest.fn(),
};

jest.mock('@/providers/database/event.repository', () => mockEventRepo);

const { LIFECYCLE, STATUS } = require('@/modules/events/domain/event-lifecycle');

const {
  getAllEvents, getEventById, createEvent, updateEvent,
  cancelEventController, submitDraftController,
  searchEvents, findNearbyEvents, getRecommendations,
  getEventWeather, getDestinations, getVietnamLocations,
  saveOrderAttendeeAnswers,
} = require('@/modules/events/api/controller');

const uid = 'user_001';
const eventId = 'evt_001';

function mockReq(overrides = {}) {
  return {
    user: { uid, roles: ['organizer'] },
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
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAllEvents', () => {
  it('returns paginated events with defaults', async () => {
    const result = { events: [], pagination: { currentPage: 1, limit: 10, totalItems: 0 } };
    mockEventService.getAllEvents.mockResolvedValue(result);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getAllEvents(req, res, next);
    expect(mockEventService.getAllEvents).toHaveBeenCalledWith(1, 10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(next).not.toHaveBeenCalled();
  });

  it('parses page and limit from query', async () => {
    mockEventService.getAllEvents.mockResolvedValue({ events: [] });
    const req = mockReq({ query: { page: '3', limit: '5' } });
    const res = mockRes();
    const next = jest.fn();
    await getAllEvents(req, res, next);
    expect(mockEventService.getAllEvents).toHaveBeenCalledWith(3, 5);
  });

  it('falls back to defaults on NaN', async () => {
    mockEventService.getAllEvents.mockResolvedValue({ events: [] });
    const req = mockReq({ query: { page: 'abc', limit: 'xyz' } });
    const res = mockRes();
    const next = jest.fn();
    await getAllEvents(req, res, next);
    expect(mockEventService.getAllEvents).toHaveBeenCalledWith(1, 10);
  });

  it('propagates service error', async () => {
    const err = new Error('db fail');
    mockEventService.getAllEvents.mockRejectedValue(err);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getAllEvents(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('getEventById', () => {
  it('returns event with 200', async () => {
    const event = { id: eventId, name: 'Test' };
    mockEventService.getEventById.mockResolvedValue(event);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getEventById(req, res, next);
    expect(mockEventService.getEventById).toHaveBeenCalledWith(eventId, req.user);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(event);
  });

  it('passes null user when req.user missing', async () => {
    mockEventService.getEventById.mockResolvedValue({ id: eventId });
    const req = mockReq({ params: { eventId }, user: undefined });
    const res = mockRes();
    const next = jest.fn();
    await getEventById(req, res, next);
    expect(mockEventService.getEventById).toHaveBeenCalledWith(eventId, null);
  });

  it('throws NotFoundError when event is null', async () => {
    mockEventService.getEventById.mockResolvedValue(null);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getEventById(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, message: 'Event not found or access denied.' }));
  });
});

describe('createEvent', () => {
  it('creates event and returns 201', async () => {
    const newEvent = { id: eventId, name: 'New' };
    mockEventService.createEvent.mockResolvedValue(newEvent);
    const req = mockReq({ body: { name: 'New' } });
    const res = mockRes();
    const next = jest.fn();
    await createEvent(req, res, next);
    expect(mockEventService.createEvent).toHaveBeenCalledWith(req.body, uid);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newEvent);
  });
});

describe('updateEvent', () => {
  it('updates event and returns 200', async () => {
    const current = { id: eventId, organizerId: uid };
    mockEventService.getEventById.mockResolvedValue(current);
    mockEventService.updateEvent.mockResolvedValue({ id: eventId, name: 'Updated' });
    const req = mockReq({ params: { eventId }, body: { name: 'Updated' } });
    const res = mockRes();
    const next = jest.fn();
    await updateEvent(req, res, next);
    expect(mockEventService.getEventById).toHaveBeenCalledWith(eventId, req.user);
    expect(mockEventService.updateEvent).toHaveBeenCalledWith(eventId, req.body, uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: eventId, name: 'Updated' });
  });

  it('throws NotFoundError when event not found', async () => {
    mockEventService.getEventById.mockResolvedValue(null);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await updateEvent(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('throws ForbiddenError when not owner', async () => {
    mockEventService.getEventById.mockResolvedValue({ id: eventId, organizerId: 'other_user' });
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await updateEvent(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

describe('cancelEventController', () => {
  const ownershipRow = { id: eventId, organizer_id: uid, lifecycle_status: LIFECYCLE.SUBMITTED, status: STATUS.PENDING };

  it('cancels event and returns 200', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue(ownershipRow);
    mockEventService.cancelEvent.mockResolvedValue({ id: eventId, status: STATUS.CANCELLED });
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelEventController(req, res, next);
    expect(mockEventRepo.getEventLifecycleOwnership).toHaveBeenCalledWith(eventId);
    expect(mockEventService.cancelEvent).toHaveBeenCalledWith(eventId);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws NotFoundError when no row', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue(null);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelEventController(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('throws ForbiddenError when not owner and not admin', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({ ...ownershipRow, organizer_id: 'other' });
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelEventController(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('allows admin to cancel', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({ ...ownershipRow, organizer_id: 'other' });
    mockEventService.cancelEvent.mockResolvedValue({ id: eventId });
    const req = mockReq({ params: { eventId }, user: { uid, roles: ['admin'] } });
    const res = mockRes();
    const next = jest.fn();
    await cancelEventController(req, res, next);
    expect(mockEventService.cancelEvent).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns already cancelled with 200', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      ...ownershipRow, lifecycle_status: LIFECYCLE.CANCELLED, status: STATUS.CANCELLED,
    });
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelEventController(req, res, next);
    expect(mockEventService.cancelEvent).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: eventId, status: STATUS.CANCELLED, lifecycleStatus: LIFECYCLE.CANCELLED, message: 'Event already cancelled.',
    });
  });
});

describe('submitDraftController', () => {
  it('submits draft and returns 200', async () => {
    mockEventService.submitDraft.mockResolvedValue({ id: eventId, lifecycleStatus: LIFECYCLE.SUBMITTED });
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await submitDraftController(req, res, next);
    expect(mockEventService.submitDraft).toHaveBeenCalledWith(eventId, uid);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('searchEvents', () => {
  it('passes query to service', async () => {
    mockEventService.searchEvents.mockResolvedValue({ events: [] });
    const req = mockReq({ query: { q: 'music', page: '1' } });
    const res = mockRes();
    const next = jest.fn();
    await searchEvents(req, res, next);
    expect(mockEventService.searchEvents).toHaveBeenCalledWith({ q: 'music', page: '1' });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('findNearbyEvents', () => {
  it('returns nearby events with parsed params', async () => {
    mockEventService.findNearbyEvents.mockResolvedValue({ events: [] });
    const req = mockReq({ query: { lat: '10.5', lon: '106.5', radius: '25', page: '2', limit: '5' } });
    const res = mockRes();
    const next = jest.fn();
    await findNearbyEvents(req, res, next);
    expect(mockEventService.findNearbyEvents).toHaveBeenCalledWith(10.5, 106.5, 25, 2, 5);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('uses default radius and pagination', async () => {
    mockEventService.findNearbyEvents.mockResolvedValue({ events: [] });
    const req = mockReq({ query: { lat: '10', lon: '106' } });
    const res = mockRes();
    const next = jest.fn();
    await findNearbyEvents(req, res, next);
    expect(mockEventService.findNearbyEvents).toHaveBeenCalledWith(10, 106, 50, 1, 10);
  });

  it('throws BadRequestError when lat/lon missing', async () => {
    const req = mockReq({ query: { lat: '10' } });
    const res = mockRes();
    const next = jest.fn();
    await findNearbyEvents(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('getRecommendations', () => {
  it('returns recommendations with user context', async () => {
    mockEventService.getRecommendations.mockResolvedValue([{ id: eventId }]);
    const req = mockReq({ query: { limit: '5' } });
    const res = mockRes();
    const next = jest.fn();
    await getRecommendations(req, res, next);
    expect(mockEventService.getRecommendations).toHaveBeenCalledWith(uid, 5);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('uses default limit of 10', async () => {
    mockEventService.getRecommendations.mockResolvedValue([]);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getRecommendations(req, res, next);
    expect(mockEventService.getRecommendations).toHaveBeenCalledWith(uid, 10);
  });
});

describe('getEventWeather', () => {
  it('returns weather data', async () => {
    mockEventService.getEventWeather.mockResolvedValue({ temp: 30, condition: 'Sunny' });
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getEventWeather(req, res, next);
    expect(mockEventService.getEventWeather).toHaveBeenCalledWith(eventId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ temp: 30, condition: 'Sunny' });
  });

  it('returns fallback message when weather is null', async () => {
    mockEventService.getEventWeather.mockResolvedValue(null);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getEventWeather(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Weather forecast not applicable for this event.' });
  });
});

describe('getDestinations', () => {
  it('returns destinations with default limit', async () => {
    mockEventService.getDestinations.mockResolvedValue([{ city: 'Hanoi' }]);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getDestinations(req, res, next);
    expect(mockEventService.getDestinations).toHaveBeenCalledWith(10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ destinations: [{ city: 'Hanoi' }] });
  });

  it('parses limit from query', async () => {
    mockEventService.getDestinations.mockResolvedValue([]);
    const req = mockReq({ query: { limit: '3' } });
    const res = mockRes();
    const next = jest.fn();
    await getDestinations(req, res, next);
    expect(mockEventService.getDestinations).toHaveBeenCalledWith(3);
  });
});

describe('getVietnamLocations', () => {
  it('passes query params to service', async () => {
    mockEventService.getVietnamLocations.mockResolvedValue([{ code: '01', name: 'HN' }]);
    const req = mockReq({ query: { level: 'province', parentCode: '01', q: 'Ha', limit: '10' } });
    const res = mockRes();
    const next = jest.fn();
    await getVietnamLocations(req, res, next);
    expect(mockEventService.getVietnamLocations).toHaveBeenCalledWith({ level: 'province', parentCode: '01', q: 'Ha', limit: '10' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ locations: [{ code: '01', name: 'HN' }] });
  });
});

describe('saveOrderAttendeeAnswers', () => {
  it('saves answers and returns 200', async () => {
    const result = { eventId, orderId: 'ord_001', attendees: [{ name: 'John' }] };
    mockEventService.saveOrderAttendeeAnswers.mockResolvedValue(result);
    const req = mockReq({ params: { eventId, orderId: 'ord_001' }, body: { attendees: [{ name: 'John' }] } });
    const res = mockRes();
    const next = jest.fn();
    await saveOrderAttendeeAnswers(req, res, next);
    expect(mockEventService.saveOrderAttendeeAnswers).toHaveBeenCalledWith(eventId, 'ord_001', uid, [{ name: 'John' }]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});
