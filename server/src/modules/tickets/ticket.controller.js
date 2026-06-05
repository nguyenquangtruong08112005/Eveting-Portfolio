// controllers/ticket.controller.js
const ticketService = require('./ticket.service');

const getCurrentUserTickets = async (req, res) => {
    try {
        const userId = req.user.uid;
        // Lấy page, limit từ query params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await ticketService.getTicketsByUserId(userId, page, limit);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error in Ticket Controller - getCurrentUserTickets: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const bookTicket = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { eventId, ticketType, promoCode, quantity } = req.body;

        if (!eventId || !ticketType) {
            return res.status(400).send({ error: 'Bad Request: eventId and ticketType are required.' });
        }

        const newTicket = await ticketService.bookTicket(
            userId,
            eventId,
            ticketType,
            quantity || 1, // quantity
            promoCode      // promoCode
        );
        res.status(201).json(newTicket);

    } catch (error) {
        console.error("Error in Ticket Controller - bookTicket: ", error);
        // Phân loại lỗi để trả về thông báo thân thiện hơn cho client
        if (error.message.includes("sold out") || error.message.includes("not found")
            || error.message.includes("Invalid promotion") || error.message.includes("Promotion has")) {
            return res.status(409).send({ error: `Conflict: ${error.message}` });
        }
        res.status(500).send({ error: 'Internal Server Error' });
    }
}

/**
 * API Endpoint: (GET /tickets/:ticketId)
 * Lấy thông tin chi tiết, đã gộp của một vé.
 */
const getTicketDetails = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user.uid; // Lấy từ middleware verifyAuthToken

        const ticketDetails = await ticketService.getTicketDetailsById(ticketId, userId);

        res.status(200).json(ticketDetails);
    } catch (error) {
        console.error("Error in Ticket Controller - getTicketDetails: ", error);

        // Phân loại lỗi từ service
        if (error.message.includes('not found')) {
            return res.status(404).send({ error: error.message });
        }
        if (error.message.includes('Forbidden')) {
            return res.status(403).send({ error: error.message });
        }

        res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getCurrentUserTickets,
    bookTicket,
    getTicketDetails,
};
