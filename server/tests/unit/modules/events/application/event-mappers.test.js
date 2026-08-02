jest.mock('@/providers/database/featuredProfile.repository', () => ({
  getFeaturedProfileNamesByIds: jest.fn(),
}));

const featuredProfileRepository = require('@/providers/database/featuredProfile.repository');
const {
  mapPublicTicketTypes,
  mapPublicVenue,
  buildElasticData,
} = require('@/modules/events/application/helpers/event-mappers');

describe('mapPublicTicketTypes', () => {
  it('returns {} for null/undefined', () => {
    expect(mapPublicTicketTypes(null)).toEqual({});
    expect(mapPublicTicketTypes(undefined)).toEqual({});
  });

  it('maps each type to only price field', () => {
    const types = { vip: { price: 100, name: 'VIP', qty: 50 }, regular: { price: 50, name: 'Regular' } };
    const result = mapPublicTicketTypes(types);
    expect(result).toEqual({ vip: { price: 100 }, regular: { price: 50 } });
  });
});

describe('mapPublicVenue', () => {
  it('returns null for null/undefined', () => {
    expect(mapPublicVenue(null)).toBeNull();
    expect(mapPublicVenue(undefined)).toBeNull();
  });

  it('strips seatMapTemplate from venue', () => {
    const venue = { id: 'v1', name: 'Hall', seatMapTemplate: { rows: 10 }, city: 'NYC' };
    expect(mapPublicVenue(venue)).toEqual({ id: 'v1', name: 'Hall', city: 'NYC' });
  });

  it('preserves venue when no seatMapTemplate', () => {
    const venue = { id: 'v1', name: 'Hall', city: 'NYC' };
    expect(mapPublicVenue(venue)).toEqual({ id: 'v1', name: 'Hall', city: 'NYC' });
  });
});

describe('buildElasticData', () => {
  beforeEach(() => {
    featuredProfileRepository.getFeaturedProfileNamesByIds.mockReset();
  });

  it('defaults all fields when eventData is minimal', async () => {
    const data = await buildElasticData({ id: 'evt_1' });
    expect(data.name).toBeNull();
    expect(data.description).toBeNull();
    expect(data.tags).toEqual([]);
    expect(data.category).toEqual([]);
    expect(data.minPrice).toBeNull();
    expect(data.featuredProfileIds).toEqual([]);
    expect(data.featuredProfileNames).toEqual([]);
    expect(data.status).toBeNull();
    expect(data.visibility).toBeNull();
  });

  it('maps provided fields', async () => {
    const eventData = {
      id: 'evt_1',
      name: 'Concert',
      description: 'Great show',
      tags: ['music'],
      city: 'NYC',
      category: ['concert'],
      minPrice: 50,
      date: 1700000000000,
      featuredProfileIds: ['fp1', 'fp2'],
      status: 'active',
      visibility: 'public',
      imageUrl: 'img.jpg',
      bannerUrl: 'banner.jpg',
      videoUrl: 'video.mp4',
      location: { lat: 10, lng: 20 },
      venueName: 'Hall',
      eventType: 'physical',
    };
    featuredProfileRepository.getFeaturedProfileNamesByIds.mockResolvedValue(['Profile1', 'Profile2']);
    const data = await buildElasticData(eventData);
    expect(data.name).toBe('Concert');
    expect(data.description).toBe('Great show');
    expect(data.tags).toEqual(['music']);
    expect(data.city).toBe('NYC');
    expect(data.category).toEqual(['concert']);
    expect(data.minPrice).toBe(50);
    expect(data.date).toBe(1700000000000);
    expect(data.featuredProfileIds).toEqual(['fp1', 'fp2']);
    expect(data.featuredProfileNames).toEqual(['Profile1', 'Profile2']);
    expect(data.status).toBe('active');
    expect(data.visibility).toBe('public');
    expect(data.imageUrl).toBe('img.jpg');
    expect(data.bannerUrl).toBe('banner.jpg');
    expect(data.videoUrl).toBe('video.mp4');
    expect(data.location).toEqual({ lat: 10, lng: 20 });
    expect(data.venueName).toBe('Hall');
    expect(data.eventType).toBe('physical');
  });

  it('handles repository error gracefully', async () => {
    const eventData = { id: 'evt_1', featuredProfileIds: ['fp1'] };
    featuredProfileRepository.getFeaturedProfileNamesByIds.mockRejectedValue(new Error('DB down'));
    const data = await buildElasticData(eventData);
    expect(data.featuredProfileNames).toEqual([]);
  });

  it('does not call repository when no featuredProfileIds', async () => {
    const eventData = { id: 'evt_1' };
    await buildElasticData(eventData);
    expect(featuredProfileRepository.getFeaturedProfileNamesByIds).not.toHaveBeenCalled();
  });

  it('converts undefined to null', async () => {
    const eventData = { id: 'evt_1', name: undefined, tags: undefined };
    const data = await buildElasticData(eventData);
    expect(data.name).toBeNull();
    expect(data.tags).toEqual([]);
  });
});
