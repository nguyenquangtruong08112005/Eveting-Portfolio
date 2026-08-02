'use strict';

const BASE_TIME = 1736899200000;
const DAY_MS = 86400000;

jest.mock('crypto', () => ({ randomUUID: jest.fn() }));
jest.mock('geofire-common', () => ({ geohashForLocation: jest.fn() }));
jest.mock('@/providers/database/venue.repository');
jest.mock('@/providers/database/event.repository');
jest.mock('@/providers/database/ticket.repository');
jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('@/shared/config/env.config', () => ({
  get openweatherApiKey() { return process.env.OPENWEATHER_API_KEY; },
  get databaseProvider() { return process.env.DATABASE_PROVIDER || 'postgres'; },
  databaseProviders: {
    get venue() { return process.env.VENUE_DATABASE_PROVIDER; },
    get event() { return process.env.EVENT_DATABASE_PROVIDER; },
    get ticket() { return process.env.TICKET_DATABASE_PROVIDER; },
  },
}));
jest.mock('@/modules/notifications', () => ({
  fcmService: { sendMulticast: jest.fn() },
  service: { createNotification: jest.fn() },
  helper: { buildPayloadData: jest.fn(), collectMessagingTargets: jest.fn() },
}));
jest.mock('moment', () => {
  const moment = jest.fn((input) => {
    const value = input === undefined ? BASE_TIME : input;
    const m = { valueOf: () => value };
    m.diff = jest.fn(function (other, unit) {
      const ms = this.valueOf() - other.valueOf();
      if (unit === 'days') return Math.floor(ms / DAY_MS);
      return ms;
    }.bind(m));
    return m;
  });
  return moment;
});

const crypto = require('crypto');
const geofire = require('geofire-common');
const venueRepository = require('@/providers/database/venue.repository');
const eventRepository = require('@/providers/database/event.repository');
const ticketRepository = require('@/providers/database/ticket.repository');
const axios = require('axios');
const { fcmService, service: notificationService, helper: notifHelper } = require('@/modules/notifications');

const { resolveVenueAndLocationForCreate, resolveVenueAndLocationForUpdate } = require('@/modules/events/application/helpers/venue-handler');
const { notifyAttendeesAboutUpdate, notifyAttendeesAboutCancellation } = require('@/modules/events/application/helpers/notification-sender');
const { BadRequestError, NotFoundError } = require('@/shared/errors');

const baseEvent = (overrides) => ({
  eventType: 'physical',
  date: BASE_TIME + 3 * DAY_MS,
  location: { latitude: 21.02, longitude: 105.84 },
  ...overrides,
});

beforeEach(() => { jest.clearAllMocks(); });

// ================================================================
// venue-handler
// ================================================================
describe('resolveVenueAndLocationForCreate', () => {
  it('returns catalog venue data when venueId exists and has location', async () => {
    const venue = { name: 'Grand Hall', city: 'Hanoi', location: { latitude: 21.02, longitude: 105.84 } };
    venueRepository.getVenueRawById.mockResolvedValue({ exists: true, data: venue });
    const result = await resolveVenueAndLocationForCreate({ venueId: 'v1', eventType: 'physical' });
    expect(venueRepository.getVenueRawById).toHaveBeenCalledWith('v1');
    expect(result.venueName).toBe('Grand Hall');
    expect(result.city).toBe('Hanoi');
    expect(result.location).toEqual({ latitude: 21.02, longitude: 105.84 });
    expect(result.venueId).toBe('v1');
  });

  it('throws NotFoundError when venueId not found', async () => {
    venueRepository.getVenueRawById.mockResolvedValue({ exists: false });
    await expect(resolveVenueAndLocationForCreate({ venueId: 'v1', eventType: 'physical' }))
      .rejects.toThrow(NotFoundError);
  });

  it('falls back to addressDetails.city and eventData.city for catalog venue', async () => {
    const addrCity = { name: 'H', addressDetails: { city: 'AddrCity' }, location: { latitude: 10, longitude: 20 } };
    venueRepository.getVenueRawById.mockResolvedValue({ exists: true, data: addrCity });
    const result = await resolveVenueAndLocationForCreate({ venueId: 'v1', eventType: 'physical', city: 'Fallback' });
    expect(result.city).toBe('AddrCity');

    venueRepository.getVenueRawById.mockResolvedValue({ exists: true, data: { name: 'H', location: { latitude: 10, longitude: 20 } } });
    const result2 = await resolveVenueAndLocationForCreate({ venueId: 'v2', eventType: 'physical', city: 'Fallback' });
    expect(result2.city).toBe('Fallback');

    const noCity = { name: 'H', location: { latitude: 10, longitude: 20 } };
    venueRepository.getVenueRawById.mockResolvedValue({ exists: true, data: noCity });
    const result3 = await resolveVenueAndLocationForCreate({ venueId: 'v3', eventType: 'physical' });
    expect(result3.city).toBeNull();
  });

  it('keeps eventData location address when eventData provides location and catalog lacks one', async () => {
    const venue = { name: 'Hall', location: { latitude: 10, longitude: 20 } };
    venueRepository.getVenueRawById.mockResolvedValue({ exists: true, data: venue });
    const result = await resolveVenueAndLocationForCreate({
      venueId: 'v1', eventType: 'physical',
      location: { address: '123 Street' },
    });
    expect(result.location).toEqual({ address: '123 Street' });
  });

  it('creates new venue for legacy geocoded input and returns geohash', async () => {
    crypto.randomUUID.mockReturnValue('uuid123');
    geofire.geohashForLocation.mockReturnValue('mygeohash');
    venueRepository.createVenue.mockResolvedValue(undefined);
    const eventData = {
      eventType: 'physical', venueName: 'Test Venue',
      location: { lat: 21.03, lng: 105.85 },
      addressDetails: { street: '1A', ward: 'W1', district: 'D1', city: 'HN' },
      city: 'Fallback',
    };
    const result = await resolveVenueAndLocationForCreate(eventData);
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(geofire.geohashForLocation).toHaveBeenCalledWith([21.03, 105.85]);
    expect(venueRepository.createVenue).toHaveBeenCalledWith('venue_uuid123', expect.objectContaining({ name: 'Test Venue', id: 'venue_uuid123' }));
    expect(result.venueId).toBe('venue_uuid123');
    expect(result.venueName).toBe('Test Venue');
    expect(result.city).toBe('HN');
    expect(result.location).toEqual({ latitude: 21.03, longitude: 105.85 });
    expect(result.geohash).toBe('mygeohash');
  });

  it('handles latitude/longitude property names in legacy path', async () => {
    crypto.randomUUID.mockReturnValue('uuid1');
    geofire.geohashForLocation.mockReturnValue('gh');
    venueRepository.createVenue.mockResolvedValue(undefined);
    const result = await resolveVenueAndLocationForCreate({
      eventType: 'physical', venueName: 'V',
      location: { latitude: 10, longitude: 20 },
      addressDetails: { city: 'C' },
    });
    expect(result.location).toEqual({ latitude: 10, longitude: 20 });
  });

  it('handles free-form address input without coordinates', async () => {
    const result = await resolveVenueAndLocationForCreate({
      eventType: 'physical', venueName: 'Free Venue',
      city: 'Da Nang', location: { address: '123 Main St' },
    });
    expect(result.venueName).toBe('Free Venue');
    expect(result.city).toBe('Da Nang');
    expect(result.location).toEqual({ address: '123 Main St' });
    expect(result.venueId).toBeNull();
  });

  it('handles free-form input with valid coordinates and computes geohash', async () => {
    geofire.geohashForLocation.mockReturnValue('freeloc');
    const result = await resolveVenueAndLocationForCreate({
      eventType: 'physical', venueName: 'Coords Venue',
      location: { latitude: 16.06, longitude: 108.22, address: '456 St' },
    });
    expect(result.venueName).toBe('Coords Venue');
    expect(result.location).toEqual({ latitude: 16.06, longitude: 108.22, address: '456 St' });
    expect(result.geohash).toBe('freeloc');
    expect(result.venueId).toBeNull();
  });

  it('throws BadRequestError when physical event has no venue info', async () => {
    await expect(resolveVenueAndLocationForCreate({ eventType: 'physical' })).rejects.toThrow(BadRequestError);
  });

  it('throws BadRequestError when online event has no onlineUrl', async () => {
    await expect(resolveVenueAndLocationForCreate({ eventType: 'online' })).rejects.toThrow(BadRequestError);
  });

  it('returns online venue data when onlineUrl is provided', async () => {
    const result = await resolveVenueAndLocationForCreate({ eventType: 'online', onlineUrl: 'https://zoom.us/j/123' });
    expect(result.location).toBeNull();
    expect(result.geohash).toBeNull();
    expect(result.venueName).toBe('Online');
    expect(result.city).toBe('Online');
    expect(result.venueId).toBeNull();
    expect(result.onlineUrl).toBe('https://zoom.us/j/123');
  });

  it('computes geohash in post-processing when catalog venue has coords', async () => {
    geofire.geohashForLocation.mockReturnValue('postgh');
    const venue = { name: 'Hall', location: { latitude: 11, longitude: 22 } };
    venueRepository.getVenueRawById.mockResolvedValue({ exists: true, data: venue });
    const result = await resolveVenueAndLocationForCreate({ venueId: 'v1', eventType: 'physical' });
    expect(result.geohash).toBe('postgh');
  });

  it('uses lat/lng fallback in post-processing geohash', async () => {
    geofire.geohashForLocation.mockReturnValue('lggh');
    const venue = { name: 'Hall', location: { lat: 30, lng: 40 } };
    venueRepository.getVenueRawById.mockResolvedValue({ exists: true, data: venue });
    const result = await resolveVenueAndLocationForCreate({ venueId: 'v1', eventType: 'physical' });
    expect(result.geohash).toBe('lggh');
  });
});

describe('resolveVenueAndLocationForUpdate', () => {
  it('updates geohash, venueName, city, location from catalog venue', async () => {
    geofire.geohashForLocation.mockReturnValue('updgh');
    const venue = { name: 'Updated Hall', addressDetails: { city: 'HCMC' }, location: { latitude: 10.78, longitude: 106.70 } };
    venueRepository.getVenueRawById.mockResolvedValue({ exists: true, data: venue });
    const payload = {};
    await resolveVenueAndLocationForUpdate({ venueId: 'v1', location: { latitude: 10.78, longitude: 106.70 } }, payload);
    expect(payload.venueName).toBe('Updated Hall');
    expect(payload.city).toBe('HCMC');
    expect(payload.location).toEqual({ latitude: 10.78, longitude: 106.70 });
    expect(payload.geohash).toBe('updgh');
  });

  it('clears venue fields when venueId is null', async () => {
    const payload = { existing: 'keep' };
    await resolveVenueAndLocationForUpdate({ venueId: null }, payload);
    expect(payload).toEqual({ existing: 'keep', venueName: null, city: null, location: null, geohash: null });
  });

  it('sets geohash from existing location when no venueId', async () => {
    geofire.geohashForLocation.mockReturnValue('exgh');
    const payload = {};
    await resolveVenueAndLocationForUpdate({ location: { latitude: 16, longitude: 108 } }, payload);
    expect(payload.geohash).toBe('exgh');
  });

  it('sets location and geohash for free-form coordinates', async () => {
    geofire.geohashForLocation.mockReturnValue('ffgh');
    const payload = {};
    await resolveVenueAndLocationForUpdate({ venueName: 'Free Form', city: 'Dalat', location: { latitude: 11.94, longitude: 108.44 } }, payload);
    expect(payload.venueName).toBe('Free Form');
    expect(payload.city).toBe('Dalat');
    expect(payload.location).toEqual({ latitude: 11.94, longitude: 108.44 });
    expect(payload.geohash).toBe('ffgh');
  });

  it('sets location as-is when coords are invalid in free-form', async () => {
    const payload = {};
    await resolveVenueAndLocationForUpdate({ venueName: 'No Coords', location: { address: 'Somewhere' } }, payload);
    expect(payload.venueName).toBe('No Coords');
    expect(payload.location).toEqual({ address: 'Somewhere' });
    expect(payload.geohash).toBeUndefined();
  });

  it('transforms to online venue when eventType is online', async () => {
    const payload = {};
    await resolveVenueAndLocationForUpdate({ eventType: 'online' }, payload);
    expect(payload.location).toBeNull();
    expect(payload.geohash).toBeNull();
    expect(payload.venueId).toBeNull();
    expect(payload.venueName).toBe('Online');
    expect(payload.city).toBe('Online');
  });

  it('does not crash when catalog venue does not exist', async () => {
    venueRepository.getVenueRawById.mockResolvedValue({ exists: false });
    const payload = {};
    await resolveVenueAndLocationForUpdate({ venueId: 'missing' }, payload);
    expect(payload.venueName).toBeUndefined();
  });
});

// ================================================================
// weather.helper
// ================================================================
describe('getEventWeather', () => {
  const withKey = 'test-api-key-123';

  afterEach(() => {
    delete process.env.OPENWEATHER_API_KEY;
  });

  describe('no API key', () => {
    let getEventWeather;

    beforeEach(() => {
      process.env.OPENWEATHER_API_KEY = '';
      jest.resetModules();
      getEventWeather = require('@/modules/events/application/helpers/weather.helper').getEventWeather;
    });

    it('returns null', async () => {
      expect(await getEventWeather('any_id')).toBeNull();
    });
  });

  describe('with API key', () => {
    let getEventWeather;
    let mockEventRepo;
    let mockAxios;

    beforeEach(() => {
      process.env.OPENWEATHER_API_KEY = withKey;
      jest.resetModules();
      getEventWeather = require('@/modules/events/application/helpers/weather.helper').getEventWeather;
      mockAxios = require('axios');
      mockEventRepo = require('@/providers/database/event.repository');
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, data: baseEvent() });
      mockAxios.get.mockResolvedValue({ data: { list: [] } });
    });

    it('throws NotFoundError when event not found', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: false });
      await expect(getEventWeather('evt_missing')).rejects.toThrow('Event not found');
    });

    it('returns null for online event', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, data: baseEvent({ eventType: 'online' }) });
      expect(await getEventWeather('evt_online')).toBeNull();
    });

    it('throws BadRequestError when location is missing', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, data: baseEvent({ location: null }) });
      await expect(getEventWeather('evt_noloc')).rejects.toThrow('Event location is missing');
    });

    it('returns ended event message for past dates', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, data: baseEvent({ date: BASE_TIME - 10 * DAY_MS }) });
      const result = await getEventWeather('evt_past');
      expect(result).toEqual({ description: 'Sự kiện đã kết thúc' });
    });

    it('returns forecast unavailable for dates >5 days away', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, data: baseEvent({ date: BASE_TIME + 100 * DAY_MS }) });
      const result = await getEventWeather('evt_far');
      expect(result).toEqual({ description: 'Dự báo chỉ khả dụng trước sự kiện 5 ngày' });
    });

    it('returns null for empty forecast response', async () => {
      const result = await getEventWeather('evt_empty');
      expect(result).toBeNull();
    });

    it('returns formatted weather with nearest forecast', async () => {
      const eventDate = BASE_TIME + 3 * DAY_MS;
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, data: baseEvent({ date: eventDate }) });
      const targetTs = Math.floor(eventDate / 1000);
      const forecasts = [
        { dt: targetTs - 400, main: { temp: 25, humidity: 70 }, weather: [{ main: 'Clear', description: 'trời quang', icon: '01d' }], wind: { speed: 3.5 } },
        { dt: targetTs - 100, main: { temp: 24, humidity: 75 }, weather: [{ main: 'Clouds', description: 'có mây', icon: '02d' }], wind: { speed: 4.0 } },
        { dt: targetTs + 600, main: { temp: 23, humidity: 80 }, weather: [{ main: 'Rain', description: 'mưa nhẹ', icon: '10d' }], wind: { speed: 5.0 } },
      ];
      mockAxios.get.mockResolvedValue({ data: { list: forecasts } });
      const result = await getEventWeather('evt_fc');

      expect(result).toEqual({
        temperature: 24,
        condition: 'clouds',
        description: 'có mây',
        iconUrl: 'http://openweathermap.org/img/wn/02d@2x.png',
        humidity: 75,
        windSpeed: 4.0,
      });
    });

    it('returns null on API request failure after successful event fetch', async () => {
      mockEventRepo.getEventRawById.mockResolvedValue({ exists: true, data: baseEvent() });
      mockAxios.get.mockRejectedValue(new Error('Network error'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await getEventWeather('evt_fail');
      expect(result).toBeNull();
      console.error.mockRestore();
    });
  });
});

// ================================================================
// notification-sender
// ================================================================
describe('notification-sender', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  describe('notifyAttendeesAboutUpdate', () => {
    it('returns early when no tickets', async () => {
      ticketRepository.getAttendeeTicketsByEventId.mockResolvedValue([]);
      jest.spyOn(console, 'log').mockImplementation(() => {});
      await notifyAttendeesAboutUpdate('evt_1', 'Test Event');
      expect(ticketRepository.getAttendeeTicketsByEventId).toHaveBeenCalledWith('evt_1');
      expect(notifHelper.collectMessagingTargets).not.toHaveBeenCalled();
    });

    it('creates in-app notifications and sends push for tickets', async () => {
      ticketRepository.getAttendeeTicketsByEventId.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
      notifHelper.collectMessagingTargets.mockResolvedValue({ recipientIds: ['u1', 'u2'], tokens: ['tok1', 'tok2'] });
      notifHelper.buildPayloadData.mockReturnValue({ type: 'event_update', eventId: 'evt_1' });
      jest.spyOn(console, 'log').mockImplementation(() => {});
      await notifyAttendeesAboutUpdate('evt_1', 'Test Event');
      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationService.createNotification).toHaveBeenCalledWith('u1', expect.any(String), expect.any(String), 'update', 'evt_1');
      expect(notificationService.createNotification).toHaveBeenCalledWith('u2', expect.any(String), expect.any(String), 'update', 'evt_1');
      expect(fcmService.sendMulticast).toHaveBeenCalledWith(['tok1', 'tok2'], expect.any(String), expect.any(String), { type: 'event_update', eventId: 'evt_1' });
    });

    it('deduplicates recipients with same userId across tickets', async () => {
      ticketRepository.getAttendeeTicketsByEventId.mockResolvedValue([{ userId: 'u1' }, { userId: 'u1' }, { userId: 'u2' }]);
      notifHelper.collectMessagingTargets.mockResolvedValue({ recipientIds: ['u1', 'u2'], tokens: ['tok1'] });
      jest.spyOn(console, 'log').mockImplementation(() => {});
      await notifyAttendeesAboutUpdate('evt_1', 'Event');
      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('skips FCM when no tokens', async () => {
      ticketRepository.getAttendeeTicketsByEventId.mockResolvedValue([{ userId: 'u1' }]);
      notifHelper.collectMessagingTargets.mockResolvedValue({ recipientIds: ['u1'], tokens: [] });
      jest.spyOn(console, 'log').mockImplementation(() => {});
      await notifyAttendeesAboutUpdate('evt_1', 'Event');
      expect(fcmService.sendMulticast).not.toHaveBeenCalled();
    });

    it('swallows repository or notification failures', async () => {
      ticketRepository.getAttendeeTicketsByEventId.mockRejectedValue(new Error('DB down'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(notifyAttendeesAboutUpdate('evt_1', 'Event')).resolves.toBeUndefined();
    });
  });

  describe('notifyAttendeesAboutCancellation', () => {
    it('returns early when no tickets', async () => {
      ticketRepository.getAttendeeTicketsByEventId.mockResolvedValue([]);
      await notifyAttendeesAboutCancellation('evt_1', 'Cancel Event');
      expect(notifHelper.collectMessagingTargets).not.toHaveBeenCalled();
    });

    it('creates cancellation notifications and sends push', async () => {
      ticketRepository.getAttendeeTicketsByEventId.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
      notifHelper.collectMessagingTargets.mockResolvedValue({ recipientIds: ['u1', 'u2'], tokens: ['tok1'] });
      notifHelper.buildPayloadData.mockReturnValue({ type: 'event_cancelled', eventId: 'evt_1' });
      await notifyAttendeesAboutCancellation('evt_1', 'Cancel Event');
      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
      expect(fcmService.sendMulticast).toHaveBeenCalledWith(['tok1'], expect.any(String), expect.any(String), { type: 'event_cancelled', eventId: 'evt_1' });
    });

    it('swallows failures', async () => {
      ticketRepository.getAttendeeTicketsByEventId.mockRejectedValue(new Error('DB error'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(notifyAttendeesAboutCancellation('evt_1', 'Event')).resolves.toBeUndefined();
    });
  });
});
