const ticketService = require('@/modules/tickets/application/service');
const asyncHandler = require('@/shared/middleware/asyncHandler');

const getCurrentUserTickets = asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await ticketService.getTicketsByUserId(userId, page, limit);
    res.status(200).json(result);
});

const bookTicket = asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const { eventId, ticketType, promoCode, quantity } = req.body;

    const newTicket = await ticketService.bookTicket(
        userId,
        eventId,
        ticketType,
        quantity || 1,
        promoCode
    );
    res.status(201).json(newTicket);
});

const getTicketDetails = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const userId = req.user.uid;

    const ticketDetails = await ticketService.getTicketDetailsById(ticketId, userId);
    res.status(200).json(ticketDetails);
});

const holdSeat = asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const { eventId, seatId } = req.body;
    const result = await ticketService.holdSeat(userId, eventId, seatId);
    res.status(200).json(result);
});

const releaseSeat = asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const { eventId, seatId } = req.body;
    const result = await ticketService.releaseSeat(userId, eventId, seatId);
    res.status(200).json(result);
});

const bookHeldSeats = asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const { eventId, seatIds, promoCode } = req.body;
    const result = await ticketService.bookHeldSeats(userId, eventId, seatIds, promoCode);
    res.status(201).json(result);
});

const getSeatsWithStatuses = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const result = await ticketService.getSeatsWithStatuses(eventId);
    res.status(200).json(result);
});

const bookOrderAtomic = asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const { eventId, items, promoCode } = req.body;

    const result = await ticketService.bookOrderAtomic(userId, eventId, items, promoCode);
    res.status(201).json(result);
});

const createCheckout = asyncHandler(async (req, res) => {
    const checkout = await ticketService.createCheckout(req.user.uid, req.body);
    res.status(201).json(checkout);
});

const submitOrderAttendees = asyncHandler(async (req, res) => {
    const result = await ticketService.submitOrderAttendees(
        req.user.uid,
        req.body.eventId,
        req.params.orderId,
        req.body.attendees
    );
    res.status(200).json(result);
});

const getPerformanceSeatAvailability = asyncHandler(async (req, res) => {
    const result = await ticketService.getPerformanceSeatAvailability(
        req.params.eventId,
        req.query.performanceId || null
    );
    res.status(200).json(result);
});

const holdPerformanceSeats = asyncHandler(async (req, res) => {
    const result = await ticketService.holdPerformanceSeats(
        req.user.uid,
        req.params.eventId,
        req.body.performanceId,
        req.body.seatIds
    );
    res.status(201).json(result);
});

const releasePerformanceSeatHold = asyncHandler(async (req, res) => {
    const result = await ticketService.releasePerformanceSeatHold(
        req.user.uid,
        req.params.eventId,
        req.body.performanceId,
        req.body.holdToken,
        req.body.seatIds || null
    );
    res.status(200).json(result);
});

module.exports = {
    getCurrentUserTickets,
    bookTicket,
    bookOrderAtomic,
    createCheckout,
    submitOrderAttendees,
    getTicketDetails,
    holdSeat,
    releaseSeat,
    bookHeldSeats,
    getSeatsWithStatuses,
    getPerformanceSeatAvailability,
    holdPerformanceSeats,
    releasePerformanceSeatHold,
};
