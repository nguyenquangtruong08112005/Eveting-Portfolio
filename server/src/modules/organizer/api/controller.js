const organizerService = require('@/modules/organizer/application/service');
const analyticsService = require('@/modules/analytics/application/service');
const eventRepository = require('@/providers/database/event.repository');

const verifyEventOwnership = async (req, res, next) => {
    try {
        const eventId = req.params.eventId || req.body.eventId || req.query.eventId;
        const organizerId = req.user.uid;

        if (!eventId) {
            return res.status(400).send({ error: 'Bad Request: eventId is missing.' });
        }

        const event = await eventRepository.getEventById(eventId);
        if (!event) {
            return res.status(404).send({ error: 'Event not found.' });
        }

        if (event.organizerId !== organizerId) {
            return res.status(403).send({ error: 'Forbidden: You are not the owner of this event.' });
        }

        req.event = event;
        next();
    } catch (error) {
        console.error("Error in verifyEventOwnership middleware:", error);
        res.status(500).send({ error: 'Internal Server Error At Verify Event OwnerShip Middleware' });
    }
};

const checkInByQr = async (req, res) => {
    try {
        const { qrToken } = req.body;
        const updatedTicket = await organizerService.checkInByQr(qrToken, req.user.uid);

        res.status(200).json({
            valid: true,
            message: "Check-in thành công",
            ticketInfo: {
                ticketId: updatedTicket.id,
                userId: updatedTicket.userId,
                ticketType: updatedTicket.type,
                seat: updatedTicket.seat || "N/A",
                status: updatedTicket.status,
                checkedInAt: new Date().getTime()
            }
        });

    } catch (error) {
        console.error("Check-in Error:", error.message);

        if (error.message.includes('already been checked')) {
            return res.status(409).json({
                valid: false,
                error: "ALREADY_CHECKED_IN",
                message: "Vé này đã được check-in trước đó."
            });
        }

        if (error.message.includes('Ticket not found') || error.message.includes('Event not found') || error.message.includes('Invalid')) {
            return res.status(400).json({
                valid: false,
                error: "INVALID_TICKET",
                message: "Vé không hợp lệ hoặc không tồn tại."
            });
        }

        if (error.message.includes('Forbidden')) {
            return res.status(403).json({
                valid: false,
                error: "FORBIDDEN",
                message: "Bạn không có quyền check-in vé này."
            });
        }

        res.status(500).json({
            valid: false,
            error: "SERVER_ERROR",
            message: "Lỗi hệ thống."
        });
    }
};

const registerOrganizer = async (req, res) => {
    try {
        await organizerService.registerOrganizer(req.user.uid, req.body);
        res.status(200).json({ success: true, message: "Register successful." });
    } catch (error) {
        console.error("Error in registerOrganizer:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const getOrganizerProfile = async (req, res) => {
    try {
        const profile = await organizerService.getOrganizerProfile(req.user.uid);
        res.status(200).json(profile);
    } catch (error) {
        console.error("Error in getOrganizerProfile:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const getMyEvents = async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        const events = await organizerService.getMyEvents(req.user.uid, Number(page), Number(limit), status);
        res.status(200).json({ data: events });
    } catch (error) {
        console.error("Error in getMyEvents:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const getStatsOverview = async (req, res) => {
    try {
        const stats = await organizerService.getOrganizerStats(req.user.uid);
        res.status(200).json(stats);
    } catch (error) {
        console.error("Error in getStatsOverview:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const getEventStats = async (req, res) => {
    try {
        const { eventId } = req.params;
        const analytics = await analyticsService.getAnalyticsByEventId(eventId);
        res.status(200).json(analytics || {});
    } catch (error) {
        console.error("Error in getEventStats:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const updateOrganizerProfile = async (req, res) => {
    try {
        const updatedProfile = await organizerService.updateOrganizerProfile(req.user.uid, req.body);
        res.status(200).json(updatedProfile);
    } catch (error) {
        console.error("Error updating organizer profile:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const getEventAttendees = async (req, res) => {
    try {
        const { eventId } = req.params;
        const attendees = await organizerService.getAttendeesByEventId(eventId);
        res.status(200).json({ attendees });
    } catch (error) {
        console.error("Error getting event attendees:", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const importAttendees = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ error: 'No file uploaded. Please upload an Excel/CSV file.' });
        }

        const { eventId } = req.params;
        const result = await organizerService.importAttendees(eventId, req.file.buffer, req.user.uid);

        res.status(200).json(result);
    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).send({ error: error.message });
    }
};

const exportAttendees = async (req, res) => {
    try {
        const { eventId } = req.params;
        const buffer = await organizerService.exportAttendees(eventId);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=attendees_${eventId}.xlsx`);

        res.send(buffer);
    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).send({ error: error.message });
    }
};

const broadcastNotification = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).send({ error: 'Title and message are required.' });
        }

        const result = await organizerService.broadcastNotification(eventId, title, message, req.user.uid);
        res.status(200).json({ success: true, sentTo: result.count });
    } catch (error) {
        console.error("Broadcast Error:", error);
        res.status(500).send({ error: error.message });
    }
};

module.exports = {
    verifyEventOwnership,
    checkInByQr,
    registerOrganizer,
    getOrganizerProfile,
    getMyEvents,
    getStatsOverview,
    getEventStats,
    updateOrganizerProfile,
    getEventAttendees,
    importAttendees,
    exportAttendees,
    broadcastNotification
};
