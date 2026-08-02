/* eslint-env jest */
const { STATUS, VISIBILITY } = require('@/modules/events/domain/event-lifecycle');

const mockEsClient = { search: jest.fn() };
const mockCache = { getEvent: jest.fn(), setEvent: jest.fn() };
const mockEventRepo = {
  getPublicEventsPage: jest.fn(),
  getEventRawById: jest.fn(),
  searchPublicEvents: jest.fn(),
  getRecommendedEventsRelational: jest.fn(),
};
const mockVenueRepo = { getVenueRawById: jest.fn() };
const mockUserRepo = { getRawUserDataById: jest.fn() };
const mockFeaturedRepo = { getFeaturedProfilesDataByIds: jest.fn(), getFeaturedProfilesByIds: jest.fn() };
const mockSearchQueryBuilder = { buildSearchQuery: jest.fn(), normalizeSearchParams: jest.fn() };
const mockRecQueryBuilder = { buildRecommendationQuery: jest.fn() };
const mockMappers = { mapPublicTicketTypes: jest.fn(), mapPublicVenue: jest.fn(), buildElasticData: jest.fn() };
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
const mockPublisher = { publish: jest.fn() };
const mockOutbox = { triggerProcess: jest.fn() };
const mockPostgresClient = { transaction: jest.fn() };
const mockCalcMinPrice = { calculateMinPrice: jest.fn() };
const mockNotifications = { fcmService: { sendMulticast: jest.fn() } };
const mockFeaturedService = { createFeaturedProfile: jest.fn() };
const mockNearbyEvents = { findNearbyEvents: jest.fn() };
const mockWeather = { getEventWeather: jest.fn() };
const mockNotifSender = { notifyAttendeesAboutUpdate: jest.fn(), notifyAttendeesAboutCancellation: jest.fn() };
const mockTicketRepo = {};
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
jest.mock('@/modules/events/application/query-builders/search-query.builder', () => mockSearchQueryBuilder);
jest.mock('@/modules/events/application/query-builders/recommendation-query.builder', () => mockRecQueryBuilder);
jest.mock('@/modules/events/application/helpers/event-mappers', () => mockMappers);
jest.mock('@/shared/logger', () => mockLogger);
jest.mock('@/shared/events/event-publisher', () => mockPublisher);
jest.mock('@/shared/events/outbox-processor', () => mockOutbox);
jest.mock('@/providers/database/postgres.client', () => mockPostgresClient);
jest.mock('@/utils/tickets/calculateMinPrice.tickets', () => mockCalcMinPrice);
jest.mock('@/modules/notifications', () => mockNotifications);
jest.mock('@/modules/featuredProfile/application/service', () => mockFeaturedService);
jest.mock('@/modules/events/application/helpers/nearby-events.helper', () => mockNearbyEvents);
jest.mock('@/modules/events/application/helpers/weather.helper', () => mockWeather);
jest.mock('@/modules/events/application/helpers/notification-sender', () => mockNotifSender);
jest.mock('@/providers/database/ticket.repository', () => mockTicketRepo);
jest.mock('@/modules/events/application/policies/update-policy', () => mockUpdatePolicy);
jest.mock('@/modules/events/application/helpers/event-builder', () => mockEventBuilder);

function reloadService(esValue) {
  jest.resetModules();
  jest.doMock('@/shared/config/elasticsearch.config', () => esValue);
  return require('@/modules/events/application/service');
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('getAllEvents', () => {
  let service;
  beforeAll(() => { service = reloadService(null); });

  const baseEntry = (id) => ({
    id,
    data: {
      name: `Event ${id}`, date: 1700000000000, category: ['music'],
      imageUrl: `img/${id}.jpg`, bannerUrl: `banner/${id}.jpg`,
      videoUrl: `vid/${id}.mp4`, location: { lat: 10, lng: 20 },
      city: 'Hanoi', venueName: 'Venue A',
      eventType: 'physical', minPrice: 100,
    },
  });

  it('returns empty pagination when no events', async () => {
    mockEventRepo.getPublicEventsPage.mockResolvedValue({ entries: [], totalItems: 0 });
    const result = await service.getAllEvents(1, 10);
    expect(result.events).toEqual([]);
    expect(result.pagination).toEqual({
      currentPage: 1, limit: 10, totalPages: 0, totalItems: 0,
    });
  });

  it('maps entries to expected shape with pagination', async () => {
    const entries = [baseEntry('evt_1'), baseEntry('evt_2')];
    mockEventRepo.getPublicEventsPage.mockResolvedValue({ entries, totalItems: 2 });
    const result = await service.getAllEvents(1, 10);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toEqual({
      id: 'evt_1', name: 'Event evt_1', date: 1700000000000,
      category: ['music'], imageUrl: 'img/evt_1.jpg',
      bannerUrl: 'banner/evt_1.jpg', videoUrl: 'vid/evt_1.mp4',
      location: { lat: 10, lng: 20 }, city: 'Hanoi',
      venueName: 'Venue A', eventType: 'physical', minPrice: 100,
    });
    expect(result.pagination).toEqual({
      currentPage: 1, limit: 10, totalPages: 1, totalItems: 2,
    });
  });

  it('defaults null fields to null', async () => {
    const entry = { id: 'evt_1', data: { name: 'Test' } };
    mockEventRepo.getPublicEventsPage.mockResolvedValue({ entries: [entry], totalItems: 1 });
    const result = await service.getAllEvents(1, 10);
    expect(result.events[0].city).toBeNull();
    expect(result.events[0].venueName).toBeNull();
    expect(result.events[0].minPrice).toBeNull();
    expect(result.events[0].eventType).toBe('physical');
  });

  it('passes given page and limit to repository', async () => {
    mockEventRepo.getPublicEventsPage.mockResolvedValue({ entries: [], totalItems: 0 });
    await service.getAllEvents(3, 20);
    expect(mockEventRepo.getPublicEventsPage).toHaveBeenCalledWith(3, 20);
  });
});

describe('getEventById', () => {
  let service;
  beforeAll(() => { service = reloadService(null); });

  const publicEvent = {
    id: 'evt_1', name: 'Concert', description: 'Great show',
    imageUrl: 'img.jpg', bannerUrl: 'banner.jpg',
    category: ['music'], tags: ['jazz'], date: 1700000000000,
    endDate: 1700086400000, eventType: 'physical', onlineUrl: null,
    location: { lat: 10, lng: 20 }, geohash: 'w3gx',
    city: 'Hanoi', venueName: 'Venue A', videoUrl: 'vid.mp4',
    isOutdoor: false, status: STATUS.ACTIVE, visibility: VISIBILITY.PUBLIC,
    requiredAge: 0, sponsors: [], minPrice: 100, featuredProfiles: [],
    ticketTypes: { vip: { price: 200 } }, venue: { id: 'v1', name: 'Venue A' },
    organizerId: 'org_1', isPrivate: false, messageForAttendee: '',
    addressDetails: null, vietnamAddress: null, customQuestions: [],
  };

  beforeEach(() => {
    mockCache.getEvent.mockReset();
    mockCache.setEvent.mockReset();
    mockEventRepo.getEventRawById.mockReset();
    mockVenueRepo.getVenueRawById.mockReset();
    mockFeaturedRepo.getFeaturedProfilesDataByIds.mockReset();
    mockMappers.mapPublicTicketTypes.mockReset();
    mockMappers.mapPublicVenue.mockReset();
  });

  describe('cache hit', () => {
    const rawEventData = {
      name: 'Concert', description: 'Great',
      imageUrl: 'img.jpg', bannerUrl: 'banner.jpg',
      category: ['music'], tags: ['jazz'], date: 1700000000000,
      endDate: 1700086400000, eventType: 'physical', onlineUrl: null,
      location: { lat: 10, lng: 20 }, geohash: 'w3gx',
      city: 'Hanoi', venueName: 'Venue A', videoUrl: 'vid.mp4',
      isOutdoor: false, status: STATUS.ACTIVE, visibility: VISIBILITY.PUBLIC,
      requiredAge: 0, sponsors: [], minPrice: 100,
      organizerId: 'org_1', isPrivate: false, messageForAttendee: '',
      addressDetails: null, vietnamAddress: null, customQuestions: [],
      ticketTypes: {}, venueId: null, featuredProfileIds: [],
    };

    it('returns cached event for public visibility', async () => {
      mockCache.getEvent.mockResolvedValue(publicEvent);
      const result = await service.getEventById('evt_1', null);
      expect(result).toEqual(publicEvent);
      expect(mockEventRepo.getEventRawById).not.toHaveBeenCalled();
    });

    it('denies private cached event when no user', async () => {
      const privateEvent = { ...publicEvent, visibility: VISIBILITY.PRIVATE };
      mockCache.getEvent.mockResolvedValue(privateEvent);
      const result = await service.getEventById('evt_1', null);
      expect(result).toBeNull();
    });

    it('for owner cache hit falls through to DB and returns full view', async () => {
      const privateEvent = { ...publicEvent, visibility: VISIBILITY.PRIVATE, organizerId: 'user_1' };
      mockCache.getEvent.mockResolvedValue(privateEvent);
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: 'evt_1', data: rawEventData });
      mockVenueRepo.getVenueRawById.mockResolvedValue({ exists: false, id: null, data: null });
      mockFeaturedRepo.getFeaturedProfilesDataByIds.mockResolvedValue([]);

      const result = await service.getEventById('evt_1', { uid: 'user_1' });
      expect(result).toBeDefined();
      expect(result.id).toBe('evt_1');
    });

    it('for admin cache hit falls through to DB and returns full view', async () => {
      const privateEvent = { ...publicEvent, visibility: VISIBILITY.PRIVATE };
      mockCache.getEvent.mockResolvedValue(privateEvent);
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: 'evt_1', data: rawEventData });
      mockVenueRepo.getVenueRawById.mockResolvedValue({ exists: false, id: null, data: null });
      mockFeaturedRepo.getFeaturedProfilesDataByIds.mockResolvedValue([]);

      const result = await service.getEventById('evt_1', { uid: 'admin_1', roles: ['admin'] });
      expect(result).toBeDefined();
      expect(result.id).toBe('evt_1');
    });

    it('returns unlisted cached event when user present', async () => {
      const unlistedEvent = { ...publicEvent, visibility: VISIBILITY.UNLISTED };
      mockCache.getEvent.mockResolvedValue(unlistedEvent);
      const result = await service.getEventById('evt_1', { uid: 'user_1' });
      expect(result).toEqual(unlistedEvent);
    });

    it('denies unlisted cached event when no user', async () => {
      const unlistedEvent = { ...publicEvent, visibility: VISIBILITY.UNLISTED };
      mockCache.getEvent.mockResolvedValue(unlistedEvent);
      const result = await service.getEventById('evt_1', null);
      expect(result).toBeNull();
    });
  });

  describe('cache failure fallback', () => {
    it('falls back to DB when cache get throws', async () => {
      mockCache.getEvent.mockRejectedValue(new Error('Redis down'));
      const dbEvent = { exists: true, id: 'evt_1', data: { ...publicEvent } };
      mockEventRepo.getEventRawById.mockResolvedValue(dbEvent);
      mockVenueRepo.getVenueRawById.mockResolvedValue({ exists: false, id: null, data: null });
      mockFeaturedRepo.getFeaturedProfilesDataByIds.mockResolvedValue([]);
      mockMappers.mapPublicTicketTypes.mockReturnValue({});
      mockMappers.mapPublicVenue.mockReturnValue(null);

      const result = await service.getEventById('evt_1', null);
      expect(result).toBeDefined();
      expect(result.id).toBe('evt_1');
      expect(mockEventRepo.getEventRawById).toHaveBeenCalledWith('evt_1');
    });
  });

  describe('DB path', () => {
    const rawData = {
      name: 'Concert', description: 'Great', imageUrl: 'img.jpg',
      bannerUrl: 'banner.jpg', category: ['music'], tags: ['jazz'],
      date: 1700000000000, endDate: 1700086400000, eventType: 'physical',
      onlineUrl: null, location: { lat: 10, lng: 20 }, geohash: 'w3gx',
      city: 'Hanoi', venueName: 'Venue A', videoUrl: 'vid.mp4',
      isOutdoor: false, status: STATUS.ACTIVE, visibility: VISIBILITY.PUBLIC,
      requiredAge: 0, sponsors: [], minPrice: 100,
      organizerId: 'org_1', isPrivate: false, messageForAttendee: '',
      addressDetails: null, vietnamAddress: null, customQuestions: [],
      ticketTypes: { vip: { price: 200, name: 'VIP' } },
      venueId: 'v1', featuredProfileIds: ['fp1'],
    };

    it('returns null for missing event', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: false, id: null, data: null });
      const result = await service.getEventById('evt_missing', null);
      expect(result).toBeNull();
    });

    it('returns null for cancelled event', async () => {
      const cancelled = { ...rawData, status: STATUS.CANCELLED };
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: 'evt_1', data: cancelled });
      const result = await service.getEventById('evt_1', null);
      expect(result).toBeNull();
    });

    it('returns public mapped view with venue and profiles', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: 'evt_1', data: rawData });
      mockVenueRepo.getVenueRawById.mockResolvedValue({ exists: true, id: 'v1', data: { id: 'v1', name: 'Venue A', seatMapTemplate: {} } });
      mockFeaturedRepo.getFeaturedProfilesDataByIds.mockResolvedValue([{ id: 'fp1', name: 'Artist' }]);
      mockMappers.mapPublicTicketTypes.mockReturnValue({ vip: { price: 200 } });
      mockMappers.mapPublicVenue.mockReturnValue({ id: 'v1', name: 'Venue A' });

      const result = await service.getEventById('evt_1', null);
      expect(result.id).toBe('evt_1');
      expect(result.name).toBe('Concert');
      expect(result.description).toBe('Great');
      expect(result.ticketTypes).toEqual({ vip: { price: 200 } });
      expect(result.venue).toEqual({ id: 'v1', name: 'Venue A' });
      expect(result.featuredProfiles).toEqual([{ id: 'fp1', name: 'Artist' }]);
      expect(result.organizerId).toBe('org_1');
      expect(mockVenueRepo.getVenueRawById).toHaveBeenCalledWith('v1');
      expect(mockFeaturedRepo.getFeaturedProfilesDataByIds).toHaveBeenCalledWith(['fp1']);
    });

    it('writes public view to cache after DB fetch', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: 'evt_1', data: rawData });
      mockVenueRepo.getVenueRawById.mockResolvedValue({ exists: false, id: null, data: null });
      mockFeaturedRepo.getFeaturedProfilesDataByIds.mockResolvedValue([]);
      mockMappers.mapPublicTicketTypes.mockReturnValue({});
      mockMappers.mapPublicVenue.mockReturnValue(null);

      await service.getEventById('evt_1', null);
      expect(mockCache.setEvent).toHaveBeenCalledWith('evt_1', expect.objectContaining({ id: 'evt_1', name: 'Concert' }));
    });

    it('returns full data for owner - bypasses mappers', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: 'evt_1', data: rawData });
      mockVenueRepo.getVenueRawById.mockResolvedValue({ exists: true, id: 'v1', data: { id: 'v1', name: 'Venue A' } });
      mockFeaturedRepo.getFeaturedProfilesDataByIds.mockResolvedValue([{ id: 'fp1', name: 'Artist' }]);

      const result = await service.getEventById('evt_1', { uid: 'org_1' });
      expect(result.id).toBe('evt_1');
      expect(result.venue).toEqual({ id: 'v1', name: 'Venue A' });
      expect(result.featuredProfiles).toEqual([{ id: 'fp1', name: 'Artist' }]);
      expect(mockMappers.mapPublicTicketTypes).not.toHaveBeenCalled();
      expect(mockMappers.mapPublicVenue).not.toHaveBeenCalled();
    });

    it('returns full data for admin regardless of ownership', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: 'evt_1', data: rawData });
      mockVenueRepo.getVenueRawById.mockResolvedValue({ exists: false, id: null, data: null });
      mockFeaturedRepo.getFeaturedProfilesDataByIds.mockResolvedValue([]);

      const result = await service.getEventById('evt_1', { uid: 'admin_1', roles: ['admin'] });
      expect(result).toBeDefined();
    });

    it('denies private event to anonymous user', async () => {
      const privateRaw = { ...rawData, visibility: VISIBILITY.PRIVATE };
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: 'evt_1', data: privateRaw });
      mockVenueRepo.getVenueRawById.mockResolvedValue({ exists: false, id: null, data: null });
      mockFeaturedRepo.getFeaturedProfilesDataByIds.mockResolvedValue([]);
      mockMappers.mapPublicTicketTypes.mockReturnValue({});
      mockMappers.mapPublicVenue.mockReturnValue(null);

      const result = await service.getEventById('evt_1', null);
      expect(result).toBeNull();
    });

    it('returns public view for unlisted event when authenticated', async () => {
      const unlistedRaw = { ...rawData, visibility: VISIBILITY.UNLISTED };
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, id: 'evt_1', data: unlistedRaw });
      mockVenueRepo.getVenueRawById.mockResolvedValue({ exists: false, id: null, data: null });
      mockFeaturedRepo.getFeaturedProfilesDataByIds.mockResolvedValue([]);
      mockMappers.mapPublicTicketTypes.mockReturnValue({});
      mockMappers.mapPublicVenue.mockReturnValue(null);

      const result = await service.getEventById('evt_1', { uid: 'user_1' });
      expect(result).toBeDefined();
      expect(result.id).toBe('evt_1');
    });
  });
});

describe('searchEvents', () => {
  let service;
  beforeAll(() => { service = reloadService(mockEsClient); });

  const esHit = (id) => ({
    _id: id,
    _source: {
      name: `Event ${id}`, date: 1700000000000, imageUrl: 'img.jpg',
      bannerUrl: 'banner.jpg', videoUrl: 'vid.mp4',
      location: { lat: 10, lng: 20 }, city: 'Hanoi', venueName: 'Venue A',
      eventType: 'physical', minPrice: 100,
    },
  });

  beforeEach(() => {
    mockSearchQueryBuilder.normalizeSearchParams.mockReset();
    mockSearchQueryBuilder.buildSearchQuery.mockReset();
    mockEventRepo.searchPublicEvents.mockReset();
    mockEsClient.search.mockReset();
  });

  it('returns ES results with pagination', async () => {
    mockSearchQueryBuilder.normalizeSearchParams.mockReturnValue({ page: '1', limit: '10' });
    mockSearchQueryBuilder.buildSearchQuery.mockReturnValue({
      query: { bool: { must: [{ match_all: {} }] } },
      sort: [{ date: { order: 'asc' } }],
      offset: 0, limit: 10,
    });
    mockEsClient.search.mockResolvedValue({
      hits: { total: { value: 2 }, hits: [esHit('evt_1'), esHit('evt_2')] },
    });

    const result = await service.searchEvents({ q: 'jazz' });
    expect(result.events).toHaveLength(2);
    expect(result.events[0].id).toBe('evt_1');
    expect(result.events[0].name).toBe('Event evt_1');
    expect(result.pagination).toEqual({
      currentPage: 1, limit: 10, totalPages: 1, totalItems: 2,
    });
  });

  it('falls back to DB when ES search fails', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockSearchQueryBuilder.normalizeSearchParams.mockReturnValue({ page: '1', limit: '10' });
    mockSearchQueryBuilder.buildSearchQuery.mockReturnValue({
      query: {}, sort: [], offset: 0, limit: 10,
    });
    mockEsClient.search.mockRejectedValue(new Error('ES cluster down'));
    mockEventRepo.searchPublicEvents.mockResolvedValue({
      entries: [{ id: 'evt_1', data: { name: 'DB Event', date: 1700000000000, imageUrl: null, bannerUrl: null, videoUrl: null, location: null, city: 'Hanoi', venueName: 'Venue A', eventType: 'physical', minPrice: 50 } }],
      totalItems: 1,
    });

    const result = await service.searchEvents({ q: 'jazz' });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe('evt_1');
    expect(result.events[0].name).toBe('DB Event');
    expect(result.pagination.totalItems).toBe(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('honours normalizeSearchParams page/limit in fallback', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockSearchQueryBuilder.normalizeSearchParams.mockReturnValue({ page: '2', limit: '20' });
    mockSearchQueryBuilder.buildSearchQuery.mockReturnValue({
      query: {}, sort: [], offset: 20, limit: 20,
    });
    mockEsClient.search.mockRejectedValue(new Error('fail'));
    mockEventRepo.searchPublicEvents.mockResolvedValue({
      entries: [], totalItems: 0,
    });

    const result = await service.searchEvents({ q: 'test' });
    expect(result.pagination.currentPage).toBe(2);
    expect(result.pagination.limit).toBe(20);
    warnSpy.mockRestore();
  });
});

describe('getRecommendations', () => {
  let service;
  beforeAll(() => { service = reloadService(null); });

  const relationalEvent = (id) => ({
    id, name: `Event ${id}`, date: 1700000000000,
    imageUrl: `img/${id}.jpg`, bannerUrl: `banner/${id}.jpg`,
    videoUrl: `vid/${id}.mp4`, location: { lat: 10, lng: 20 },
    city: null, venueName: null, eventType: 'physical', minPrice: null,
  });

  beforeEach(() => {
    mockUserRepo.getRawUserDataById.mockReset();
    mockEventRepo.getRecommendedEventsRelational.mockReset();
    mockEventRepo.getPublicEventsPage.mockReset();
    mockEsClient.search.mockReset();
    mockRecQueryBuilder.buildRecommendationQuery.mockReset();
  });

  it('returns empty when user not found', async () => {
    mockUserRepo.getRawUserDataById.mockResolvedValue(null);
    const result = await service.getRecommendations('missing_user');
    expect(result).toEqual([]);
  });

  it('uses relational query when user has no interests (success)', async () => {
    mockUserRepo.getRawUserDataById.mockResolvedValue({
      matchingPreferences: { interests: [] },
      historyEventIds: ['evt_old'],
    });
    const events = [relationalEvent('evt_a'), relationalEvent('evt_b')];
    mockEventRepo.getRecommendedEventsRelational.mockResolvedValue(events);

    const result = await service.getRecommendations('user_1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('evt_a');
    expect(mockEventRepo.getRecommendedEventsRelational).toHaveBeenCalledWith([], ['evt_old'], 10);
  });

  it('falls back to getAllEvents when no-interest relational fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUserRepo.getRawUserDataById.mockResolvedValue({
      matchingPreferences: { interests: [] },
      historyEventIds: [],
    });
    mockEventRepo.getRecommendedEventsRelational.mockRejectedValue(new Error('DB error'));
    mockEventRepo.getPublicEventsPage.mockResolvedValue({
      entries: [{ id: 'evt_1', data: { name: 'Fallback', date: 1700000000000, imageUrl: null, bannerUrl: null, videoUrl: null, location: null, city: null, venueName: null, eventType: 'physical', minPrice: null } }],
      totalItems: 1,
    });

    const result = await service.getRecommendations('user_1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Fallback');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('uses relational when ES is unavailable and relational succeeds', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockUserRepo.getRawUserDataById.mockResolvedValue({
      matchingPreferences: { interests: ['music'] },
      historyEventIds: [],
    });
    mockEventRepo.getRecommendedEventsRelational.mockResolvedValue([relationalEvent('evt_rel')]);

    const result = await service.getRecommendations('user_1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('evt_rel');
    warnSpy.mockRestore();
  });

  it('falls back to getAllEvents when ES unavailable and relational fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUserRepo.getRawUserDataById.mockResolvedValue({
      matchingPreferences: { interests: ['music'] },
      historyEventIds: [],
    });
    mockEventRepo.getRecommendedEventsRelational.mockRejectedValue(new Error('relational fail'));
    mockEventRepo.getPublicEventsPage.mockResolvedValue({
      entries: [{ id: 'evt_fb', data: { name: 'Relational FB', date: 1700000000000, imageUrl: null, bannerUrl: null, videoUrl: null, location: null, city: null, venueName: null, eventType: 'physical', minPrice: null } }],
      totalItems: 1,
    });

    const result = await service.getRecommendations('user_1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Relational FB');
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('Elasticsearch path', () => {
    let service;
    beforeAll(() => { service = reloadService(mockEsClient); });

    const esHit = (id) => ({
      _id: id,
      _source: {
        name: `ES ${id}`, date: 1700000000000, imageUrl: 'img.jpg',
        bannerUrl: 'banner.jpg', videoUrl: 'vid.mp4',
        location: { lat: 10, lng: 20 }, city: 'Hanoi', venueName: 'Venue A',
        eventType: 'physical', minPrice: 100,
      },
    });

    it('returns ES results directly', async () => {
      mockUserRepo.getRawUserDataById.mockResolvedValue({
        matchingPreferences: { interests: ['music'] },
        historyEventIds: [],
      });
      mockRecQueryBuilder.buildRecommendationQuery.mockReturnValue({ query: { bool: {} }, sort: [] });
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [esHit('evt_es1'), esHit('evt_es2')] },
      });

      const result = await service.getRecommendations('user_1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('evt_es1');
      expect(result[0].name).toBe('ES evt_es1');
    });

    it('falls back to relational on ES failure (relational succeeds)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockUserRepo.getRawUserDataById.mockResolvedValue({
        matchingPreferences: { interests: ['music'] },
        historyEventIds: [],
      });
      mockRecQueryBuilder.buildRecommendationQuery.mockReturnValue({ query: { bool: {} }, sort: [] });
      mockEsClient.search.mockRejectedValue(new Error('ES error'));
      mockEventRepo.getRecommendedEventsRelational.mockResolvedValue([relationalEvent('evt_rb')]);

      const result = await service.getRecommendations('user_1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('evt_rb');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('nested fallback to getAllEvents when both ES and relational fail', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockUserRepo.getRawUserDataById.mockResolvedValue({
        matchingPreferences: { interests: ['music'] },
        historyEventIds: [],
      });
      mockRecQueryBuilder.buildRecommendationQuery.mockReturnValue({ query: { bool: {} }, sort: [] });
      mockEsClient.search.mockRejectedValue(new Error('ES down'));
      mockEventRepo.getRecommendedEventsRelational.mockRejectedValue(new Error('relational down too'));
      mockEventRepo.getPublicEventsPage.mockResolvedValue({
        entries: [{ id: 'evt_nested', data: { name: 'Nested FB', date: 1700000000000, imageUrl: null, bannerUrl: null, videoUrl: null, location: null, city: null, venueName: null, eventType: 'physical', minPrice: null } }],
        totalItems: 1,
      });

      const result = await service.getRecommendations('user_1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Nested FB');
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });
});
