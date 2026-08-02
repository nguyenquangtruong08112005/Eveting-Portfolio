'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockTicketService = {
  getTicketsByUserId: jest.fn(),
  bookTicket: jest.fn(),
  getTicketDetailsById: jest.fn(),
  holdSeat: jest.fn(),
  releaseSeat: jest.fn(),
  bookHeldSeats: jest.fn(),
  getSeatsWithStatuses: jest.fn(),
  bookOrderAtomic: jest.fn(),
  createCheckout: jest.fn(),
  submitOrderAttendees: jest.fn(),
  getPerformanceSeatAvailability: jest.fn(),
  holdPerformanceSeats: jest.fn(),
  releasePerformanceSeatHold: jest.fn(),
};

jest.mock('@/modules/tickets/application/service', () => mockTicketService);

const {
  getCurrentUserTickets, bookTicket, getTicketDetails,
  holdSeat, releaseSeat, bookHeldSeats, getSeatsWithStatuses,
  bookOrderAtomic, createCheckout, submitOrderAttendees,
  getPerformanceSeatAvailability, holdPerformanceSeats,
  releasePerformanceSeatHold,
} = require('@/modules/tickets/api/controller');

const uid = 'user_001';
const eventId = 'evt_001';
const ticketId = 'tkt_001';
const orderId = 'ord_001';

function mockReq(overrides = {}) {
  return {
    user: { uid },
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

describe('getCurrentUserTickets', () => {
  it('calls service with userId and default pagination', async () => {
    const result = { tickets: [], pagination: { currentPage: 1, limit: 10, totalItems: 0 } };
    mockTicketService.getTicketsByUserId.mockResolvedValue(result);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getCurrentUserTickets(req, res, next);
    expect(mockTicketService.getTicketsByUserId).toHaveBeenCalledWith(uid, 1, 10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(next).not.toHaveBeenCalled();
  });

  it('parses page and limit from query', async () => {
    mockTicketService.getTicketsByUserId.mockResolvedValue({ tickets: [] });
    const req = mockReq({ query: { page: '3', limit: '5' } });
    const res = mockRes();
    const next = jest.fn();
    await getCurrentUserTickets(req, res, next);
    expect(mockTicketService.getTicketsByUserId).toHaveBeenCalledWith(uid, 3, 5);
  });

  it('falls back to defaults on NaN', async () => {
    mockTicketService.getTicketsByUserId.mockResolvedValue({ tickets: [] });
    const req = mockReq({ query: { page: 'abc', limit: 'xyz' } });
    const res = mockRes();
    const next = jest.fn();
    await getCurrentUserTickets(req, res, next);
    expect(mockTicketService.getTicketsByUserId).toHaveBeenCalledWith(uid, 1, 10);
  });

  it('propagates service error', async () => {
    const err = new Error('db fail');
    mockTicketService.getTicketsByUserId.mockRejectedValue(err);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getCurrentUserTickets(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('bookTicket', () => {
  it('books ticket and returns 201', async () => {
    const newTicket = { id: ticketId, status: 'pending' };
    mockTicketService.bookTicket.mockResolvedValue(newTicket);
    const req = mockReq({ body: { eventId, ticketType: 'vip', promoCode: 'SAVE10', quantity: 2 } });
    const res = mockRes();
    const next = jest.fn();
    await bookTicket(req, res, next);
    expect(mockTicketService.bookTicket).toHaveBeenCalledWith(uid, eventId, 'vip', 2, 'SAVE10');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newTicket);
  });

  it('defaults quantity to 1 when not provided', async () => {
    mockTicketService.bookTicket.mockResolvedValue({ id: ticketId });
    const req = mockReq({ body: { eventId, ticketType: 'standard' } });
    const res = mockRes();
    const next = jest.fn();
    await bookTicket(req, res, next);
    expect(mockTicketService.bookTicket).toHaveBeenCalledWith(uid, eventId, 'standard', 1, undefined);
  });

  it('propagates service error', async () => {
    const err = new Error('not enough tickets');
    mockTicketService.bookTicket.mockRejectedValue(err);
    const req = mockReq({ body: { eventId, ticketType: 'vip', quantity: 100 } });
    const res = mockRes();
    const next = jest.fn();
    await bookTicket(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('getTicketDetails', () => {
  it('returns ticket details with 200', async () => {
    const details = { id: ticketId, eventId, status: 'paid' };
    mockTicketService.getTicketDetailsById.mockResolvedValue(details);
    const req = mockReq({ params: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await getTicketDetails(req, res, next);
    expect(mockTicketService.getTicketDetailsById).toHaveBeenCalledWith(ticketId, uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(details);
  });

  it('propagates service error', async () => {
    const err = new Error('not found');
    mockTicketService.getTicketDetailsById.mockRejectedValue(err);
    const req = mockReq({ params: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await getTicketDetails(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('holdSeat', () => {
  it('holds seat and returns 200', async () => {
    const result = { success: true, eventId, seatId: 'seat_1', expiresAt: 123456789 };
    mockTicketService.holdSeat.mockResolvedValue(result);
    const req = mockReq({ body: { eventId, seatId: 'seat_1' } });
    const res = mockRes();
    const next = jest.fn();
    await holdSeat(req, res, next);
    expect(mockTicketService.holdSeat).toHaveBeenCalledWith(uid, eventId, 'seat_1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('releaseSeat', () => {
  it('releases seat and returns 200', async () => {
    const result = { success: true, eventId, seatId: 'seat_1' };
    mockTicketService.releaseSeat.mockResolvedValue(result);
    const req = mockReq({ body: { eventId, seatId: 'seat_1' } });
    const res = mockRes();
    const next = jest.fn();
    await releaseSeat(req, res, next);
    expect(mockTicketService.releaseSeat).toHaveBeenCalledWith(uid, eventId, 'seat_1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('bookHeldSeats', () => {
  it('books held seats and returns 201', async () => {
    const result = { orderId, tickets: [{ id: ticketId }] };
    mockTicketService.bookHeldSeats.mockResolvedValue(result);
    const req = mockReq({ body: { eventId, seatIds: ['seat_1', 'seat_2'], promoCode: 'SAVE' } });
    const res = mockRes();
    const next = jest.fn();
    await bookHeldSeats(req, res, next);
    expect(mockTicketService.bookHeldSeats).toHaveBeenCalledWith(uid, eventId, ['seat_1', 'seat_2'], 'SAVE');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('passes undefined promoCode when not provided', async () => {
    mockTicketService.bookHeldSeats.mockResolvedValue({ orderId });
    const req = mockReq({ body: { eventId, seatIds: ['seat_1'] } });
    const res = mockRes();
    const next = jest.fn();
    await bookHeldSeats(req, res, next);
    expect(mockTicketService.bookHeldSeats).toHaveBeenCalledWith(uid, eventId, ['seat_1'], undefined);
  });
});

describe('getSeatsWithStatuses', () => {
  it('returns seats with 200', async () => {
    const seats = [{ id: 'seat_1', status: 'available' }];
    mockTicketService.getSeatsWithStatuses.mockResolvedValue(seats);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getSeatsWithStatuses(req, res, next);
    expect(mockTicketService.getSeatsWithStatuses).toHaveBeenCalledWith(eventId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(seats);
  });
});

describe('bookOrderAtomic', () => {
  it('books order atomically and returns 201', async () => {
    const result = { orderId, tickets: [{ id: ticketId }] };
    mockTicketService.bookOrderAtomic.mockResolvedValue(result);
    const req = mockReq({ body: { eventId, items: [{ ticketType: 'vip', quantity: 2 }], promoCode: 'SAVE' } });
    const res = mockRes();
    const next = jest.fn();
    await bookOrderAtomic(req, res, next);
    expect(mockTicketService.bookOrderAtomic).toHaveBeenCalledWith(uid, eventId, [{ ticketType: 'vip', quantity: 2 }], 'SAVE');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('passes null promoCode when not provided', async () => {
    mockTicketService.bookOrderAtomic.mockResolvedValue({ orderId });
    const req = mockReq({ body: { eventId, items: [{ ticketType: 'standard', quantity: 1 }] } });
    const res = mockRes();
    const next = jest.fn();
    await bookOrderAtomic(req, res, next);
    expect(mockTicketService.bookOrderAtomic).toHaveBeenCalledWith(uid, eventId, [{ ticketType: 'standard', quantity: 1 }], undefined);
  });
});

describe('createCheckout', () => {
  it('creates checkout and returns 201', async () => {
    const checkout = { orderId, totalAmount: 200000, status: 'pending_payment' };
    mockTicketService.createCheckout.mockResolvedValue(checkout);
    const req = mockReq({ body: { eventId, items: [{ ticketType: 'vip', quantity: 2 }] } });
    const res = mockRes();
    const next = jest.fn();
    await createCheckout(req, res, next);
    expect(mockTicketService.createCheckout).toHaveBeenCalledWith(uid, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(checkout);
  });

  it('propagates service error', async () => {
    const err = new Error('validation failed');
    mockTicketService.createCheckout.mockRejectedValue(err);
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = jest.fn();
    await createCheckout(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('submitOrderAttendees', () => {
  it('submits attendees and returns 200', async () => {
    const result = { orderId, attendees: [{ name: 'John' }] };
    mockTicketService.submitOrderAttendees.mockResolvedValue(result);
    const req = mockReq({
      params: { orderId: 'ord_001' },
      body: { eventId, attendees: [{ name: 'John' }] },
    });
    const res = mockRes();
    const next = jest.fn();
    await submitOrderAttendees(req, res, next);
    expect(mockTicketService.submitOrderAttendees).toHaveBeenCalledWith(uid, eventId, 'ord_001', [{ name: 'John' }]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('getPerformanceSeatAvailability', () => {
  it('returns availability with performanceId', async () => {
    const availability = { seats: [] };
    mockTicketService.getPerformanceSeatAvailability.mockResolvedValue(availability);
    const req = mockReq({ params: { eventId }, query: { performanceId: 'perf_1' } });
    const res = mockRes();
    const next = jest.fn();
    await getPerformanceSeatAvailability(req, res, next);
    expect(mockTicketService.getPerformanceSeatAvailability).toHaveBeenCalledWith(eventId, 'perf_1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(availability);
  });

  it('defaults performanceId to null when not provided', async () => {
    mockTicketService.getPerformanceSeatAvailability.mockResolvedValue({ seats: [] });
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getPerformanceSeatAvailability(req, res, next);
    expect(mockTicketService.getPerformanceSeatAvailability).toHaveBeenCalledWith(eventId, null);
  });
});

describe('holdPerformanceSeats', () => {
  it('holds performance seats and returns 201', async () => {
    const result = { holdToken: 'tok_1', expiresAt: 123456789 };
    mockTicketService.holdPerformanceSeats.mockResolvedValue(result);
    const req = mockReq({
      params: { eventId },
      body: { performanceId: 'perf_1', seatIds: ['seat_1', 'seat_2'] },
    });
    const res = mockRes();
    const next = jest.fn();
    await holdPerformanceSeats(req, res, next);
    expect(mockTicketService.holdPerformanceSeats).toHaveBeenCalledWith(uid, eventId, 'perf_1', ['seat_1', 'seat_2']);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('releasePerformanceSeatHold', () => {
  it('releases hold and returns 200', async () => {
    const result = { success: true };
    mockTicketService.releasePerformanceSeatHold.mockResolvedValue(result);
    const req = mockReq({
      params: { eventId },
      body: { performanceId: 'perf_1', holdToken: 'tok_1', seatIds: ['seat_1'] },
    });
    const res = mockRes();
    const next = jest.fn();
    await releasePerformanceSeatHold(req, res, next);
    expect(mockTicketService.releasePerformanceSeatHold).toHaveBeenCalledWith(uid, eventId, 'perf_1', 'tok_1', ['seat_1']);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('passes null seatIds when not provided', async () => {
    mockTicketService.releasePerformanceSeatHold.mockResolvedValue({ success: true });
    const req = mockReq({
      params: { eventId },
      body: { performanceId: 'perf_1', holdToken: 'tok_1' },
    });
    const res = mockRes();
    const next = jest.fn();
    await releasePerformanceSeatHold(req, res, next);
    expect(mockTicketService.releasePerformanceSeatHold).toHaveBeenCalledWith(uid, eventId, 'perf_1', 'tok_1', null);
  });
});
