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

module.exports = {
    getCurrentUserTickets,
    bookTicket,
    getTicketDetails,
    holdSeat,
    releaseSeat,
    bookHeldSeats,
    getSeatsWithStatuses,
};
