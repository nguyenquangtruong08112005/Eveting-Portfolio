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

        // TODO: Cần thêm một bước kiểm tra xem ticket này có thuộc sự kiện của organizer không
        // để tăng cường bảo mật.

        const updatedTicket = await organizerService.checkInTicket(ticketId);
        res.status(200).json(updatedTicket);
    } catch (error) {
        console.error("Error in Organizer Controller - checkInTicket: ", error);
        res.status(400).send({ error: error.message });
    }
};

module.exports = {
    verifyEventOwnership,
    getEventAttendees,
    checkInTicket,
};