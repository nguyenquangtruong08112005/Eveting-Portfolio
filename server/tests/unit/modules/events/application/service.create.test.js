/* eslint-env jest */
const { STATUS, VISIBILITY, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');

const mockTransaction = { query: jest.fn() };

const mockEsClient = null;
const mockCache = {
  invalidateCategories: jest.fn(),
  invalidateAllVenues: jest.fn(),
  getEvent: jest.fn(),
  setEvent: jest.fn(),
};
const mockEventRepo = {
  createEvent: jest.fn(),
  replaceCustomQuestionsInTransaction: jest.fn(),
  getEventInTransaction: jest.fn(),
  getPublicEventsPage: jest.fn(),
  getEventRawById: jest.fn(),
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

const BASE_VENUE_RESULT = {
  geohash: 'w3gx',
  location: { latitude: 10.8, longitude: 106.7 },
  venueName: 'Test Venue',
  city: 'Ho Chi Minh City',
  onlineUrl: null,
  venueId: 'venue_1',
};

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
  mockVenueHandler.resolveVenueAndLocationForCreate.mockResolvedValue(BASE_VENUE_RESULT);
  mockCalcMinPrice.calculateMinPrice.mockReturnValue(150000);
  mockEventBuilder.sanitizeRichDescription.mockImplementation((v) => v || '');
  mockEventBuilder.extractAddressFields.mockReturnValue(null);
  mockEventBuilder.normalizeCustomQuestions.mockReturnValue([]);
  mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([]);
  mockEventRepo.getEventInTransaction.mockResolvedValue({
    id: 'evt_test',
    name: 'Test Event',
    date: 1700000000000,
    featuredProfileIds: [],
    ticketTypes: {},
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('createEvent', () => {
  const organizerId = 'org_1';

  describe('validation', () => {
    it('rejects missing date', async () => {
      await expect(service.createEvent({ name: 'Test' }, organizerId)).rejects.toThrow(
        'Invalid or missing event date (must be a timestamp).'
      );
    });

    it('rejects non-numeric date', async () => {
      await expect(
        service.createEvent({ name: 'Test', date: 'tomorrow' }, organizerId)
      ).rejects.toThrow('Invalid or missing event date (must be a timestamp).');
    });

    it('rejects ticketTypes as array', async () => {
      await expect(
        service.createEvent({ name: 'Test', date: 1700000000000, ticketTypes: [] }, organizerId)
      ).rejects.toThrow('ticketTypes must be a Map (Object), not a List (Array).');
    });
  });

  describe('successful submitted event', () => {
    const eventData = {
      name: 'Test Event',
      description: 'A great event',
      date: 1700000000000,
      endDate: 1700086400000,
      category: ['music'],
      tags: ['jazz'],
      imageUrl: 'img.jpg',
      bannerUrl: 'banner.jpg',
      videoUrl: 'vid.mp4',
      isOutdoor: false,
      ticketTypes: { vip: { price: 200000 }, regular: { price: 100000 } },
      customQuestions: [{ questionText: 'Diet?', questionType: 'text' }],
      location: { address: '123 Main St' },
      venueName: 'Test Venue',
      city: 'Ho Chi Minh City',
      requiredAge: 18,
      sponsors: [{ name: 'SponsorA' }],
      recurringRule: null,
      isPrivate: false,
      messageForAttendee: 'Bring ID',
    };

    beforeEach(() => {
      mockEventBuilder.normalizeCustomQuestions.mockReturnValue([
        { id: 'eq_1', questionText: 'Diet?', questionType: 'text', isRequired: false, options: [], order: 0 },
      ]);
      mockEventBuilder.extractAddressFields.mockReturnValue({
        provinceCode: 'SG',
        provinceName: 'Ho Chi Minh',
        districtCode: 'D1',
        districtName: 'District 1',
        wardCode: 'WD1',
        wardName: 'Ward 1',
        streetAddress: '123 Main St',
      });
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: 'evt_test',
        name: 'Test Event',
        date: 1700000000000,
        featuredProfileIds: [],
        ticketTypes: { vip: { price: 200000 }, regular: { price: 100000 } },
        status: 'pending',
      });
    });

    it('persists expected default and lifecycle fields', async () => {
      const result = await service.createEvent(eventData, organizerId);

      expect(mockEventRepo.createEvent).toHaveBeenCalledTimes(1);
      const [_eventId, eventToPersist, txn] = mockEventRepo.createEvent.mock.calls[0];
      expect(txn).toBe(mockTransaction);
      expect(eventToPersist.id).toBeDefined();
      expect(eventToPersist.status).toBe(STATUS.PENDING);
      expect(eventToPersist.visibility).toBe(VISIBILITY.PRIVATE);
      expect(eventToPersist.organizerId).toBe(organizerId);
      expect(eventToPersist.createdAt).toBe(1700000000000);
      expect(eventToPersist.lastUpdatedAt).toBe(1700000000000);
      expect(eventToPersist.hotScore).toBe(0);
      expect(eventToPersist.viewCount).toBe(0);
      expect(eventToPersist.minPrice).toBe(150000);
      expect(eventToPersist.description).toBe('A great event');
      expect(eventToPersist.isPrivate).toBe(false);
      expect(eventToPersist.lifecycleStatus).toBe(LIFECYCLE.SUBMITTED);
    });

    it('normalizes custom questions and calls replaceCustomQuestionsInTransaction', async () => {
      await service.createEvent(eventData, organizerId);

      expect(mockEventBuilder.normalizeCustomQuestions).toHaveBeenCalledWith(eventData.customQuestions);
      expect(mockEventRepo.replaceCustomQuestionsInTransaction).toHaveBeenCalledWith(
        mockTransaction,
        expect.any(String),
        [{ id: 'eq_1', questionText: 'Diet?', questionType: 'text', isRequired: false, options: [], order: 0 }]
      );
    });

    it('resolves venue and location', async () => {
      await service.createEvent(eventData, organizerId);

      expect(mockVenueHandler.resolveVenueAndLocationForCreate).toHaveBeenCalledWith(eventData);
      expect(mockEventRepo.createEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          geohash: 'w3gx',
          location: { latitude: 10.8, longitude: 106.7 },
          venueName: 'Test Venue',
          city: 'Ho Chi Minh City',
          venueId: 'venue_1',
        }),
        mockTransaction
      );
    });

    it('calculates min price', async () => {
      await service.createEvent(eventData, organizerId);

      expect(mockCalcMinPrice.calculateMinPrice).toHaveBeenCalledWith(eventData.ticketTypes);
    });

    it('publishes search_index event and outbox triggers processing', async () => {
      await service.createEvent(eventData, organizerId);

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'search_index',
        { action: 'index', eventId: expect.stringMatching(/^evt_/) },
        mockTransaction
      );
      expect(mockOutbox.triggerProcess).toHaveBeenCalledTimes(1);
    });

    it('publishes per-featured-profile notification when profiles exist', async () => {
      const existingProfileIds = ['fp_existing1', 'fp_existing2'];
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([
        { id: 'fp_existing1', name: 'Artist 1' },
        { id: 'fp_existing2', name: 'Artist 2' },
      ]);

      await service.createEvent(
        { ...eventData, featuredProfileIds: ['fp_existing1', 'fp_existing2'] },
        organizerId
      );

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'notification',
        {
          channel: 'push',
          topic: 'artist_fp_existing1',
          title: 'Idol có show mới!',
          body: 'Test Event',
          data: { eventId: expect.stringMatching(/^evt_/), type: 'new_event' },
        },
        mockTransaction
      );
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'notification',
        {
          channel: 'push',
          topic: 'artist_fp_existing2',
          title: 'Idol có show mới!',
          body: 'Test Event',
          data: { eventId: expect.stringMatching(/^evt_/), type: 'new_event' },
        },
        mockTransaction
      );
    });

    it('invalidates category and venue cache', async () => {
      await service.createEvent(eventData, organizerId);

      expect(mockCache.invalidateCategories).toHaveBeenCalledTimes(1);
      expect(mockCache.invalidateAllVenues).toHaveBeenCalledTimes(1);
    });

    it('returns lifecycleStatus submitted', async () => {
      const result = await service.createEvent(eventData, organizerId);

      expect(result.lifecycleStatus).toBe(LIFECYCLE.SUBMITTED);
      expect(result.status).toBe(LIFECYCLE.SUBMITTED);
    });

    it('spreads address fields into event data when provided', async () => {
      mockEventBuilder.extractAddressFields.mockReturnValue({
        provinceCode: 'SG',
        provinceName: 'Ho Chi Minh',
        districtCode: 'D1',
        districtName: 'District 1',
        wardCode: 'WD1',
        wardName: 'Ward 1',
        streetAddress: '123 Main St',
      });

      await service.createEvent(eventData, organizerId);

      expect(mockEventRepo.createEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          provinceCode: 'SG',
          provinceName: 'Ho Chi Minh',
          districtCode: 'D1',
          districtName: 'District 1',
          wardCode: 'WD1',
          wardName: 'Ward 1',
          streetAddress: '123 Main St',
        }),
        mockTransaction
      );
    });
  });

  describe('saveAsDraft', () => {
    const draftData = {
      name: 'Draft Event',
      date: 1700000000000,
      saveAsDraft: true,
    };

    beforeEach(() => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: 'evt_draft',
        name: 'Draft Event',
        date: 1700000000000,
        featuredProfileIds: ['fp_existing1'],
      });
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([
        { id: 'fp_existing1', name: 'Artist 1' },
      ]);
    });

    it('skips artist notification events when saveAsDraft', async () => {
      await service.createEvent(
        { ...draftData, featuredProfileIds: ['fp_existing1'] },
        organizerId
      );

      const notificationCalls = mockPublisher.publish.mock.calls.filter(
        ([type]) => type === 'notification'
      );
      expect(notificationCalls).toHaveLength(0);
    });

    it('still publishes search_index event for draft', async () => {
      await service.createEvent(draftData, organizerId);

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'search_index',
        { action: 'index', eventId: expect.stringMatching(/^evt_/) },
        mockTransaction
      );
    });

    it('returns draft lifecycle', async () => {
      const result = await service.createEvent(draftData, organizerId);

      expect(result.lifecycleStatus).toBe(LIFECYCLE.DRAFT);
      expect(result.status).toBe(LIFECYCLE.DRAFT);
    });

    it('persists lifecycleStatus draft', async () => {
      await service.createEvent(draftData, organizerId);

      expect(mockEventRepo.createEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ lifecycleStatus: LIFECYCLE.DRAFT }),
        mockTransaction
      );
    });
  });

  describe('featured profiles', () => {
    it('de-duplicates existing profile IDs', async () => {
      const ids = ['fp_a', 'fp_b', 'fp_a'];
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([
        { id: 'fp_a', name: 'Artist A' },
        { id: 'fp_b', name: 'Artist B' },
      ]);

      await service.createEvent(
        { name: 'Test', date: 1700000000000, featuredProfileIds: ids },
        organizerId
      );

      expect(mockFeaturedRepo.getFeaturedProfilesByIds).toHaveBeenCalledWith(['fp_a', 'fp_b']);
    });

    it('throws BadRequestError for missing profile IDs', async () => {
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([
        { id: 'fp_a', name: 'Artist A' },
      ]);

      await expect(
        service.createEvent(
          { name: 'Test', date: 1700000000000, featuredProfileIds: ['fp_a', 'fp_missing'] },
          organizerId
        )
      ).rejects.toThrow('Featured profile not found: fp_missing');
    });

    it('creates new featured profiles inside transaction and adds their IDs', async () => {
      const profileToCreate = { name: 'New Artist', profileType: 'artist' };
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([
        { id: 'fp_existing', name: 'Existing Artist' },
      ]);
      mockFeaturedService.createFeaturedProfile.mockResolvedValue({
        id: 'fp_new',
        name: 'New Artist',
      });
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: 'evt_test',
        name: 'Test',
        date: 1700000000000,
        featuredProfileIds: ['fp_existing', 'fp_new'],
        ticketTypes: {},
      });

      await service.createEvent(
        {
          name: 'Test',
          date: 1700000000000,
          featuredProfileIds: ['fp_existing'],
          featuredProfilesToCreate: [profileToCreate],
        },
        organizerId
      );

      expect(mockFeaturedService.createFeaturedProfile).toHaveBeenCalledWith(
        profileToCreate,
        { creatorId: organizerId, transaction: mockTransaction }
      );
      expect(mockEventRepo.createEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          featuredProfileIds: ['fp_existing', 'fp_new'],
        }),
        mockTransaction
      );
    });
  });

  describe('transaction scoping', () => {
    it('all repository calls inside transaction receive the transaction object', async () => {
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([]);

      await service.createEvent({ name: 'Test', date: 1700000000000 }, organizerId);

      expect(mockEventRepo.createEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        mockTransaction
      );
      expect(mockEventRepo.replaceCustomQuestionsInTransaction).toHaveBeenCalledWith(
        mockTransaction,
        expect.any(String),
        expect.any(Array)
      );
      expect(mockEventRepo.getEventInTransaction).toHaveBeenCalledWith(
        mockTransaction,
        expect.any(String)
      );
    });

    it('eventPublisher.publish calls inside transaction receive transaction', async () => {
      await service.createEvent({ name: 'Test', date: 1700000000000 }, organizerId);

      const searchIndexCalls = mockPublisher.publish.mock.calls.filter(
        ([type]) => type === 'search_index'
      );
      searchIndexCalls.forEach(([, , txn]) => {
        expect(txn).toBe(mockTransaction);
      });
    });
  });

  describe('return value shape', () => {
    it('uses getFeaturedProfilesByIds with event featuredProfileIds for the return', async () => {
      const mockProfiles = [{ id: 'fp_1', name: 'Artist 1' }];
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue(mockProfiles);
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: 'evt_test',
        name: 'Test',
        date: 1700000000000,
        featuredProfileIds: ['fp_1'],
        ticketTypes: {},
      });

      const result = await service.createEvent(
        { name: 'Test', date: 1700000000000, featuredProfileIds: ['fp_1'] },
        organizerId
      );

      expect(mockFeaturedRepo.getFeaturedProfilesByIds).toHaveBeenCalledWith(['fp_1']);
      expect(result.featuredProfiles).toEqual(mockProfiles);
    });
  });
});
