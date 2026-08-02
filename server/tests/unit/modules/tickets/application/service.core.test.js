const mockTransaction = { query: jest.fn().mockResolvedValue({ rows: [] }) };

jest.mock('@/shared/cache/cache-provider', () => ({ set: jest.fn(), del: jest.fn() }));
jest.mock('@/shared/cache/namespace-helpers', () => ({ invalidateSeatAvailability: jest.fn() }));
jest.mock('@/shared/socket/socket-server', () => ({ getIo: jest.fn(() => null) }));
jest.mock('@/shared/errors', () => {
  class AppError extends Error {
    constructor(message, statusCode, code) { super(message); this.statusCode = statusCode; this.code = code; }
  }
  return {
    AppError,
    BadRequestError: class extends AppError { constructor(m = 'Bad Request') { super(m, 400, 'BAD_REQUEST'); } },
    NotFoundError: class extends AppError { constructor(m = 'Not Found') { super(m, 404, 'NOT_FOUND'); } },
    ConflictError: class extends AppError { constructor(m = 'Conflict') { super(m, 409, 'CONFLICT'); } },
    ForbiddenError: class extends AppError { constructor(m = 'Forbidden') { super(m, 403, 'FORBIDDEN'); } },
  };
});
jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('@/modules/orders/domain/order-status', () => ({
  ORDER_STATUS: { PENDING_PAYMENT: 'pending_payment', PAID: 'paid', CANCELLED: 'cancelled', EXPIRED: 'expired', FAILED: 'failed' },
  PAYMENT_STATUS: { PENDING: 'pending', PROCESSING: 'processing', SUCCEEDED: 'succeeded', FAILED: 'failed', CANCELLED: 'cancelled' },
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid') }));
jest.mock('@/providers/database/time.helper', () => ({ toDb: jest.fn(v => new Date(v)), fromDb: jest.fn() }));
jest.mock('@/providers/database/postgres.client', () => ({ query: jest.fn() }));
jest.mock('@/providers/database/ticket.repository', () => ({
  runTransaction: jest.fn(), getTicketById: jest.fn(), getTicketInTransaction: jest.fn(),
  createTicketInTransaction: jest.fn(), updateTicketInTransaction: jest.fn(),
  createTicket: jest.fn(), getTicketsByUserId: jest.fn(),
}));
jest.mock('@/providers/database/seat.repository', () => ({
  getSeatById: jest.fn(), getActiveHoldForSeat: jest.fn(), createSeatHold: jest.fn(),
  releaseSeatHold: jest.fn(), convertHoldToSold: jest.fn(), updateSeatStatus: jest.fn(),
  holdPerformanceSeats: jest.fn(), releasePerformanceSeatHold: jest.fn(),
  convertPerformanceSeatHoldToSold: jest.fn(),
  PERFORMANCE_SEAT_STATUSES: { AVAILABLE: 'AVAILABLE', HELD: 'HELD', SOLD: 'SOLD', BLOCKED: 'BLOCKED' },
}));
jest.mock('@/providers/database/event.repository', () => ({
  getEventInTransaction: jest.fn(), getEventById: jest.fn(), updateEventInTransaction: jest.fn(),
  incrementEventTicketTypeAvailableInTransaction: jest.fn(), getCustomQuestions: jest.fn(),
  getBuyerOrderInTransaction: jest.fn(), replaceOrderAttendeesInTransaction: jest.fn(),
}));
jest.mock('@/providers/database/order.repository', () => ({
  createOrderInTransaction: jest.fn(), createOrderItemInTransaction: jest.fn(),
  linkTicketToOrderInTransaction: jest.fn(), getOrderInTransaction: jest.fn(),
  getOrderItemsInTransaction: jest.fn(), getLatestPaymentAttemptByOrderId: jest.fn(),
  updatePaymentAttemptInTransaction: jest.fn(), updateOrderStatusInTransaction: jest.fn(),
  getOrganizerSettingsInTransaction: jest.fn(), createLedgerEntryInTransaction: jest.fn(),
  updateOrderTotalsInTransaction: jest.fn(), getTicketOrderLinkInTransaction: jest.fn(),
}));
jest.mock('@/providers/database/promotion.repository', () => ({
  findPromoByCodeInTransaction: jest.fn(), incrementPromotionUsedCountInTransaction: jest.fn(),
  decrementPromotionUsedCountInTransaction: jest.fn(),
}));
jest.mock('@/providers/database/analytics.repository', () => ({
  updateAnalyticsForConfirmPaymentInTransaction: jest.fn(),
}));
jest.mock('@/providers/database/membership.repository', () => ({
  getUserMembershipInTransaction: jest.fn(), logLoyaltyPointsEntryInTransaction: jest.fn(),
  getMembershipTiersInTransaction: jest.fn(), updateUserMembershipPointsAndTierInTransaction: jest.fn(),
}));
jest.mock('@/providers/database/venue.repository', () => ({ getVenueById: jest.fn() }));
jest.mock('@/modules/promotions/application/service', () => ({
  reserveDiscountInTransaction: jest.fn(), redeemReservedDiscountInTransaction: jest.fn(),
  releaseReservedDiscountInTransaction: jest.fn(),
}));
jest.mock('@/modules/tickets/application/helpers/promotion-validator.helper', () => ({ applyPromotion: jest.fn() }));
jest.mock('@/modules/tickets/application/helpers/qr-code.helper', () => ({ generateTicketQR: jest.fn(() => 'mock-qr-code') }));
jest.mock('@/modules/tickets/application/helpers/ticket-mappers', () => ({
  sortTicketsByPriorityAndDate: jest.fn(), buildPagination: jest.fn(() => ({ startIndex: 0, endIndex: 10, meta: {} })),
  mapTicketWithEvent: jest.fn(t => t), mapTicketDetailResponse: jest.fn(t => t),
}));
jest.mock('@/shared/events/event-publisher', () => ({ publish: jest.fn() }));
jest.mock('@/shared/events/outbox-processor', () => ({ triggerProcess: jest.fn() }));

const {
  holdSeat, releaseSeat, bookHeldSeats,
  holdPerformanceSeats, releasePerformanceSeatHold,
  createCheckout, confirmPaymentForOrderInTransaction,
  submitOrderAttendees, getTicketsByUserId, getTicketDetailsById,
  cancelPendingTicket, failTicketPayment, failOrderPayment,
  bookTicket, bookOrderAtomic,
} = require('@/modules/tickets/application/service');

const ticketRepository = require('@/providers/database/ticket.repository');
const seatRepository = require('@/providers/database/seat.repository');
const eventRepository = require('@/providers/database/event.repository');
const orderRepository = require('@/providers/database/order.repository');
const membershipRepository = require('@/providers/database/membership.repository');
const cacheProvider = require('@/shared/cache/cache-provider');
const cacheNamespace = require('@/shared/cache/namespace-helpers');
const { getIo } = require('@/shared/socket/socket-server');
const { toDb } = require('@/providers/database/time.helper');
const promotionValidator = require('@/modules/tickets/application/helpers/promotion-validator.helper');
const promotionService = require('@/modules/promotions/application/service');
const analyticsRepository = require('@/providers/database/analytics.repository');
const eventPublisher = require('@/shared/events/event-publisher');
const outboxProcessor = require('@/shared/events/outbox-processor');
const { ORDER_STATUS } = require('@/modules/orders/domain/order-status');
const promotionRepository = require('@/providers/database/promotion.repository');
const venueRepository = require('@/providers/database/venue.repository');

beforeEach(() => {
  jest.clearAllMocks();
  mockTransaction.query.mockReset();
  mockTransaction.query.mockResolvedValue({ rows: [] });
  ticketRepository.runTransaction.mockImplementation(cb => cb(mockTransaction));
});

const userId = 'user1';
const eventId = 'evt1';
const seatId = 'seat1';

const mockEvent = {
  id: eventId, name: 'Test Event', organizerId: 'org1',
  ticketTypes: [{ type: 'standard', id: 'standard', price: 100000, available: 100 }],
  messageForAttendee: '',
};
const mockSeat = { id: seatId, status: 'available' };
const mockHold = { id: 'hold1', userId, expiresAt: Date.now() + 600000, eventId, seatId, status: 'held' };

describe('holdSeat', () => {
  it('holds an available seat', async () => {
    seatRepository.getSeatById.mockResolvedValue(mockSeat);
    seatRepository.getActiveHoldForSeat.mockResolvedValue(null);
    mockTransaction.query.mockResolvedValue({ rows: [] });

    const result = await holdSeat(userId, eventId, seatId);

    expect(result.success).toBe(true);
    expect(result.eventId).toBe(eventId);
    expect(result.seatId).toBe(seatId);
    expect(result.expiresAt).toEqual(expect.any(Number));
    expect(seatRepository.createSeatHold).toHaveBeenCalledWith(
      expect.objectContaining({ eventId, seatId, userId, status: 'held' }),
      mockTransaction,
    );
    expect(cacheProvider.set).toHaveBeenCalled();
    expect(cacheNamespace.invalidateSeatAvailability).toHaveBeenCalledWith(eventId);
  });

  it('returns idempotent result when already held by same user', async () => {
    seatRepository.getSeatById.mockResolvedValue(mockSeat);
    seatRepository.getActiveHoldForSeat.mockResolvedValue(mockHold);

    const result = await holdSeat(userId, eventId, seatId);

    expect(result.success).toBe(true);
    expect(result.expiresAt).toBe(mockHold.expiresAt);
    expect(seatRepository.createSeatHold).not.toHaveBeenCalled();
  });

  it('throws ConflictError when another user holds the seat', async () => {
    seatRepository.getSeatById.mockResolvedValue(mockSeat);
    seatRepository.getActiveHoldForSeat.mockResolvedValue({ ...mockHold, userId: 'other-user' });

    await expect(holdSeat(userId, eventId, seatId)).rejects.toThrow('Seat is currently held by another user.');
  });

  it('throws ConflictError when seat is already sold', async () => {
    seatRepository.getSeatById.mockResolvedValue(mockSeat);
    seatRepository.getActiveHoldForSeat.mockResolvedValue(null);
    mockTransaction.query.mockResolvedValueOnce({ rows: [] }); // UPDATE expired holds
    mockTransaction.query.mockResolvedValueOnce({ rows: [{ id: 'tkt_1' }] }); // sold check

    await expect(holdSeat(userId, eventId, seatId)).rejects.toThrow('Seat is already sold.');
  });

  it('throws NotFoundError when seat does not exist', async () => {
    seatRepository.getSeatById.mockResolvedValue(null);

    await expect(holdSeat(userId, eventId, seatId)).rejects.toThrow('Seat not found.');
  });

  it('throws ConflictError when the seat is not available', async () => {
    seatRepository.getSeatById.mockResolvedValue({ id: seatId, status: 'sold' });

    await expect(holdSeat(userId, eventId, seatId)).rejects.toThrow('Seat is not available.');
  });

  it('releases expired holds before creating a new hold', async () => {
    seatRepository.getSeatById.mockResolvedValue(mockSeat);
    seatRepository.getActiveHoldForSeat.mockResolvedValue(null);
    mockTransaction.query.mockResolvedValue({ rows: [] });

    await holdSeat(userId, eventId, seatId);

    expect(mockTransaction.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE seat_holds'),
      [eventId, seatId, expect.any(Date)],
    );
  });

  it('throws when repository error propagates', async () => {
    seatRepository.getSeatById.mockRejectedValue(new Error('DB connection lost'));

    await expect(holdSeat(userId, eventId, seatId)).rejects.toThrow('DB connection lost');
  });
});

describe('releaseSeat', () => {
  it('releases a seat held by the user', async () => {
    seatRepository.getActiveHoldForSeat.mockResolvedValue(mockHold);

    const result = await releaseSeat(userId, eventId, seatId);

    expect(result).toEqual({ success: true, eventId, seatId });
    expect(seatRepository.releaseSeatHold).toHaveBeenCalledWith(mockHold.id, mockTransaction);
    expect(cacheProvider.del).toHaveBeenCalled();
    expect(cacheNamespace.invalidateSeatAvailability).toHaveBeenCalledWith(eventId);
  });

  it('returns success idempotently when no active hold exists', async () => {
    seatRepository.getActiveHoldForSeat.mockResolvedValue(null);

    const result = await releaseSeat(userId, eventId, seatId);

    expect(result).toEqual({ success: true, message: 'No active hold found.' });
    expect(seatRepository.releaseSeatHold).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when not the hold owner', async () => {
    seatRepository.getActiveHoldForSeat.mockResolvedValue({ ...mockHold, userId: 'other-user' });

    await expect(releaseSeat(userId, eventId, seatId)).rejects.toThrow('You do not own the hold on this seat.');
  });

  it('emits socket event when io is available', async () => {
    const mockIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    getIo.mockReturnValue(mockIo);
    seatRepository.getActiveHoldForSeat.mockResolvedValue(mockHold);

    await releaseSeat(userId, eventId, seatId);

    expect(mockIo.to).toHaveBeenCalledWith(`event_${eventId}`);
    expect(mockIo.emit).toHaveBeenCalledWith('seat:released', { eventId, seatId });
  });

  it('propagates repository error', async () => {
    seatRepository.getActiveHoldForSeat.mockResolvedValue(mockHold);
    seatRepository.releaseSeatHold.mockRejectedValue(new Error('DB timeout'));

    await expect(releaseSeat(userId, eventId, seatId)).rejects.toThrow('DB timeout');
  });
});

describe('bookHeldSeats', () => {
  beforeEach(() => {
    eventRepository.getEventInTransaction.mockResolvedValue(mockEvent);
    seatRepository.getSeatById.mockResolvedValue(mockSeat);
    membershipRepository.getUserMembershipInTransaction.mockResolvedValue(null);
  });

  it('books a single held seat successfully', async () => {
    seatRepository.getActiveHoldForSeat.mockResolvedValue(mockHold);

    const result = await bookHeldSeats(userId, eventId, [seatId]);

    expect(result.orderId).toEqual(expect.stringMatching(/^ord_/));
    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0].seat).toBe(seatId);
    expect(result.tickets[0].eventId).toBe(eventId);
    expect(seatRepository.convertHoldToSold).toHaveBeenCalledWith(mockHold.id, mockTransaction);
    expect(seatRepository.updateSeatStatus).toHaveBeenCalledWith(seatId, 'blocked', mockTransaction);
    expect(cacheProvider.del).toHaveBeenCalledWith(`hold:event:${eventId}:seat:${seatId}`);
    expect(orderRepository.createOrderInTransaction).toHaveBeenCalled();
  });

  it('books multiple held seats', async () => {
    const seat2 = 'seat2';
    seatRepository.getActiveHoldForSeat
      .mockResolvedValueOnce({ ...mockHold, seatId })
      .mockResolvedValueOnce({ ...mockHold, seatId: seat2, id: 'hold2' });
    seatRepository.getSeatById
      .mockResolvedValueOnce({ id: seatId, status: 'available' })
      .mockResolvedValueOnce({ id: seat2, status: 'available' });

    const result = await bookHeldSeats(userId, eventId, [seatId, seat2]);

    expect(result.tickets).toHaveLength(2);
    expect(result.tickets[0].seat).toBe(seatId);
    expect(result.tickets[1].seat).toBe(seat2);
    expect(cacheNamespace.invalidateSeatAvailability).toHaveBeenCalledWith(eventId);
  });

  it('throws BadRequestError for empty seatIds', async () => {
    await expect(bookHeldSeats(userId, eventId, [])).rejects.toThrow('At least one seatId is required.');
  });

  it('throws ConflictError when hold has expired', async () => {
    seatRepository.getActiveHoldForSeat.mockResolvedValue(null);

    await expect(bookHeldSeats(userId, eventId, [seatId])).rejects.toThrow('hold has expired or does not exist.');
  });

  it('throws ForbiddenError when not hold owner', async () => {
    seatRepository.getActiveHoldForSeat.mockResolvedValue({ ...mockHold, userId: 'other-user' });

    await expect(bookHeldSeats(userId, eventId, [seatId])).rejects.toThrow('You do not own the hold on seat');
  });

  it('throws NotFoundError when event not found', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue(null);

    await expect(bookHeldSeats(userId, eventId, [seatId])).rejects.toThrow('Event not found.');
  });

  it('throws ConflictError when seat is no longer available', async () => {
    seatRepository.getActiveHoldForSeat.mockResolvedValue(mockHold);
    seatRepository.getSeatById.mockResolvedValue({ id: seatId, status: 'sold' });

    await expect(bookHeldSeats(userId, eventId, [seatId])).rejects.toThrow('is no longer available');
  });
});

describe('holdPerformanceSeats', () => {
  const performanceId = 'perf1';

  it('holds performance seats successfully', async () => {
    const expiresAt = Date.now() + 600000;
    seatRepository.holdPerformanceSeats.mockResolvedValue({
      held: true,
      seats: [{ seatId, expiresAt }],
    });

    const result = await holdPerformanceSeats(userId, eventId, performanceId, [seatId]);

    expect(result.holdToken).toEqual(expect.stringMatching(/^seat_hold_/));
    expect(result.seatIds).toEqual([seatId]);
    expect(result.status).toBe('HELD');
    expect(seatRepository.holdPerformanceSeats).toHaveBeenCalledWith(
      expect.objectContaining({ userId, eventId, performanceId }),
      mockTransaction,
    );
    expect(cacheNamespace.invalidateSeatAvailability).toHaveBeenCalledWith(eventId);
  });

  it('throws AppError (SEAT_ALREADY_RESERVED) when hold fails', async () => {
    seatRepository.holdPerformanceSeats.mockResolvedValue({ held: false, seats: [] });

    await expect(
      holdPerformanceSeats(userId, eventId, performanceId, [seatId])
    ).rejects.toMatchObject({ statusCode: 409, code: 'SEAT_ALREADY_RESERVED' });
  });

  it('propagates BadRequestError for invalid seatIds', async () => {
    await expect(
      holdPerformanceSeats(userId, eventId, performanceId, [])
    ).rejects.toThrow('seatIds must contain between 1 and 10 seats.');
  });

  it('rejects duplicate seatIds before calling the repository', async () => {
    await expect(
      holdPerformanceSeats(userId, eventId, performanceId, ['seat1', 'seat1'])
    ).rejects.toThrow('seatIds must be unique non-empty values.');
    expect(seatRepository.holdPerformanceSeats).not.toHaveBeenCalled();
  });
});

describe('releasePerformanceSeatHold', () => {
  const performanceId = 'perf1';
  const holdToken = 'seat_hold_test-uuid';

  it('releases held performance seats successfully', async () => {
    seatRepository.releasePerformanceSeatHold.mockResolvedValue({ released: true, seatIds: [seatId] });

    const result = await releasePerformanceSeatHold(userId, eventId, performanceId, holdToken, [seatId]);

    expect(result.status).toBe('AVAILABLE');
    expect(result.seatIds).toEqual([seatId]);
    expect(seatRepository.releasePerformanceSeatHold).toHaveBeenCalledWith(
      expect.objectContaining({ userId, eventId, performanceId, holdToken }),
      mockTransaction,
    );
    expect(cacheNamespace.invalidateSeatAvailability).toHaveBeenCalledWith(eventId);
  });

  it('throws AppError when release fails', async () => {
    seatRepository.releasePerformanceSeatHold.mockResolvedValue({ released: false, seatIds: [] });

    await expect(
      releasePerformanceSeatHold(userId, eventId, performanceId, holdToken, [seatId])
    ).rejects.toThrow('One or more requested seats are already reserved.');
  });

  it('calls release without seatIds when parameter is null', async () => {
    seatRepository.releasePerformanceSeatHold.mockResolvedValue({ released: true, seatIds: [seatId] });

    await releasePerformanceSeatHold(userId, eventId, performanceId, holdToken, null);

    expect(seatRepository.releasePerformanceSeatHold).toHaveBeenCalledWith(
      expect.objectContaining({ seatIds: null }),
      mockTransaction,
    );
  });
});

describe('createCheckout', () => {
  const validPayload = {
    eventId,
    items: [{ ticketType: 'standard', quantity: 2 }],
  };
  const singlePayload = { eventId, items: [{ ticketType: 'standard', quantity: 1 }] };
  const customQuestions = [
    { id: 'q1', questionType: 'single_choice', isRequired: true, options: ['A', 'B'] },
    { id: 'q2', questionType: 'multi_choice', isRequired: false, options: ['X', 'Y'] },
  ];

  beforeEach(() => {
    eventRepository.getEventInTransaction.mockResolvedValue(mockEvent);
    eventRepository.getCustomQuestions.mockResolvedValue([]);
    orderRepository.createOrderInTransaction.mockResolvedValue('ord_test-uuid');
    orderRepository.createOrderItemInTransaction.mockResolvedValue();
    orderRepository.linkTicketToOrderInTransaction.mockResolvedValue();
    eventRepository.updateEventInTransaction.mockResolvedValue();
  });

  it('throws BadRequestError when eventId is missing', async () => {
    await expect(createCheckout(userId, { items: [{ ticketType: 'standard', quantity: 1 }] }))
      .rejects.toThrow('eventId and between 1 and 20 checkout items are required.');
  });

  it('throws BadRequestError for empty items', async () => {
    await expect(createCheckout(userId, { eventId, items: [] }))
      .rejects.toThrow('eventId and between 1 and 20 checkout items are required.');
  });

  it('throws BadRequestError for duplicate ticket types', async () => {
    await expect(createCheckout(userId, { eventId, items: [{ ticketType: 'standard', quantity: 1 }, { ticketType: 'standard', quantity: 2 }] }))
      .rejects.toThrow('Each checkout item needs a unique ticketType and positive integer quantity.');
  });

  it('throws BadRequestError for seatHold mismatched ticket quantity', async () => {
    await expect(createCheckout(userId, {
      ...validPayload,
      seatHold: { performanceId: 'perf1', holdToken: 'tok1', seatIds: ['seat1', 'seat2', 'seat3'] },
    })).rejects.toThrow('seatHold must match checkout ticket quantity.');
  });

  it('throws NotFoundError for non-existent event', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue(null);

    await expect(createCheckout(userId, validPayload)).rejects.toThrow('Event not found.');
  });

  it('throws NotFoundError for non-existent ticket type', async () => {
    await expect(createCheckout(userId, { ...validPayload, items: [{ ticketType: 'nonexistent', quantity: 1 }] }))
      .rejects.toThrow("Ticket type 'nonexistent' does not exist.");
  });

  it('throws ConflictError for insufficient inventory', async () => {
    await expect(createCheckout(userId, { ...validPayload, items: [{ ticketType: 'standard', quantity: 200 }] }))
      .rejects.toThrow("Not enough 'standard' tickets available.");
  });

  it('throws BadRequestError when both promoCode and voucherCode are provided', async () => {
    await expect(createCheckout(userId, { ...validPayload, promoCode: 'P10', voucherCode: 'V10' }))
      .rejects.toThrow('Only one promoCode or voucherCode may be applied.');
  });

  it('throws BadRequestError for a non-positive integer quantity', async () => {
    await expect(createCheckout(userId, { ...singlePayload, items: [{ ticketType: 'standard', quantity: 0 }] }))
      .rejects.toThrow('Each checkout item needs a unique ticketType and positive integer quantity.');
  });

  it('throws BadRequestError for a negative ticket price', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue({
      ...mockEvent,
      ticketTypes: [{ type: 'standard', id: 'standard', price: -1, available: 100 }],
    });

    await expect(createCheckout(userId, singlePayload))
      .rejects.toThrow("Ticket type 'standard' price must be an integer VND amount.");
  });

  it('throws BadRequestError when attendees length does not match ticket quantity', async () => {
    await expect(createCheckout(userId, {
      ...singlePayload,
      attendees: [{ name: 'A', answers: {} }, { name: 'B', answers: {} }],
    })).rejects.toThrow('attendees must contain exactly one entry per ticket.');
  });

  it('throws BadRequestError when an attendee is not an object', async () => {
    await expect(createCheckout(userId, { ...singlePayload, attendees: [null] }))
      .rejects.toThrow('attendees[0] must be an object.');
  });

  it('throws BadRequestError when attendee answers is not an object', async () => {
    await expect(createCheckout(userId, { ...singlePayload, attendees: [{ answers: [] }] }))
      .rejects.toThrow('attendees[0].answers must be keyed by question ID.');
  });

  it('throws BadRequestError for an unknown custom question', async () => {
    eventRepository.getCustomQuestions.mockResolvedValue(customQuestions);

    await expect(createCheckout(userId, { ...singlePayload, attendees: [{ answers: { q99: 'x' } }] }))
      .rejects.toThrow("Unknown custom question 'q99'.");
  });

  it('throws BadRequestError when a required question is left empty', async () => {
    eventRepository.getCustomQuestions.mockResolvedValue(customQuestions);

    await expect(createCheckout(userId, { ...singlePayload, attendees: [{ answers: {} }] }))
      .rejects.toThrow("Question 'q1' is required.");
  });

  it('throws BadRequestError for an invalid single_choice answer', async () => {
    eventRepository.getCustomQuestions.mockResolvedValue(customQuestions);

    await expect(createCheckout(userId, { ...singlePayload, attendees: [{ answers: { q1: 'Z' } }] }))
      .rejects.toThrow("Invalid answer for question 'q1'.");
  });

  it('throws BadRequestError for an invalid multi_choice answer', async () => {
    eventRepository.getCustomQuestions.mockResolvedValue(customQuestions);

    await expect(createCheckout(userId, { ...singlePayload, attendees: [{ answers: { q1: 'A', q2: ['X', 'ZZ'] } }] }))
      .rejects.toThrow("Invalid answer for question 'q2'.");
  });

  it('normalizes valid attendees during checkout', async () => {
    eventRepository.getCustomQuestions.mockResolvedValue(customQuestions);
    const expectedAttendee = { id: 'att_test-uuid', name: 'Alice', email: 'a@x.com', answers: { q1: 'A', q2: ['X'] } };

    const result = await createCheckout(userId, {
      ...singlePayload,
      attendees: [{ name: 'Alice', email: 'a@x.com', answers: { q1: 'A', q2: ['X'] } }],
    });

    expect(result.orderId).toBe('ord_test-uuid');
    expect(result.status).toBe(ORDER_STATUS.PENDING_PAYMENT);
    expect(result.tickets).toHaveLength(1);
    expect(eventRepository.replaceOrderAttendeesInTransaction).toHaveBeenCalledWith(
      mockTransaction, eventId, 'ord_test-uuid', [expectedAttendee], customQuestions,
    );
  });
});

describe('confirmPaymentForOrderInTransaction (seat hold path)', () => {
  const orderId = 'ord_test-uuid';
  const performanceId = 'perf1';
  const zpTransId = 'zp123';

  it('converts seat hold to sold and confirms tickets', async () => {
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [{ status: 'pending_payment' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }); // SAVEPOINT releases etc
    const orderData = {
      id: orderId, userId, eventId, status: 'pending_payment',
      organizerId: 'org1',
      rawData: { seatHold: { performanceId, holdToken: 'tok1', seatIds: ['seat1'] } },
    };
    orderRepository.getOrderInTransaction.mockResolvedValue(orderData);
    seatRepository.convertPerformanceSeatHoldToSold.mockResolvedValue({ converted: true });
    orderRepository.getOrderItemsInTransaction.mockResolvedValue([{ ticketId: 'tkt_1' }]);
    ticketRepository.getTicketInTransaction = jest.fn().mockResolvedValue({ id: 'tkt_1', eventId, status: 'pending', price: 50000, type: 'standard', userId });
    orderRepository.getLatestPaymentAttemptByOrderId.mockResolvedValue(null);
    analyticsRepository.updateAnalyticsForConfirmPaymentInTransaction.mockResolvedValue();
    membershipRepository.getUserMembershipInTransaction.mockResolvedValue(null);
    orderRepository.getOrganizerSettingsInTransaction.mockResolvedValue(null);
    promotionService.redeemReservedDiscountInTransaction.mockResolvedValue();
    eventPublisher.publish.mockResolvedValue();

    const result = await confirmPaymentForOrderInTransaction(mockTransaction, orderId, zpTransId);

    expect(result.orderId).toBe(orderId);
    expect(result.confirmedCount).toBe(1);
    expect(seatRepository.convertPerformanceSeatHoldToSold).toHaveBeenCalledWith(
      { userId, eventId, performanceId, holdToken: 'tok1', seatIds: ['seat1'] },
      mockTransaction,
    );
  });

  it('throws SEAT_ALREADY_RESERVED when hold conversion fails', async () => {
    mockTransaction.query
      .mockResolvedValueOnce({ rows: [{ status: 'pending_payment' }] })
      .mockResolvedValueOnce({ rows: [] });
    const orderData = {
      id: orderId, userId, eventId, status: 'pending_payment', organizerId: 'org1',
      rawData: { seatHold: { performanceId, holdToken: 'tok1', seatIds: ['seat1'] } },
    };
    orderRepository.getOrderInTransaction.mockResolvedValue(orderData);
    seatRepository.convertPerformanceSeatHoldToSold.mockResolvedValue({ converted: false });

    await expect(
      confirmPaymentForOrderInTransaction(mockTransaction, orderId, zpTransId)
    ).rejects.toThrow('One or more requested seats are already reserved.');
  });

  it('returns alreadyPaid when order is already paid', async () => {
    mockTransaction.query.mockResolvedValueOnce({ rows: [{ status: 'paid' }] });

    const result = await confirmPaymentForOrderInTransaction(mockTransaction, orderId, zpTransId);

    expect(result.alreadyPaid).toBe(true);
    expect(result.confirmedCount).toBe(0);
    expect(seatRepository.convertPerformanceSeatHoldToSold).not.toHaveBeenCalled();
  });
});

describe('submitOrderAttendees', () => {
  it('throws NotFoundError when the order does not exist', async () => {
    eventRepository.getBuyerOrderInTransaction.mockResolvedValue(null);

    await expect(submitOrderAttendees(userId, eventId, 'ord_test-uuid', []))
      .rejects.toThrow('Order not found.');
  });

  it('throws ConflictError when the order is not pending payment', async () => {
    eventRepository.getBuyerOrderInTransaction.mockResolvedValue({ status: ORDER_STATUS.PAID, ticket_quantity: '1' });

    await expect(submitOrderAttendees(userId, eventId, 'ord_test-uuid', [{ name: 'Alice', answers: {} }]))
      .rejects.toThrow('Attendee answers cannot be changed after payment.');
  });

  it('validates and replaces attendees for a pending order', async () => {
    eventRepository.getBuyerOrderInTransaction.mockResolvedValue({ status: ORDER_STATUS.PENDING_PAYMENT, ticket_quantity: '1' });
    eventRepository.getCustomQuestions.mockResolvedValue([]);

    const result = await submitOrderAttendees(userId, eventId, 'ord_test-uuid', [{ name: 'Alice', answers: {} }]);

    expect(result.orderId).toBe('ord_test-uuid');
    expect(result.attendees).toEqual([{ id: 'att_test-uuid', name: 'Alice', email: null, answers: {} }]);
    expect(eventRepository.replaceOrderAttendeesInTransaction).toHaveBeenCalledWith(
      mockTransaction, eventId, 'ord_test-uuid', result.attendees, [],
    );
  });
});

describe('getTicketsByUserId', () => {
  it('returns empty pagination when the user has no tickets', async () => {
    ticketRepository.getTicketsByUserId.mockResolvedValue([]);

    const result = await getTicketsByUserId(userId);

    expect(result.tickets).toEqual([]);
    expect(result.pagination).toEqual({ currentPage: 1, limit: 10, totalPages: 0, totalItems: 0 });
  });

  it('paginates and maps tickets with event details', async () => {
    ticketRepository.getTicketsByUserId.mockResolvedValue([{ id: 'tkt_1', eventId, userId, quantity: 2 }]);
    eventRepository.getEventById.mockResolvedValue(mockEvent);

    const result = await getTicketsByUserId(userId);

    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0].id).toBe('tkt_1');
    expect(result.tickets[0].qrCode).toBe('mock-qr-code');
    expect(eventRepository.getEventById).toHaveBeenCalledWith(eventId);
  });
});

describe('getTicketDetailsById', () => {
  const ticket = { id: 'tkt_1', eventId, userId, quantity: 1 };

  beforeEach(() => {
    ticketRepository.getTicketById.mockResolvedValue(ticket);
    eventRepository.getEventById.mockResolvedValue(mockEvent);
  });

  it('throws NotFoundError when the ticket does not exist', async () => {
    ticketRepository.getTicketById.mockResolvedValue(null);

    await expect(getTicketDetailsById('tkt_1', userId)).rejects.toThrow('Ticket not found.');
  });

  it('throws NotFoundError when the associated event is missing', async () => {
    eventRepository.getEventById.mockResolvedValue(null);

    await expect(getTicketDetailsById('tkt_1', userId)).rejects.toThrow('Associated event not found.');
  });

  it('throws ForbiddenError for a user who is neither owner nor organizer', async () => {
    await expect(getTicketDetailsById('tkt_1', 'stranger')).rejects.toThrow('You do not have permission to view this ticket.');
  });

  it('returns ticket details with a dynamic QR for the owner', async () => {
    const result = await getTicketDetailsById('tkt_1', userId);

    expect(result.id).toBe('tkt_1');
    expect(result.qrCode).toBe('mock-qr-code');
  });

  it('returns ticket details for the event organizer', async () => {
    const result = await getTicketDetailsById('tkt_1', 'org1');

    expect(result.id).toBe('tkt_1');
  });

  it('resolves venue details when the event has a venue', async () => {
    eventRepository.getEventById.mockResolvedValue({ ...mockEvent, venueId: 'venue_1' });
    venueRepository.getVenueById.mockResolvedValue({ id: 'venue_1' });

    await getTicketDetailsById('tkt_1', userId);

    expect(venueRepository.getVenueById).toHaveBeenCalledWith('venue_1');
  });
});

describe('cancelPendingTicket', () => {
  it('returns null for a non-existent ticket', async () => {
    ticketRepository.getTicketInTransaction.mockResolvedValue(null);

    const result = await cancelPendingTicket('tkt_1');

    expect(result).toBeNull();
  });

  it('returns the ticket unchanged when it is not pending', async () => {
    const paidTicket = { id: 'tkt_1', status: 'paid', eventId, type: 'standard' };
    ticketRepository.getTicketInTransaction.mockResolvedValue(paidTicket);

    const result = await cancelPendingTicket('tkt_1');

    expect(result).toBe(paidTicket);
    expect(ticketRepository.updateTicketInTransaction).not.toHaveBeenCalled();
  });

  it('cancels a pending ticket and restores availability', async () => {
    ticketRepository.getTicketInTransaction.mockResolvedValue({ id: 'tkt_1', status: 'pending', eventId, type: 'standard', appliedPromoCode: null });

    const result = await cancelPendingTicket('tkt_1');

    expect(result.status).toBe('cancelled');
    expect(ticketRepository.updateTicketInTransaction).toHaveBeenCalledWith(mockTransaction, 'tkt_1', { status: 'cancelled' });
    expect(eventRepository.incrementEventTicketTypeAvailableInTransaction).toHaveBeenCalledWith(mockTransaction, eventId, 'standard', 1);
    expect(cacheNamespace.invalidateSeatAvailability).toHaveBeenCalledWith(eventId);
  });

  it('decrements the promotion counter when the ticket used a promo code', async () => {
    ticketRepository.getTicketInTransaction.mockResolvedValue({ id: 'tkt_1', status: 'pending', eventId, type: 'standard', appliedPromoCode: 'P10' });
    promotionRepository.findPromoByCodeInTransaction.mockResolvedValue({ _id: 'promo_1' });

    await cancelPendingTicket('tkt_1');

    expect(promotionRepository.decrementPromotionUsedCountInTransaction).toHaveBeenCalledWith(mockTransaction, 'promo_1');
  });
});

describe('failTicketPayment', () => {
  it('throws NotFoundError when the ticket does not exist', async () => {
    ticketRepository.getTicketInTransaction.mockResolvedValue(null);

    await expect(failTicketPayment('tkt_1')).rejects.toThrow('Ticket not found.');
  });

  it('returns the ticket unchanged when already paid or checked in', async () => {
    const paidTicket = { id: 'tkt_1', status: 'paid', eventId, type: 'standard' };
    ticketRepository.getTicketInTransaction.mockResolvedValue(paidTicket);

    const result = await failTicketPayment('tkt_1');

    expect(result).toBe(paidTicket);
    expect(ticketRepository.updateTicketInTransaction).not.toHaveBeenCalled();
  });

  it('cancels a pending ticket and invalidates seat availability', async () => {
    ticketRepository.getTicketInTransaction.mockResolvedValue({ id: 'tkt_1', status: 'pending', eventId, type: 'standard', appliedPromoCode: null });
    orderRepository.getTicketOrderLinkInTransaction.mockResolvedValue(null);

    const result = await failTicketPayment('tkt_1', 'Payment failed');

    expect(result.status).toBe('cancelled');
    expect(ticketRepository.updateTicketInTransaction).toHaveBeenCalledWith(mockTransaction, 'tkt_1', expect.objectContaining({ status: 'cancelled' }));
    expect(cacheNamespace.invalidateSeatAvailability).toHaveBeenCalledWith(eventId);
  });
});

describe('failOrderPayment', () => {
  const order = {
    id: 'ord_test-uuid', userId, eventId, organizerId: 'org1',
    status: ORDER_STATUS.PENDING_PAYMENT, totalAmount: 200000, rawData: {},
  };

  beforeEach(() => {
    orderRepository.getOrderInTransaction.mockResolvedValue(order);
    orderRepository.getOrderItemsInTransaction.mockResolvedValue([]);
    promotionService.releaseReservedDiscountInTransaction.mockResolvedValue();
    orderRepository.updateOrderStatusInTransaction.mockResolvedValue();
  });

  it('throws NotFoundError when the order does not exist', async () => {
    orderRepository.getOrderInTransaction.mockResolvedValue(null);

    await expect(failOrderPayment('ord_test-uuid')).rejects.toThrow('Order not found.');
  });

  it('returns the order unchanged when already paid', async () => {
    const paidOrder = { ...order, status: ORDER_STATUS.PAID };
    orderRepository.getOrderInTransaction.mockResolvedValue(paidOrder);

    const result = await failOrderPayment('ord_test-uuid');

    expect(result).toBe(paidOrder);
    expect(orderRepository.updateOrderStatusInTransaction).not.toHaveBeenCalled();
  });

  it('cancels pending tickets and marks the order failed', async () => {
    orderRepository.getOrderItemsInTransaction.mockResolvedValue([{ ticketId: 'tkt_1' }]);
    ticketRepository.getTicketInTransaction.mockResolvedValue({ id: 'tkt_1', status: 'pending', eventId, type: 'standard', quantity: 2 });

    const result = await failOrderPayment('ord_test-uuid', 'Card declined');

    expect(result.status).toBe(ORDER_STATUS.FAILED);
    expect(ticketRepository.updateTicketInTransaction).toHaveBeenCalledWith(mockTransaction, 'tkt_1', expect.objectContaining({ status: 'cancelled' }));
    expect(eventRepository.incrementEventTicketTypeAvailableInTransaction).toHaveBeenCalledWith(mockTransaction, eventId, 'standard', 2);
    expect(orderRepository.updateOrderStatusInTransaction).toHaveBeenCalledWith(mockTransaction, 'ord_test-uuid', ORDER_STATUS.FAILED, null);
    expect(promotionService.releaseReservedDiscountInTransaction).toHaveBeenCalledWith(mockTransaction, 'ord_test-uuid');
  });

  it('releases the seat hold when the order had one', async () => {
    orderRepository.getOrderInTransaction.mockResolvedValue({ ...order, rawData: { seatHold: { performanceId: 'perf1', holdToken: 'tok1', seatIds: ['seat1'] } } });
    seatRepository.releasePerformanceSeatHold.mockResolvedValue({ released: true, seatIds: ['seat1'] });

    await failOrderPayment('ord_test-uuid');

    expect(seatRepository.releasePerformanceSeatHold).toHaveBeenCalledWith(
      { userId, eventId, performanceId: 'perf1', holdToken: 'tok1', seatIds: ['seat1'] },
      mockTransaction,
    );
  });
});

describe('bookTicket', () => {
  const objectEvent = { id: eventId, name: 'Ev', organizerId: 'org1', ticketTypes: { standard: { id: 'standard', price: 100000, available: 5 } } };

  it('throws BadRequestError for an invalid quantity', async () => {
    await expect(bookTicket(userId, eventId, 'standard', 0)).rejects.toThrow('Invalid ticket quantity.');
  });

  it('throws NotFoundError when the event does not exist', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue(null);

    await expect(bookTicket(userId, eventId, 'standard', 1)).rejects.toThrow('Event not found!');
  });

  it('throws NotFoundError for an unknown ticket type', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue({ ...objectEvent, ticketTypes: {} });

    await expect(bookTicket(userId, eventId, 'standard', 1)).rejects.toThrow("Ticket type 'standard' does not exist.");
  });

  it('throws ConflictError when stock is insufficient', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue(objectEvent);

    await expect(bookTicket(userId, eventId, 'standard', 10)).rejects.toThrow('Not enough tickets available. Only 5 left.');
  });
});

describe('bookOrderAtomic', () => {
  const objectEvent = { id: eventId, name: 'Ev', organizerId: 'org1', ticketTypes: { standard: { id: 'standard', price: 100000, available: 5 } } };

  it('throws BadRequestError for empty items', async () => {
    await expect(bookOrderAtomic(userId, eventId, [])).rejects.toThrow('items must be a non-empty array.');
  });

  it('throws NotFoundError when the event does not exist', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue(null);

    await expect(bookOrderAtomic(userId, eventId, [{ ticketType: 'standard', quantity: 1 }])).rejects.toThrow('Event not found.');
  });

  it('throws BadRequestError for an invalid quantity', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue(objectEvent);

    await expect(bookOrderAtomic(userId, eventId, [{ ticketType: 'standard', quantity: 'abc' }]))
      .rejects.toThrow('Invalid quantity for standard');
  });

  it('throws NotFoundError for an unknown ticket type', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue(objectEvent);

    await expect(bookOrderAtomic(userId, eventId, [{ ticketType: 'vip', quantity: 1 }]))
      .rejects.toThrow("Ticket type 'vip' does not exist.");
  });

  it('throws ConflictError when stock is insufficient', async () => {
    eventRepository.getEventInTransaction.mockResolvedValue(objectEvent);

    await expect(bookOrderAtomic(userId, eventId, [{ ticketType: 'standard', quantity: 10 }]))
      .rejects.toThrow('Not enough standard tickets. Only 5 left.');
  });
});
