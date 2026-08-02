'use strict';

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

const mockVenueService = {
  getAllVenues: jest.fn(),
  getVenueById: jest.fn(),
  createVenue: jest.fn(),
  updateVenue: jest.fn(),
  deleteVenue: jest.fn(),
};

jest.mock('@/modules/venues/application/service', () => mockVenueService);

const {
  getVenues, getVenueById, createVenue, updateVenue, deleteVenue,
} = require('@/modules/venues/api/controller');

const venueId = 'venue_001';

function mockReq(overrides = {}) {
  return {
    params: {},
    body: {},
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

describe('getVenues', () => {
  it('returns all venues with 200', async () => {
    const venues = [{ id: venueId, name: 'V1' }];
    mockVenueService.getAllVenues.mockResolvedValue(venues);
    const req = mockReq();
    const res = mockRes();

    await getVenues(req, res);

    expect(mockVenueService.getAllVenues).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(venues);
  });

  it('returns 500 on service error', async () => {
    mockVenueService.getAllVenues.mockRejectedValue(new Error('DB down'));
    const req = mockReq();
    const res = mockRes();

    await getVenues(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'DB down' });
  });
});

describe('getVenueById', () => {
  it('returns venue with 200 when found', async () => {
    const venue = { id: venueId, name: 'Venue' };
    mockVenueService.getVenueById.mockResolvedValue(venue);
    const req = mockReq({ params: { id: venueId } });
    const res = mockRes();

    await getVenueById(req, res);

    expect(mockVenueService.getVenueById).toHaveBeenCalledWith(venueId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(venue);
  });

  it('returns 404 when venue not found', async () => {
    mockVenueService.getVenueById.mockResolvedValue(null);
    const req = mockReq({ params: { id: venueId } });
    const res = mockRes();

    await getVenueById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ error: 'Venue not found.' });
  });

  it('returns error statusCode when service throws', async () => {
    const err = new Error('Not found');
    err.statusCode = 404;
    mockVenueService.getVenueById.mockRejectedValue(err);
    const req = mockReq({ params: { id: venueId } });
    const res = mockRes();

    await getVenueById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ error: 'Not found' });
  });

  it('defaults to 500 when error has no statusCode', async () => {
    mockVenueService.getVenueById.mockRejectedValue(new Error('Generic'));
    const req = mockReq({ params: { id: venueId } });
    const res = mockRes();

    await getVenueById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'Generic' });
  });
});

describe('createVenue', () => {
  it('returns 400 when name missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();

    await createVenue(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Venue name is required.' });
    expect(mockVenueService.createVenue).not.toHaveBeenCalled();
  });

  it('creates venue and returns 201', async () => {
    const newVenue = { id: venueId, name: 'New' };
    mockVenueService.createVenue.mockResolvedValue(newVenue);
    const req = mockReq({ body: { name: 'New', address: '123 St' } });
    const res = mockRes();

    await createVenue(req, res);

    expect(mockVenueService.createVenue).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newVenue);
  });

  it('returns 500 on service error', async () => {
    mockVenueService.createVenue.mockRejectedValue(new Error('DB error'));
    const req = mockReq({ body: { name: 'New' } });
    const res = mockRes();

    await createVenue(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'DB error' });
  });
});

describe('updateVenue', () => {
  it('updates and returns 200', async () => {
    const updated = { id: venueId, name: 'Updated' };
    mockVenueService.updateVenue.mockResolvedValue(updated);
    const req = mockReq({ params: { id: venueId }, body: { name: 'Updated' } });
    const res = mockRes();

    await updateVenue(req, res);

    expect(mockVenueService.updateVenue).toHaveBeenCalledWith(venueId, req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('passes empty object when body missing', async () => {
    mockVenueService.updateVenue.mockResolvedValue({ id: venueId });
    const req = mockReq({ params: { id: venueId } });
    const res = mockRes();

    await updateVenue(req, res);

    expect(mockVenueService.updateVenue).toHaveBeenCalledWith(venueId, {});
  });

  it('returns error statusCode from service error', async () => {
    const err = new Error('Not found');
    err.statusCode = 404;
    mockVenueService.updateVenue.mockRejectedValue(err);
    const req = mockReq({ params: { id: venueId }, body: {} });
    const res = mockRes();

    await updateVenue(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ error: 'Not found' });
  });

  it('defaults to 500 when error has no statusCode', async () => {
    mockVenueService.updateVenue.mockRejectedValue(new Error('Generic'));
    const req = mockReq({ params: { id: venueId }, body: {} });
    const res = mockRes();

    await updateVenue(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'Generic' });
  });
});

describe('deleteVenue', () => {
  it('deletes and returns 204', async () => {
    mockVenueService.deleteVenue.mockResolvedValue({ success: true });
    const req = mockReq({ params: { id: venueId } });
    const res = mockRes();

    await deleteVenue(req, res);

    expect(mockVenueService.deleteVenue).toHaveBeenCalledWith(venueId);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });

  it('returns error statusCode from service error', async () => {
    const err = new Error('Not found');
    err.statusCode = 404;
    mockVenueService.deleteVenue.mockRejectedValue(err);
    const req = mockReq({ params: { id: venueId } });
    const res = mockRes();

    await deleteVenue(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ error: 'Not found' });
  });

  it('defaults to 500 when error has no statusCode', async () => {
    mockVenueService.deleteVenue.mockRejectedValue(new Error('Generic'));
    const req = mockReq({ params: { id: venueId } });
    const res = mockRes();

    await deleteVenue(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: 'Generic' });
  });
});