/* eslint-env jest */

const mockVenueRepo = {
  getAllVenues: jest.fn(),
  getVenueById: jest.fn(),
  createVenue: jest.fn(),
  updateVenue: jest.fn(),
  deleteVenue: jest.fn(),
};

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));
jest.mock('@/providers/database/venue.repository', () => mockVenueRepo);

let service;
beforeAll(() => { service = require('@/modules/venues/application/service'); });

beforeEach(() => { jest.clearAllMocks(); });

describe('getAllVenues', () => {
  it('returns venues from repository', async () => {
    const venues = [{ id: 'venue_1', name: 'V1' }];
    mockVenueRepo.getAllVenues.mockResolvedValue(venues);
    expect(await service.getAllVenues()).toBe(venues);
  });

  it('returns empty array', async () => {
    mockVenueRepo.getAllVenues.mockResolvedValue([]);
    expect(await service.getAllVenues()).toEqual([]);
  });
});

describe('getVenueById', () => {
  it('returns venue when found', async () => {
    const venue = { id: 'venue_1', name: 'V1' };
    mockVenueRepo.getVenueById.mockResolvedValue(venue);
    expect(await service.getVenueById('venue_1')).toBe(venue);
  });

  it('returns null when not found', async () => {
    mockVenueRepo.getVenueById.mockResolvedValue(null);
    expect(await service.getVenueById('nonexistent')).toBeNull();
  });
});

describe('createVenue', () => {
  it('creates venue with generated id and default country VN', async () => {
    const venueData = { name: 'Test Venue', address: '123 St', city: 'HCM', district: 'D1' };
    mockVenueRepo.createVenue.mockResolvedValue(undefined);
    const result = await service.createVenue(venueData);
    expect(mockVenueRepo.createVenue).toHaveBeenCalledWith(
      'venue_fixed-uuid',
      expect.objectContaining({ id: 'venue_fixed-uuid', name: 'Test Venue', country: 'VN' })
    );
    expect(result.id).toBe('venue_fixed-uuid');
  });

  it('extracts lat/lng from top-level lat/lng fields', async () => {
    mockVenueRepo.createVenue.mockResolvedValue(undefined);
    const result = await service.createVenue({ name: 'V', lat: 10.5, lng: 106.5 });
    expect(result.lat).toBe(10.5);
    expect(result.lng).toBe(106.5);
    expect(result.location).toEqual({ latitude: 10.5, longitude: 106.5 });
  });

  it('extracts lat/lng from location.latitude / location.longitude', async () => {
    mockVenueRepo.createVenue.mockResolvedValue(undefined);
    const result = await service.createVenue({ name: 'V', location: { latitude: 10.6, longitude: 106.6 } });
    expect(result.lat).toBe(10.6);
    expect(result.lng).toBe(106.6);
  });

  it('extracts lat/lng from location.lat / location.lng', async () => {
    mockVenueRepo.createVenue.mockResolvedValue(undefined);
    const result = await service.createVenue({ name: 'V', location: { lat: 10.7, lng: 106.7 } });
    expect(result.lat).toBe(10.7);
    expect(result.lng).toBe(106.7);
  });

  it('favors top-level lat/lng over location object', async () => {
    mockVenueRepo.createVenue.mockResolvedValue(undefined);
    const result = await service.createVenue({ name: 'V', lat: 1, lng: 2, location: { latitude: 10, longitude: 20 } });
    expect(result.lat).toBe(1);
    expect(result.lng).toBe(2);
  });

  it('sets lat/lng to null when not provided', async () => {
    mockVenueRepo.createVenue.mockResolvedValue(undefined);
    const result = await service.createVenue({ name: 'V' });
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.location).toBeNull();
  });

  it('defaults name and address to empty string', async () => {
    mockVenueRepo.createVenue.mockResolvedValue(undefined);
    const result = await service.createVenue({});
    expect(result.name).toBe('');
    expect(result.address).toBe('');
  });

  it('includes seatMapTemplate when provided', async () => {
    const template = { totalSeats: 100, layout: [] };
    mockVenueRepo.createVenue.mockResolvedValue(undefined);
    const result = await service.createVenue({ name: 'V', seatMapTemplate: template });
    expect(result.seatMapTemplate).toBe(template);
  });
});

describe('updateVenue', () => {
  it('throws 404 when venue not found', async () => {
    mockVenueRepo.getVenueById.mockResolvedValue(null);
    await expect(service.updateVenue('nonexistent', {})).rejects.toMatchObject({
      message: 'Venue not found.',
      statusCode: 404,
    });
    expect(mockVenueRepo.updateVenue).not.toHaveBeenCalled();
  });

  it('updates and returns venue when found', async () => {
    const existing = { id: 'venue_1', name: 'Old', address: '123 St' };
    const updated = { id: 'venue_1', name: 'New', address: '123 St' };
    mockVenueRepo.getVenueById.mockResolvedValue(existing);
    mockVenueRepo.updateVenue.mockResolvedValue(updated);
    const result = await service.updateVenue('venue_1', { name: 'New' });
    expect(mockVenueRepo.updateVenue).toHaveBeenCalledWith('venue_1', expect.objectContaining({ name: 'New' }));
    expect(result).toBe(updated);
  });

  it('constructs location in patch when lat/lng provided', async () => {
    const existing = { id: 'venue_1', name: 'V' };
    mockVenueRepo.getVenueById.mockResolvedValue(existing);
    mockVenueRepo.updateVenue.mockResolvedValue({ ...existing, lat: 10.5, lng: 106.5 });
    await service.updateVenue('venue_1', { lat: 10.5, lng: 106.5 });
    expect(mockVenueRepo.updateVenue).toHaveBeenCalledWith('venue_1', expect.objectContaining({
      location: { latitude: 10.5, longitude: 106.5 },
    }));
  });

  it('does not include location in patch when only one coordinate provided', async () => {
    const existing = { id: 'venue_1', name: 'V' };
    mockVenueRepo.getVenueById.mockResolvedValue(existing);
    mockVenueRepo.updateVenue.mockResolvedValue({ ...existing, lat: 10.5 });
    await service.updateVenue('venue_1', { lat: 10.5 });
    expect(mockVenueRepo.updateVenue).toHaveBeenCalledWith('venue_1', expect.not.objectContaining({
      location: expect.anything(),
    }));
  });

  it('extracts lat/lng from location object in update', async () => {
    const existing = { id: 'venue_1', name: 'V' };
    mockVenueRepo.getVenueById.mockResolvedValue(existing);
    mockVenueRepo.updateVenue.mockResolvedValue({ ...existing, lat: 10.5, lng: 106.5 });
    await service.updateVenue('venue_1', { location: { latitude: 10.5, longitude: 106.5 } });
    expect(mockVenueRepo.updateVenue).toHaveBeenCalledWith('venue_1', expect.objectContaining({
      location: { latitude: 10.5, longitude: 106.5 },
    }));
  });
});

describe('deleteVenue', () => {
  it('throws 404 when venue not found', async () => {
    mockVenueRepo.getVenueById.mockResolvedValue(null);
    await expect(service.deleteVenue('nonexistent')).rejects.toMatchObject({
      message: 'Venue not found.',
      statusCode: 404,
    });
    expect(mockVenueRepo.deleteVenue).not.toHaveBeenCalled();
  });

  it('deletes venue and returns success', async () => {
    mockVenueRepo.getVenueById.mockResolvedValue({ id: 'venue_1' });
    const result = await service.deleteVenue('venue_1');
    expect(mockVenueRepo.deleteVenue).toHaveBeenCalledWith('venue_1');
    expect(result).toEqual({ success: true });
  });
});
