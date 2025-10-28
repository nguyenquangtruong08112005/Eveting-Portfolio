// controllers/organizer.controller.js
const organizerService = require('../services/organizer.service');
const { db } = require('../config/firebase.config');

// Middleware kiểm tra quyền sở hữu sự kiện
const verifyEventOwnership = async (req, res, next) => {
    try {
        // TODO: check eventId có hợp lệ hay không. Chỉnh sửa lại để dùng 1 trong 3 nguonfoL params, query, body
        const eventId = req.params.eventId || req.body.eventId || req.query.eventId;
        const organizerId = req.user.uid;

        const eventDoc = await db.collection('Events').doc(eventId).get();
        if (!eventDoc.exists || eventDoc.data().organizerId !== organizerId) {
            return res.status(403).send({ error: 'Forbidden: You are not the owner of this event.' });
        }
        req.event = eventDoc.data(); // Gắn thông tin event vào request
        next();
    } catch (error) {
        res.status(500).send({ error: 'Internal Server Error At Verify Event OwnerShip Middleware' });
    }
};

const getEventAttendees = async (req, res) => {
    try {
        const attendees = await organizerService.getAttendeesByEventId(req.params.eventId);
        res.status(200).json(attendees);
    } catch (error) {
        console.error("Error in Organizer Controller - getEventAttendees: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const checkInTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const requestingOrganizerId = req.user.uid; // ID của organizer đang yêu cầu check-in

        // 1. Lấy thông tin vé
        const ticketRef = db.collection('Tickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();

        if (!ticketDoc.exists) {
            return res.status(404).send({ error: 'Ticket not found.' });
        }
        const ticketData = ticketDoc.data();

        // 2. Lấy thông tin sự kiện của vé đó
        const eventRef = db.collection('Events').doc(ticketData.eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
             // Trường hợp hiếm gặp: vé tồn tại nhưng sự kiện không còn
            return res.status(404).send({ error: 'Event associated with this ticket not found.' });
        }

        // 3. So sánh organizerId của sự kiện với người yêu cầu
        if (eventDoc.data().organizerId !== requestingOrganizerId) {
            return res.status(403).send({ error: 'Forbidden: You do not have permission to check-in tickets for this event.' });
        }

        // Nếu quyền hợp lệ, gọi service để check-in
        const updatedTicket = await organizerService.checkInTicket(ticketId);
        res.status(200).json(updatedTicket);

    } catch (error) {
        console.error("Error in Organizer Controller - checkInTicket: ", error);
        // Trả về lỗi cụ thể từ service nếu có (ví dụ: vé đã check-in, vé không phải 'paid')
        res.status(400).send({ error: error.message || 'Failed to check-in ticket.' });
    }
};

module.exports = {
    verifyEventOwnership,
    getEventAttendees,
    checkInTicket,
};