/* eslint-env jest */
const { STATUS, VISIBILITY, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');

const mockTransaction = { query: jest.fn() };

const mockEsClient = null;
const mockCache = {
  invalidateCategories: jest.fn(),
  invalidateAllVenues: jest.fn(),
  invalidateEvent: jest.fn(),
  getEvent: jest.fn(),
  setEvent: jest.fn(),
};
const mockEventRepo = {
  createEvent: jest.fn(),
  replaceCustomQuestionsInTransaction: jest.fn(),
  getEventInTransaction: jest.fn(),
  getEventById: jest.fn(),
  getPublicEventsPage: jest.fn(),
  getEventRawById: jest.fn(),
  updateEvent: jest.fn(),
  getEventLifecycleOwnership: jest.fn(),
  searchPublicEvents: jest.fn(),
  getRecommendedEventsRelational: jest.fn(),
};
const mockVenueRepo = { getVenueRawById: jest.fn() };
const mockUserRepo = { getRawUserDataById: jest.fn() };
const mockFeaturedRepo = { getFeaturedProfilesByIds: jest.fn(), getFeaturedProfilesDataByIds: jest.fn() };
const mockTicketRepo = {};
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
const mockPublisher = { publish: jest.fn() };
const mockOutbox = { triggerProcess: jest.fn() };
const mockPostgresClient = { transaction: jest.fn() };
const mockCalcMinPrice = { calculateMinPrice: jest.fn() };
const mockNotifications = { fcmService: { sendMulticast: jest.fn() } };
const mockFeaturedService = { createFeaturedProfile: jest.fn() };
const mockVenueHandler = {
  resolveVenueAndLocationForCreate: jest.fn(),
  resolveVenueAndLocationForUpdate: jest.fn(),
};
const mockMappers = { mapPublicTicketTypes: jest.fn(), mapPublicVenue: jest.fn(), buildElasticData: jest.fn() };
const mockSearchQueryBuilder = { buildSearchQuery: jest.fn(), normalizeSearchParams: jest.fn() };
const mockRecQueryBuilder = { buildRecommendationQuery: jest.fn() };
const mockNearbyEvents = { findNearbyEvents: jest.fn() };
const mockWeather = { getEventWeather: jest.fn() };
const mockNotifSender = { notifyAttendeesAboutUpdate: jest.fn(), notifyAttendeesAboutCancellation: jest.fn() };
const mockUpdatePolicy = { hasImportantChanges: jest.fn() };
const mockEventBuilder = {
  normalizeCustomQuestions: jest.fn(),
  customQuestionsEqual: jest.fn(),
  extractAddressFields: jest.fn(),
  normalizeAnswers: jest.fn(),
  sanitizeRichDescription: jest.fn(),
};

jest.mock('@/shared/cache/namespace-helpers', () => mockCache);
jest.mock('@/providers/database/event.repository', () => mockEventRepo);
jest.mock('@/providers/database/venue.repository', () => mockVenueRepo);
jest.mock('@/providers/database/user.repository', () => mockUserRepo);
jest.mock('@/providers/database/featuredProfile.repository', () => mockFeaturedRepo);
jest.mock('@/providers/database/ticket.repository', () => mockTicketRepo);
jest.mock('@/shared/logger', () => mockLogger);
jest.mock('@/shared/events/event-publisher', () => mockPublisher);
jest.mock('@/shared/events/outbox-processor', () => mockOutbox);
jest.mock('@/providers/database/postgres.client', () => mockPostgresClient);
jest.mock('@/utils/tickets/calculateMinPrice.tickets', () => mockCalcMinPrice);
jest.mock('@/modules/notifications', () => mockNotifications);
jest.mock('@/modules/featuredProfile/application/service', () => mockFeaturedService);
jest.mock('@/modules/events/application/helpers/venue-handler', () => mockVenueHandler);
jest.mock('@/modules/events/application/helpers/event-mappers', () => mockMappers);
jest.mock('@/modules/events/application/query-builders/search-query.builder', () => mockSearchQueryBuilder);
jest.mock('@/modules/events/application/query-builders/recommendation-query.builder', () => mockRecQueryBuilder);
jest.mock('@/modules/events/application/helpers/nearby-events.helper', () => mockNearbyEvents);
jest.mock('@/modules/events/application/helpers/weather.helper', () => mockWeather);
jest.mock('@/modules/events/application/helpers/notification-sender', () => mockNotifSender);
jest.mock('@/modules/events/application/policies/update-policy', () => mockUpdatePolicy);
jest.mock('@/modules/events/application/helpers/event-builder', () => mockEventBuilder);

function reloadService() {
  jest.resetModules();
  jest.doMock('@/shared/config/elasticsearch.config', () => mockEsClient);
  return require('@/modules/events/application/service');
}

let service;
beforeAll(() => { service = reloadService(); });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: 1700000000000 });

  mockPostgresClient.transaction.mockImplementation(async (cb) => cb(mockTransaction));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('cancelEvent', () => {
  const eventId = 'evt_cancel_test';
  const fullEvent = {
    id: eventId,
    name: 'Cancelled Concert',
    status: STATUS.CANCELLED,
    lifecycleStatus: LIFECYCLE.CANCELLED,
    cancelledAt: 1700000000000,
    lastUpdatedAt: 1700000000000,
  };

  it('uses existing event name for the cancellation notification', async () => {
    mockEventRepo.getEventRawById.mockResolvedValue({
      exists: true,
      id: eventId,
      data: { name: 'Cancelled Concert' },
    });
    mockEventRepo.getEventInTransaction.mockResolvedValue(fullEvent);

    await service.cancelEvent(eventId);

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'notification',
      {
        channel: 'event_cancellation',
        eventId,
        eventName: 'Cancelled Concert',
      },
      mockTransaction
    );
  });

  it('falls back to Vietnamese name when event is missing', async () => {
    mockEventRepo.getEventRawById.mockResolvedValue({
      exists: false,
      id: null,
      data: null,
    });
    mockEventRepo.getEventInTransaction.mockResolvedValue(fullEvent);

    await service.cancelEvent(eventId);

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'notification',
      {
        channel: 'event_cancellation',
        eventId,
        eventName: 'Sự kiện',
      },
      mockTransaction
    );
  });

  it('passes correct update payload with status, lifecycle, cancelledAt, lastUpdatedAt', async () => {
    mockEventRepo.getEventRawById.mockResolvedValue({
      exists: true,
      id: eventId,
      data: { name: 'Test' },
    });
    mockEventRepo.getEventInTransaction.mockResolvedValue(fullEvent);

    await service.cancelEvent(eventId);

    expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
      eventId,
      {
        status: STATUS.CANCELLED,
        lifecycleStatus: LIFECYCLE.CANCELLED,
        cancelledAt: 1700000000000,
        lastUpdatedAt: 1700000000000,
      },
      mockTransaction
    );
  });

  it('publishes search_index delete event', async () => {
    mockEventRepo.getEventRawById.mockResolvedValue({
      exists: true,
      id: eventId,
      data: { name: 'Test' },
    });
    mockEventRepo.getEventInTransaction.mockResolvedValue(fullEvent);

    await service.cancelEvent(eventId);

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'search_index',
      { action: 'delete', eventId },
      mockTransaction
    );
  });

  it('triggers outbox processing after transaction', async () => {
    mockEventRepo.getEventRawById.mockResolvedValue({
      exists: true,
      id: eventId,
      data: { name: 'Test' },
    });
    mockEventRepo.getEventInTransaction.mockResolvedValue(fullEvent);

    await service.cancelEvent(eventId);

    expect(mockOutbox.triggerProcess).toHaveBeenCalledTimes(1);
  });

  it('invalidates event and categories cache after transaction', async () => {
    mockEventRepo.getEventRawById.mockResolvedValue({
      exists: true,
      id: eventId,
      data: { name: 'Test' },
    });
    mockEventRepo.getEventInTransaction.mockResolvedValue(fullEvent);

    await service.cancelEvent(eventId);

    expect(mockCache.invalidateEvent).toHaveBeenCalledWith(eventId);
    expect(mockCache.invalidateCategories).toHaveBeenCalledTimes(1);
  });

  it('returns the full event data fetched inside the transaction', async () => {
    mockEventRepo.getEventRawById.mockResolvedValue({
      exists: true,
      id: eventId,
      data: { name: 'Test' },
    });
    mockEventRepo.getEventInTransaction.mockResolvedValue(fullEvent);

    const result = await service.cancelEvent(eventId);

    expect(result).toEqual(fullEvent);
  });

  it('passes transaction object to all repository calls inside dbTransaction', async () => {
    mockEventRepo.getEventRawById.mockResolvedValue({
      exists: true,
      id: eventId,
      data: { name: 'Test' },
    });
    mockEventRepo.getEventInTransaction.mockResolvedValue(fullEvent);

    await service.cancelEvent(eventId);

    expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
      eventId,
      expect.any(Object),
      mockTransaction
    );
    expect(mockEventRepo.getEventInTransaction).toHaveBeenCalledWith(mockTransaction, eventId);
  });
});

describe('submitDraft', () => {
  const eventId = 'evt_draft_submit';
  const organizerId = 'org_owner';
  const fullEvent = {
    id: eventId,
    name: 'Draft Event',
    status: STATUS.PENDING,
    visibility: VISIBILITY.PRIVATE,
    lifecycleStatus: LIFECYCLE.SUBMITTED,
  };

  it('throws NotFoundError when event does not exist', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue(null);

    await expect(
      service.submitDraft(eventId, organizerId)
    ).rejects.toThrow('Event not found.');
  });

  it('throws ForbiddenError when requesting user is not the organizer', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      id: eventId,
      organizer_id: 'org_owner',
      lifecycle_status: LIFECYCLE.DRAFT,
      status: STATUS.PENDING,
      visibility: VISIBILITY.PRIVATE,
    });

    await expect(
      service.submitDraft(eventId, 'other_user')
    ).rejects.toThrow('You do not have permission to submit this draft.');
  });

  it('throws BadRequestError when lifecycle transition is not allowed', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      id: eventId,
      organizer_id: organizerId,
      lifecycle_status: LIFECYCLE.SUBMITTED,
      status: STATUS.PENDING,
      visibility: VISIBILITY.PRIVATE,
    });

    await expect(
      service.submitDraft(eventId, organizerId)
    ).rejects.toThrow(
      `Cannot submit draft: current lifecycle status "${LIFECYCLE.SUBMITTED}" cannot transition to "${LIFECYCLE.SUBMITTED}".`
    );
  });

  it('updates lifecycle to submitted, status to pending, visibility to private for valid draft transition', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      id: eventId,
      organizer_id: organizerId,
      lifecycle_status: LIFECYCLE.DRAFT,
      status: STATUS.PENDING,
      visibility: VISIBILITY.PRIVATE,
    });
    mockEventRepo.getEventById.mockResolvedValue(fullEvent);

    await service.submitDraft(eventId, organizerId);

    expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(eventId, {
      lifecycleStatus: LIFECYCLE.SUBMITTED,
      status: STATUS.PENDING,
      visibility: VISIBILITY.PRIVATE,
      lastUpdatedAt: 1700000000000,
    });
  });

  it('fetches and returns the full event after update', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      id: eventId,
      organizer_id: organizerId,
      lifecycle_status: LIFECYCLE.DRAFT,
      status: STATUS.PENDING,
      visibility: VISIBILITY.PRIVATE,
    });
    mockEventRepo.getEventById.mockResolvedValue(fullEvent);

    const result = await service.submitDraft(eventId, organizerId);

    expect(mockEventRepo.getEventById).toHaveBeenCalledWith(eventId);
    expect(result).toEqual(fullEvent);
  });

  it('does not use dbTransaction for updateEvent and getEventById', async () => {
    mockEventRepo.getEventLifecycleOwnership.mockResolvedValue({
      id: eventId,
      organizer_id: organizerId,
      lifecycle_status: LIFECYCLE.DRAFT,
      status: STATUS.PENDING,
      visibility: VISIBILITY.PRIVATE,
    });
    mockEventRepo.getEventById.mockResolvedValue(fullEvent);

    await service.submitDraft(eventId, organizerId);

    expect(mockEventRepo.updateEvent).not.toHaveBeenCalledWith(
      eventId,
      expect.any(Object),
      expect.anything()
    );
    expect(mockEventRepo.getEventById).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything()
    );
  });
});
