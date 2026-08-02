/* eslint-env jest */
const { STATUS, VISIBILITY, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');
const { BadRequestError, NotFoundError, ConflictError } = require('@/shared/errors');

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
  updateEvent: jest.fn(),
  replaceCustomQuestionsInTransaction: jest.fn(),
  getEventInTransaction: jest.fn(),
  getEventRawById: jest.fn(),
  hasTicketSalesStarted: jest.fn(),
  getPublicEventsPage: jest.fn(),
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

const EVENT_ID = 'evt_123';
const ORGANIZER_ID = 'org_1';

const BASE_OLD_DATA = {
  name: 'Original Event',
  description: 'Original description',
  date: 1700000000000,
  endDate: 1700086400000,
  category: ['music'],
  tags: ['jazz'],
  imageUrl: 'img.jpg',
  bannerUrl: 'banner.jpg',
  videoUrl: 'vid.mp4',
  isOutdoor: false,
  ticketTypes: { regular: { price: 100000 } },
  minPrice: 100000,
  featuredProfileIds: [],
  venueId: null,
  venueName: 'Original Venue',
  city: 'HCMC',
  location: { address: '123 Old St' },
  geohash: null,
  eventType: 'physical',
  onlineUrl: null,
  status: STATUS.PENDING,
  visibility: VISIBILITY.PRIVATE,
  isPrivate: true,
  organizerId: ORGANIZER_ID,
  createdAt: 1690000000000,
  lastUpdatedAt: 1690000000000,
  customQuestions: [],
  lifecycleStatus: LIFECYCLE.DRAFT,
  hotScore: 0,
  viewCount: 0,
  requiredAge: 0,
  sponsors: [],
  messageForAttendee: '',
  provinceCode: null,
  provinceName: null,
  districtCode: null,
  districtName: null,
  wardCode: null,
  wardName: null,
  streetAddress: null,
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
  mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: EVENT_ID, data: { ...BASE_OLD_DATA } });
  mockEventRepo.getEventInTransaction.mockResolvedValue({
    id: EVENT_ID,
    name: 'Updated Event',
    date: 1700000000000,
    featuredProfileIds: [],
    ticketTypes: {},
    minPrice: 200000,
    description: 'sanitized description',
    status: STATUS.PENDING,
    visibility: VISIBILITY.PRIVATE,
  });
  mockCalcMinPrice.calculateMinPrice.mockReturnValue(200000);
  mockEventBuilder.sanitizeRichDescription.mockImplementation((v) => v ? `sanitized ${v}` : '');
  mockEventBuilder.extractAddressFields.mockReturnValue(null);
  mockEventBuilder.normalizeCustomQuestions.mockImplementation((input) =>
    Array.isArray(input) ? input.map((q, i) => ({ ...q, id: q.id || `eq_${i}`, order: i })) : []
  );
  mockEventBuilder.customQuestionsEqual.mockReturnValue(true);
  mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([]);
  mockUpdatePolicy.hasImportantChanges.mockReturnValue(false);
  mockVenueHandler.resolveVenueAndLocationForUpdate.mockImplementation((_data, payload) => {
    if (_data.venueName !== undefined) payload.venueName = _data.venueName;
    if (_data.city !== undefined) payload.city = _data.city;
    if (_data.location !== undefined) payload.location = _data.location;
    if (_data.eventType === 'online') {
      payload.location = null; payload.geohash = null; payload.venueId = null;
      payload.venueName = 'Online'; payload.city = 'Online';
    }
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('updateEvent', () => {
  describe('validation', () => {
    it('rejects ticketTypes as array', async () => {
      await expect(
        service.updateEvent(EVENT_ID, { ticketTypes: [] }, ORGANIZER_ID)
      ).rejects.toThrow('ticketTypes must be a Map (Object), not a List (Array).');
    });

    it('rejects when event does not exist', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: false, id: null, data: null });

      await expect(
        service.updateEvent(EVENT_ID, { name: 'New' }, ORGANIZER_ID)
      ).rejects.toThrow('Event not found.');
    });
  });

  describe('immutable field stripping', () => {
    beforeEach(() => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'Updated', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });
    });

    it('removes id, organizerId, and createdAt from the persistence payload', async () => {
      await service.updateEvent(EVENT_ID, {
        id: 'should_be_removed',
        organizerId: 'should_be_removed',
        createdAt: 999,
        name: 'Updated',
      }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledTimes(1);
      const [, payload] = mockEventRepo.updateEvent.mock.calls[0];
      expect(payload.id).toBeUndefined();
      expect(payload.organizerId).toBeUndefined();
      expect(payload.createdAt).toBeUndefined();
      expect(payload.name).toBe('Updated');
    });
  });

  describe('description sanitization', () => {
    it('sanitizes description when provided', async () => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });

      await service.updateEvent(EVENT_ID, { description: '<script>alert(1)</script>' }, ORGANIZER_ID);

      expect(mockEventBuilder.sanitizeRichDescription).toHaveBeenCalledWith('<script>alert(1)</script>');
      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ description: 'sanitized <script>alert(1)</script>' }),
        mockTransaction
      );
    });

    it('does not call sanitize when description is undefined', async () => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });

      await service.updateEvent(EVENT_ID, { name: 'New Name' }, ORGANIZER_ID);

      expect(mockEventBuilder.sanitizeRichDescription).not.toHaveBeenCalled();
    });
  });

  describe('ticketTypes → minPrice recalculation', () => {
    it('recalculates minPrice when ticketTypes provided', async () => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: { vip: { price: 50000 } },
      });

      await service.updateEvent(EVENT_ID, {
        ticketTypes: { vip: { price: 50000 }, standard: { price: 25000 } },
      }, ORGANIZER_ID);

      expect(mockCalcMinPrice.calculateMinPrice).toHaveBeenCalledWith({
        vip: { price: 50000 },
        standard: { price: 25000 },
      });
      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ minPrice: 200000 }),
        mockTransaction
      );
    });

    it('skips minPrice when ticketTypes not provided', async () => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });

      await service.updateEvent(EVENT_ID, { name: 'Just Rename' }, ORGANIZER_ID);

      expect(mockCalcMinPrice.calculateMinPrice).not.toHaveBeenCalled();
    });
  });

  describe('visibility rules', () => {
    it('sets isPrivate=true and PRIVATE visibility when isPrivate=true on ACTIVE event', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({
        exists: true, id: EVENT_ID,
        data: { ...BASE_OLD_DATA, status: STATUS.ACTIVE, visibility: VISIBILITY.PUBLIC, isPrivate: false },
      });
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });

      await service.updateEvent(EVENT_ID, { isPrivate: true }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ isPrivate: true, visibility: VISIBILITY.PRIVATE }),
        expect.any(Object)
      );
    });

    it('sets isPrivate=false and PUBLIC visibility when isPrivate=false on ACTIVE event', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({
        exists: true, id: EVENT_ID,
        data: { ...BASE_OLD_DATA, status: STATUS.ACTIVE, visibility: VISIBILITY.PRIVATE, isPrivate: true },
      });
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });

      await service.updateEvent(EVENT_ID, { isPrivate: false }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ isPrivate: false, visibility: VISIBILITY.PUBLIC }),
        expect.any(Object)
      );
    });

    it('forces PRIVATE visibility when event is not ACTIVE, regardless of isPrivate value', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({
        exists: true, id: EVENT_ID,
        data: { ...BASE_OLD_DATA, status: STATUS.PENDING, visibility: VISIBILITY.PRIVATE, isPrivate: true },
      });
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });

      await service.updateEvent(EVENT_ID, { isPrivate: false }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ isPrivate: false, visibility: VISIBILITY.PRIVATE }),
        expect.any(Object)
      );
    });

    it('sets isPrivate=true when visibility=PRIVATE is provided without isPrivate', async () => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });

      await service.updateEvent(EVENT_ID, { visibility: VISIBILITY.PRIVATE }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ isPrivate: true }),
        expect.any(Object)
      );
    });

    it('sets isPrivate=false when visibility=PUBLIC is provided without isPrivate', async () => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });

      await service.updateEvent(EVENT_ID, { visibility: VISIBILITY.PUBLIC }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ isPrivate: false }),
        expect.any(Object)
      );
    });
  });

  describe('address extraction', () => {
    beforeEach(() => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });
    });

    it('merges address fields into payload when extractAddressFields returns data', async () => {
      mockEventBuilder.extractAddressFields.mockReturnValue({
        provinceCode: 'SG',
        provinceName: 'Ho Chi Minh',
        districtCode: 'D1',
        districtName: 'District 1',
        wardCode: 'WD1',
        wardName: 'Ward 1',
        streetAddress: '123 Main St',
      });

      await service.updateEvent(EVENT_ID, {
        vietnamAddress: { provinceCode: 'SG', provinceName: 'Ho Chi Minh' },
      }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
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

    it('sets city from provinceName when city is not in eventData', async () => {
      mockEventBuilder.extractAddressFields.mockReturnValue({
        provinceCode: 'SG',
        provinceName: 'Ho Chi Minh',
      });

      await service.updateEvent(EVENT_ID, {
        vietnamAddress: { provinceCode: 'SG', provinceName: 'Ho Chi Minh' },
      }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ city: 'Ho Chi Minh' }),
        mockTransaction
      );
    });

    it('preserves explicit city in eventData over provinceName', async () => {
      mockEventBuilder.extractAddressFields.mockReturnValue({
        provinceCode: 'SG',
        provinceName: 'Ho Chi Minh',
      });

      await service.updateEvent(EVENT_ID, {
        city: 'Da Nang',
        vietnamAddress: { provinceCode: 'SG', provinceName: 'Ho Chi Minh' },
      }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ city: 'Da Nang' }),
        mockTransaction
      );
    });
  });

  describe('venue/location resolver integration', () => {
    it('calls resolveVenueAndLocationForUpdate with the payload', async () => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });

      await service.updateEvent(EVENT_ID, { venueName: 'New Venue', city: 'New City' }, ORGANIZER_ID);

      expect(mockVenueHandler.resolveVenueAndLocationForUpdate).toHaveBeenCalledTimes(1);
      const [dataArg, payloadArg] = mockVenueHandler.resolveVenueAndLocationForUpdate.mock.calls[0];
      expect(dataArg).toMatchObject({ venueName: 'New Venue', city: 'New City' });
      expect(payloadArg.venueName).toBe('New Venue');
      expect(payloadArg.city).toBe('New City');
    });
  });

  describe('custom question changes', () => {
    const existingQuestions = [
      { id: 'eq_existing', questionText: 'Diet?', questionType: 'text', isRequired: false, options: [], order: 0 },
    ];

    beforeEach(() => {
      mockEventRepo.getEventRawById.mockResolvedValue({
        exists: true, id: EVENT_ID,
        data: { ...BASE_OLD_DATA, customQuestions: existingQuestions },
      });
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });
    });

    it('rejects changed custom questions after ticket sales have started', async () => {
      mockEventRepo.hasTicketSalesStarted.mockResolvedValue(true);
      mockEventBuilder.customQuestionsEqual.mockReturnValue(false);
      mockEventBuilder.normalizeCustomQuestions.mockReturnValue([
        { id: 'eq_new', questionText: 'NewQ?', questionType: 'text', isRequired: false, options: [], order: 0 },
      ]);

      await expect(
        service.updateEvent(EVENT_ID, {
          customQuestions: [{ questionText: 'NewQ?', questionType: 'text' }],
        }, ORGANIZER_ID)
      ).rejects.toThrow('Custom attendee questions cannot be changed after ticket sales begin.');
    });

    it('allows unchanged custom questions after ticket sales have started', async () => {
      mockEventRepo.hasTicketSalesStarted.mockResolvedValue(true);
      mockEventBuilder.customQuestionsEqual.mockReturnValue(true);
      mockEventBuilder.normalizeCustomQuestions.mockReturnValue(existingQuestions);

      await service.updateEvent(EVENT_ID, {
        customQuestions: existingQuestions,
      }, ORGANIZER_ID);

      expect(mockEventRepo.replaceCustomQuestionsInTransaction).not.toHaveBeenCalled();
    });

    it('replaces custom questions transactionally when provided and sales not started', async () => {
      mockEventRepo.hasTicketSalesStarted.mockResolvedValue(false);
      const newQuestions = [
        { id: 'eq_new', questionText: 'NewQ?', questionType: 'text', isRequired: false, options: [], order: 0 },
      ];
      mockEventBuilder.normalizeCustomQuestions.mockReturnValue(newQuestions);

      await service.updateEvent(EVENT_ID, {
        customQuestions: [{ questionText: 'NewQ?', questionType: 'text' }],
      }, ORGANIZER_ID);

      expect(mockEventRepo.replaceCustomQuestionsInTransaction).toHaveBeenCalledWith(
        mockTransaction,
        EVENT_ID,
        newQuestions
      );
    });
  });

  describe('featured profiles', () => {
    beforeEach(() => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: ['fp_existing', 'fp_new'],
        ticketTypes: {},
      });
    });

    it('deduplicates profile IDs when new profiles are created', async () => {
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([
        { id: 'fp_existing', name: 'Artist' },
      ]);
      mockFeaturedService.createFeaturedProfile.mockResolvedValue({ id: 'fp_new' });

      await service.updateEvent(EVENT_ID, {
        featuredProfileIds: ['fp_existing', 'fp_existing'],
        featuredProfilesToCreate: [{ name: 'New Artist', profileType: 'artist' }],
      }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ featuredProfileIds: ['fp_existing', 'fp_new'] }),
        mockTransaction
      );
    });

    it('passes organizerId to createFeaturedProfile inside transaction', async () => {
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([]);
      mockFeaturedService.createFeaturedProfile.mockResolvedValue({ id: 'fp_new' });

      await service.updateEvent(EVENT_ID, {
        featuredProfilesToCreate: [{ name: 'New Artist', profileType: 'artist' }],
      }, ORGANIZER_ID);

      expect(mockFeaturedService.createFeaturedProfile).toHaveBeenCalledWith(
        { name: 'New Artist', profileType: 'artist' },
        { creatorId: ORGANIZER_ID, transaction: mockTransaction }
      );
    });

    it('falls back to oldData.organizerId when organizerId is null', async () => {
      mockFeaturedRepo.getFeaturedProfilesByIds.mockResolvedValue([]);
      mockFeaturedService.createFeaturedProfile.mockResolvedValue({ id: 'fp_new' });

      await service.updateEvent(EVENT_ID, {
        featuredProfilesToCreate: [{ name: 'New Artist', profileType: 'artist' }],
      }, null);

      expect(mockFeaturedService.createFeaturedProfile).toHaveBeenCalledWith(
        { name: 'New Artist', profileType: 'artist' },
        { creatorId: ORGANIZER_ID, transaction: mockTransaction }
      );
    });
  });

  describe('search_index publish', () => {
    beforeEach(() => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });
    });

    it('publishes search_index with correct action and eventId inside transaction', async () => {
      await service.updateEvent(EVENT_ID, { name: 'New Name' }, ORGANIZER_ID);

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'search_index',
        { action: 'index', eventId: EVENT_ID },
        mockTransaction
      );
    });
  });

  describe('conditional event_update notification', () => {
    beforeEach(() => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'Updated Event', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });
    });

    it('publishes notification when hasImportantChanges returns true', async () => {
      mockUpdatePolicy.hasImportantChanges.mockReturnValue(true);

      await service.updateEvent(EVENT_ID, { name: 'Updated Event' }, ORGANIZER_ID);

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'notification',
        {
          channel: 'event_update',
          eventId: EVENT_ID,
          eventName: 'Updated Event',
        },
        mockTransaction
      );
    });

    it('skips notification when hasImportantChanges returns false', async () => {
      mockUpdatePolicy.hasImportantChanges.mockReturnValue(false);

      await service.updateEvent(EVENT_ID, { description: 'minor change' }, ORGANIZER_ID);

      const notificationCalls = mockPublisher.publish.mock.calls.filter(
        ([type]) => type === 'notification'
      );
      expect(notificationCalls).toHaveLength(0);
    });

    it('passes old and new event data to hasImportantChanges', async () => {
      const oldDataSnapshot = { ...BASE_OLD_DATA };
      mockEventRepo.getEventRawById.mockResolvedValue({
        exists: true, id: EVENT_ID, data: oldDataSnapshot,
      });
      const fullNewData = {
        id: EVENT_ID, name: 'Updated Event', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      };
      mockEventRepo.getEventInTransaction.mockResolvedValue(fullNewData);
      mockUpdatePolicy.hasImportantChanges.mockReturnValue(false);

      await service.updateEvent(EVENT_ID, { name: 'Updated Event' }, ORGANIZER_ID);

      expect(mockUpdatePolicy.hasImportantChanges).toHaveBeenCalledWith(oldDataSnapshot, fullNewData);
    });
  });

  describe('outbox and cache invalidation', () => {
    beforeEach(() => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });
    });

    it('triggers outbox processing after transaction', async () => {
      await service.updateEvent(EVENT_ID, { name: 'New' }, ORGANIZER_ID);

      expect(mockOutbox.triggerProcess).toHaveBeenCalledTimes(1);
    });

    it('invalidates event and category caches after transaction', async () => {
      await service.updateEvent(EVENT_ID, { name: 'New' }, ORGANIZER_ID);

      expect(mockCache.invalidateEvent).toHaveBeenCalledWith(EVENT_ID);
      expect(mockCache.invalidateCategories).toHaveBeenCalledTimes(1);
    });
  });

  describe('transaction scoping', () => {
    beforeEach(() => {
      mockEventRepo.getEventInTransaction.mockResolvedValue({
        id: EVENT_ID, name: 'E', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {},
      });
    });

    it('calls updateEvent inside transaction', async () => {
      await service.updateEvent(EVENT_ID, { name: 'New' }, ORGANIZER_ID);

      expect(mockEventRepo.updateEvent).toHaveBeenCalledWith(
        EVENT_ID,
        expect.any(Object),
        mockTransaction
      );
    });

    it('calls getEventInTransaction inside transaction', async () => {
      await service.updateEvent(EVENT_ID, { name: 'New' }, ORGANIZER_ID);

      expect(mockEventRepo.getEventInTransaction).toHaveBeenCalledWith(mockTransaction, EVENT_ID);
    });
  });

  describe('return value', () => {
    it('returns the full event data from getEventInTransaction', async () => {
      const resolvedData = {
        id: EVENT_ID, name: 'Updated Event', date: 1700000000000,
        featuredProfileIds: [], ticketTypes: {}, minPrice: 200000,
      };
      mockEventRepo.getEventInTransaction.mockResolvedValue(resolvedData);

      const result = await service.updateEvent(EVENT_ID, { name: 'Updated Event' }, ORGANIZER_ID);

      expect(result).toBe(resolvedData);
    });
  });
});
