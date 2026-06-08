const asyncHandler = require('@/shared/middleware/asyncHandler');
const { BadRequestError, NotFoundError, ForbiddenError } = require('@/shared/errors');
const organizerService = require('@/modules/organizer/application/service');
const analyticsService = require('@/modules/analytics/application/service');
const eventRepository = require('@/providers/database/event.repository');

const verifyEventOwnership = asyncHandler(async (req, res, next) => {
    const eventId = req.params.eventId || req.body.eventId || req.query.eventId;
    const organizerId = req.user.uid;

    if (!eventId) {
        throw new BadRequestError('eventId is missing.');
    }

    const event = await eventRepository.getEventById(eventId);
    if (!event) {
        throw new NotFoundError('Event not found.');
    }

    if (event.organizerId !== organizerId) {
        throw new ForbiddenError('You are not the owner of this event.');
    }

    req.event = event;
    next();
});

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

const registerOrganizer = asyncHandler(async (req, res) => {
    await organizerService.registerOrganizer(req.user.uid, req.body);
    res.status(200).json({ success: true, message: "Register successful." });
});

const getOrganizerProfile = asyncHandler(async (req, res) => {
    const profile = await organizerService.getOrganizerProfile(req.user.uid);
    res.status(200).json(profile);
});

const getMyEvents = asyncHandler(async (req, res) => {
    const { page, limit, status } = req.query;
    const events = await organizerService.getMyEvents(req.user.uid, Number(page), Number(limit), status);
    res.status(200).json({ data: events });
});

const getStatsOverview = asyncHandler(async (req, res) => {
    const stats = await organizerService.getOrganizerStats(req.user.uid);
    res.status(200).json(stats);
});

const getEventStats = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const analytics = await analyticsService.getAnalyticsByEventId(eventId);
    res.status(200).json(analytics || {});
});

const updateOrganizerProfile = asyncHandler(async (req, res) => {
    const updatedProfile = await organizerService.updateOrganizerProfile(req.user.uid, req.body);
    res.status(200).json(updatedProfile);
});

const getEventAttendees = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const attendees = await organizerService.getAttendeesByEventId(eventId);
    res.status(200).json({ attendees });
});

const importAttendees = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new BadRequestError('No file uploaded. Please upload an Excel/CSV file.');
    }

    const { eventId } = req.params;
    const result = await organizerService.importAttendees(eventId, req.file.buffer, req.user.uid);

    res.status(200).json(result);
});

const exportAttendees = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const buffer = await organizerService.exportAttendees(eventId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendees_${eventId}.xlsx`);

    res.send(buffer);
});

const broadcastNotification = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { title, message } = req.body;

    const result = await organizerService.broadcastNotification(eventId, title, message, req.user.uid);
    res.status(200).json({ success: true, sentTo: result.count });
});

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
