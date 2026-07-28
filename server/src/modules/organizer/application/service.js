const TICKET_SECRET = process.env.JWT_TICKET_SECRET;
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const ticketRepository = require('@/providers/database/ticket.repository');
const userRepository = require('@/providers/database/user.repository');
const eventRepository = require('@/providers/database/event.repository');
const analyticsRepository = require('@/providers/database/analytics.repository');
const organizerRepository = require('@/providers/database/organizer.repository');
const orderRepository = require('@/providers/database/order.repository');
const ticketService = require('@/modules/tickets').service;
const seatRepository = require('@/providers/database/seat.repository');
const organizerTeamService = require('@/modules/memberships/application/organizer-team.service');
const logger = require('@/shared/logger');
const {
    AppError,
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} = require('@/shared/errors');

const { mapAttendees } = require('./attendee.helper');
const { mapOrganizerProfile, buildOrganizerUpdateData } = require('./profile.helper');
const { computeOrganizerStats } = require('./stats.helper');
const { parseImportWorkbook, buildExportWorkbook } = require('./import-export.helper');
const { sendBroadcastNotification } = require('./notification.helper');

const getAttendeesByEventId = async (eventId) => {
    const tickets = await ticketRepository.getAttendeeTicketsByEventId(eventId);
    if (tickets.length === 0) return [];
    const userIds = new Set();
    tickets.forEach(ticket => { if (ticket.userId) userIds.add(ticket.userId); });
    if (userIds.size === 0) return [];
    const usersMap = await userRepository.getUsersByIds(Array.from(userIds));
    return mapAttendees(tickets, usersMap);
};

const checkInByQr = async (qrToken, requestingUserId, direction = 'entry') => {
    let payload;
    try {
        payload = jwt.verify(qrToken, TICKET_SECRET);
    } catch (error) {
        logger.warn('Ticket QR verification failed', {
            userId: requestingUserId,
            error: error.message,
        });
        throw new BadRequestError('Invalid or tampered QR code');
    }
    const { ticketId, eventId, userId } = payload;
    if (!ticketId || !eventId || !userId) {
        throw new BadRequestError('Ticket QR payload is incomplete');
    }
    if (!['entry', 'exit'].includes(direction)) {
        throw new BadRequestError('direction must be entry or exit');
    }
    return ticketRepository.runTransaction(async (transaction) => {
        const locked = await transaction.query(
            'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
            [ticketId]
        );
        if (!locked.rows.length) throw new NotFoundError('Ticket not found');
        const ticketRow = locked.rows[0];
        const ticketData = {
            ...(ticketRow.raw_data || {}),
            id: ticketRow.id,
            eventId: ticketRow.event_id,
            userId: ticketRow.user_id,
            organizerId: ticketRow.organizer_id,
            type: ticketRow.type,
            seat: ticketRow.seat,
            status: ticketRow.status,
            quantity: Number(ticketRow.quantity || 1),
            checkInCount: Number(ticketRow.check_in_count || 0),
            lastCheckInAt: ticketRow.last_check_in_at
                ? new Date(ticketRow.last_check_in_at).getTime()
                : null,
            checkedInAt: ticketRow.checked_in_at
                ? new Date(ticketRow.checked_in_at).getTime()
                : null,
            rawData: ticketRow.raw_data || {},
        };
        if (ticketData.eventId !== eventId || ticketData.userId !== userId) {
            throw new BadRequestError('Ticket QR payload does not match the ticket record');
        }
        const eventData = await eventRepository.getEventInTransaction(transaction, eventId);
        if (!eventData) throw new NotFoundError('Event not found');

        const ticketTypeId =
            ticketData.rawData?.ticketTypeId ||
            payload.ticketTypeId ||
            ticketData.type;
        await organizerTeamService.authorizeEventPermission(
            requestingUserId,
            eventId,
            'SCAN_TICKETS',
            {
                performanceId: payload.performanceId || null,
                ticketTypeId,
            },
            transaction
        );

        if (!['paid', 'checkedIn', 'checked_in'].includes(ticketData.status)) {
            throw new AppError(
                `Cannot check in ticket with status '${ticketData.status}'`,
                409,
                'TICKET_NOT_CHECKIN_ELIGIBLE'
            );
        }
        const quantity = ticketData.quantity || 1;
        const movementResult = await transaction.query(
            `SELECT
                COUNT(*) FILTER (WHERE direction = 'entry')::int AS entries,
                COUNT(*) FILTER (WHERE direction = 'exit')::int AS exits
             FROM ticket_check_ins
             WHERE ticket_id = $1`,
            [ticketId]
        );
        const recordedEntries = movementResult.rows[0].entries || 0;
        const exits = movementResult.rows[0].exits || 0;
        const currentCheckInCount = Math.max(
            Number(ticketData.checkInCount || 0),
            recordedEntries
        );
        const now = Date.now();

        if (direction === 'entry' && currentCheckInCount >= quantity) {
            const conflict = new AppError(
                'Ticket has already reached its check-in limit',
                409,
                'TICKET_ALREADY_CHECKED_IN'
            );
            conflict.details = {
                ticketId,
                checkInCount: currentCheckInCount,
                quantity,
                checkedInAt: ticketData.checkedInAt || ticketData.lastCheckInAt || null,
            };
            throw conflict;
        }
        if (direction === 'exit' && recordedEntries <= exits) {
            throw new AppError(
                'Ticket is not currently checked in',
                409,
                'TICKET_NOT_CURRENTLY_INSIDE'
            );
        }

        const newCheckInCount =
            direction === 'entry' ? currentCheckInCount + 1 : currentCheckInCount;
        if (direction === 'entry') {
            const updates = {
                checkInCount: newCheckInCount,
                lastCheckInAt: now,
                checkedInAt: ticketData.checkedInAt || now,
            };
            if (ticketData.status === 'paid') updates.status = 'checkedIn';
            await ticketRepository.updateTicketInTransaction(transaction, ticketId, updates);
        }

        const checkInId = `tci_${randomUUID()}`;
        await transaction.query(
            `INSERT INTO ticket_check_ins (
                id, ticket_id, event_id, staff_user_id, checked_in_at, source,
                direction, performance_id, ticket_type_id, raw_data
             )
             VALUES ($1, $2, $3, $4, $5, 'qr', $6, $7, $8, $9)`,
            [
                checkInId,
                ticketId,
                eventId,
                requestingUserId,
                new Date(now),
                direction,
                payload.performanceId || null,
                ticketTypeId || null,
                JSON.stringify({ qrVersion: payload.version || null }),
            ]
        );
        if (direction === 'entry' && currentCheckInCount === 0) {
            await userRepository.addHistoryEventIdInTransaction(transaction, userId, eventId);
        }
        if (direction === 'entry') {
            await analyticsRepository.incrementCheckInInTransaction(transaction, eventId);
        }
        const entryCount =
            direction === 'entry' ? recordedEntries + 1 : recordedEntries;
        const exitCount = direction === 'exit' ? exits + 1 : exits;
        return {
            ...ticketData,
            status: direction === 'entry' ? 'checkedIn' : ticketData.status,
            action: direction,
            checkInCount: newCheckInCount,
            quantity,
            remaining: quantity - newCheckInCount,
            entryCount,
            exitCount,
            currentlyInside: Math.max(0, entryCount - exitCount),
            checkedInAt: ticketData.checkedInAt || now,
        };
    });
};

const registerOrganizer = async (userId, organizerData) => {
    const profile = await organizerRepository.addOrganizerRoleToUser(userId, organizerData);
    await organizerTeamService.ensureOrganizerTeam(
        userId,
        organizerData.organizationName || organizerData.companyName
    );
    return profile;
};

const getOrganizerProfile = async (userId) => {
    const rawData = await organizerRepository.getOrganizerProfile(userId);
    return mapOrganizerProfile(rawData);
};

const getMyEvents = async (organizerId, page = 1, limit = 20, status) => {
    const events = await eventRepository.getEventsByOrganizerId(organizerId, { page, limit, status });
    const enrichedEvents = [];
    for (const event of events) {
        const { data: rawEventData } = await eventRepository.getEventRawById(event.id);
        const tickets = await ticketRepository.getAttendeeTicketsByEventId(event.id);
        const soldCount = tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);

        let totalCapacity = 0;
        if (rawEventData && rawEventData.ticketTypes) {
            for (const typeKey in rawEventData.ticketTypes) {
                const t = rawEventData.ticketTypes[typeKey] || {};
                // ticket types store `available` (web) or legacy `capacity` / `quantity`
                totalCapacity += Number(t.available ?? t.capacity ?? t.quantity ?? 0) || 0;
            }
        }

        const price = rawEventData ? (rawEventData.minPrice || 0) : 0;
        // event.status from getEventsByOrganizerId is already lifecycle when present
        const displayStatus =
            event.lifecycleStatus ||
            event.status ||
            rawEventData?.lifecycleStatus ||
            'draft';

        enrichedEvents.push({
            id: event.id,
            name: event.name,
            status: displayStatus,
            lifecycleStatus: event.lifecycleStatus || displayStatus,
            sold: soldCount,
            capacity: totalCapacity || rawEventData?.capacity || 0,
            price: price
        });
    }
    return enrichedEvents;
};

const getLedger = async (organizerId) => {
    return await orderRepository.getLedgerEntriesByOrganizer(organizerId);
};

const getOrganizerStats = async (organizerId) => {
    const eventEntries = await eventRepository.getEventEntriesByOrganizer(organizerId);
    const eventIds = eventEntries.map(e => e.id);
    let analyticsList = [];
    if (eventIds.length > 0) {
        analyticsList = await analyticsRepository.getAnalyticsByEventIds(eventIds);
    }
    return computeOrganizerStats(eventEntries, analyticsList);
};

const updateOrganizerProfile = async (userId, updateData) => {
    const dataToUpdate = buildOrganizerUpdateData(updateData);
    if (Object.keys(dataToUpdate).length > 0) { await organizerRepository.updateOrganizerProfile(userId, dataToUpdate); }
    return await getOrganizerProfile(userId);
};

const importAttendees = async (eventId, fileBuffer, organizerId) => {
    const jsonData = parseImportWorkbook(fileBuffer);
    const eventData = await eventRepository.getEventDataById(eventId);
    if (!eventData) throw new Error("Event not found.");
    if (eventData.organizerId !== organizerId) throw new Error("Forbidden.");
    let successCount = 0, failCount = 0;
    const errors = [];
    for (const row of jsonData) {
        try {
            const email = row['Email'] || row['email'];
            const ticketType = row['TicketType'] || row['ticketType'] || 'Standard';
            if (!email) throw new Error("Missing email.");
            const userData = await userRepository.findUserByEmail(email);
            if (!userData) throw new Error(`User with email ${email} not found in system.`);
            const userId = userData._id;
            const newTicket = await ticketService.bookTicket(userId, eventId, ticketType);
            await ticketService.confirmTicketPayment(newTicket.id);
            successCount++;
        } catch (err) {
            failCount++;
            errors.push({ row, error: err.message });
        }
    }
    return { successCount, failCount, errors };
};

const exportAttendees = async (eventId) => {
    const attendees = await getAttendeesByEventId(eventId);
    const workbook = buildExportWorkbook(attendees);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

const broadcastNotification = async (eventId, title, message, organizerId) => {
    const eventData = await eventRepository.getEventById(eventId);
    if (!eventData) throw new Error("Event not found.");
    if (eventData.organizerId !== organizerId) throw new Error("Forbidden.");
    const tickets = await ticketRepository.getAttendeeTicketsByEventId(eventId);
    if (tickets.length === 0) return { count: 0 };
    const userIds = [...new Set(tickets.map(t => t.userId))];
    return await sendBroadcastNotification(userIds, title, message, eventId);
};

function validateSeatLayout(layout) {
    if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
        throw new BadRequestError('layout must be an object');
    }
    if (!Array.isArray(layout.sections)) {
        throw new BadRequestError('layout.sections must be an array');
    }

    let seatCount = 0;
    for (const section of layout.sections) {
        if (!section || typeof section !== 'object' || !Array.isArray(section.rows)) {
            throw new BadRequestError('each layout section must contain rows');
        }
        for (const row of section.rows) {
            if (!row || typeof row !== 'object' || !Array.isArray(row.seats)) {
                throw new BadRequestError('each layout row must contain seats');
            }
            seatCount += row.seats.length;
        }
    }
    if (seatCount > 500) {
        throw new BadRequestError('A seat layout cannot contain more than 500 seats.');
    }
}

const getSeatLayout = async (eventId, performanceId) => {
    const layout = await seatRepository.getPerformanceSeatLayout(eventId, performanceId);
    if (!layout) throw new NotFoundError('Performance seat layout not found.');
    return layout;
};

const saveSeatLayout = async (eventId, performanceId, layout) => {
    validateSeatLayout(layout);
    const saved = await seatRepository.savePerformanceSeatLayout(eventId, performanceId, layout);
    if (!saved) throw new NotFoundError('Performance seat layout not found.');
    return saved;
};

module.exports = {
    getAttendeesByEventId, checkInByQr, registerOrganizer, getOrganizerProfile,
    getMyEvents, getOrganizerStats, updateOrganizerProfile, importAttendees,
    exportAttendees, broadcastNotification, getLedger, getSeatLayout, saveSeatLayout
};
