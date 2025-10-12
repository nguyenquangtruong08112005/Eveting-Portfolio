// controllers/ticket.controller.js
const ticketService = require('../services/ticket.service');

const getCurrentUserTickets = async (req, res) => {
    try {
        // Lấy userId an toàn từ token đã được xác thực
        const userId = req.user.uid;
        const tickets = await ticketService.getTicketsByUserId(userId);
        res.status(200).json(tickets);
    } catch (error) {
        console.error("Error in Ticket Controller - getCurrentUserTickets: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const bookTicket = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { eventId, ticketType } = req.body;

        if (!eventId || !ticketType) {
            return res.status(400).send({ error: 'Bad Request: eventId and ticketType are required.' });
        }

        const newTicket = await ticketService.bookTicket(userId, eventId, ticketType);
        res.status(201).json(newTicket);

    } catch (error) {
        console.error("Error in Ticket Controller - bookTicket: ", error);
        // Phân loại lỗi để trả về thông báo thân thiện hơn cho client
        if (error.message.includes("sold out") || error.message.includes("not found")) {
            return res.status(409).send({ error: `Conflict: ${error.message}` });
        }
        res.status(500).send({ error: 'Internal Server Error' });
    }
}

module.exports = {
    getCurrentUserTickets,
    bookTicket,
};