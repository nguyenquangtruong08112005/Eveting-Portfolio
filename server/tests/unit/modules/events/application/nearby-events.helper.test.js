jest.mock('@/providers/database/event.repository', () => ({
  queryActivePublicEventsByGeoBounds: jest.fn(),
}));

const eventRepository = require('@/providers/database/event.repository');
const { findNearbyEvents } = require('@/modules/events/application/helpers/nearby-events.helper');

const makeEvent = (id, lat, lng, overrides = {}) => ({
  id,
  data: { location: { latitude: lat, longitude: lng }, name: `Event ${id}`, ...overrides },
});

describe('findNearbyEvents', () => {
  beforeEach(() => {
    eventRepository.queryActivePublicEventsByGeoBounds.mockReset();
  });

  it('returns empty pagination when no events nearby', async () => {
    eventRepository.queryActivePublicEventsByGeoBounds.mockResolvedValue([]);
    const result = await findNearbyEvents(10, 10, 5);
    expect(result.events).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('paginates results correctly', async () => {
    const events = Array.from({ length: 25 }, (_, i) => makeEvent(`evt_${i}`, 10.001 + i * 0.001, 10));
    eventRepository.queryActivePublicEventsByGeoBounds.mockResolvedValue(events);
    const result = await findNearbyEvents(10, 10, 500, 1, 10);
    expect(result.events).toHaveLength(10);
    expect(result.pagination.totalItems).toBe(25);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.limit).toBe(10);
  });

  it('expands radius when not enough results', async () => {
    const batch1 = [makeEvent('evt_1', 10.001, 10)];
    const batch2 = Array.from({ length: 10 }, (_, i) => makeEvent(`evt_${i + 2}`, 10.001 + (i + 1) * 0.0001, 10, {}));
    eventRepository.queryActivePublicEventsByGeoBounds
      .mockResolvedValueOnce(batch1)
      .mockResolvedValue(batch2);
    const result = await findNearbyEvents(10, 10, 1, 1, 10);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.pagination.actualRadiusKm).toBeGreaterThan(1);
  });

  it('caps radius at MAX_RADIUS_KM (500)', async () => {
    eventRepository.queryActivePublicEventsByGeoBounds.mockResolvedValue([]);
    const result = await findNearbyEvents(10, 10, 500, 1, 10);
    expect(result.pagination.actualRadiusKm).toBe(500);
  });

  it('deduplicates events by id', async () => {
    const dupes = [makeEvent('evt_1', 10.001, 10), makeEvent('evt_1', 10.001, 10)];
    eventRepository.queryActivePublicEventsByGeoBounds.mockResolvedValue(dupes);
    const result = await findNearbyEvents(10, 10, 500);
    expect(result.events).toHaveLength(1);
  });

  it('filters out events outside the current radius', async () => {
    const farEvent = makeEvent('evt_far', 20, 20);
    eventRepository.queryActivePublicEventsByGeoBounds.mockResolvedValue([farEvent]);
    const result = await findNearbyEvents(10, 10, 1);
    expect(result.events).toHaveLength(0);
  });

  it('filters out events with missing location', async () => {
    const noLoc = { id: 'evt_noloc', data: {} };
    eventRepository.queryActivePublicEventsByGeoBounds.mockResolvedValue([noLoc]);
    const result = await findNearbyEvents(10, 10, 500);
    expect(result.events).toHaveLength(0);
  });

  it('returns pagination metadata with second page', async () => {
    const events = Array.from({ length: 15 }, (_, i) => makeEvent(`evt_${i}`, 10.001 + i * 0.001, 10));
    eventRepository.queryActivePublicEventsByGeoBounds.mockResolvedValue(events);
    const result = await findNearbyEvents(10, 10, 500, 2, 10);
    expect(result.events).toHaveLength(5);
    expect(result.pagination.currentPage).toBe(2);
  });
});
