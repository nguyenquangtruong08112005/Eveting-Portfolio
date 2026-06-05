const ticketRepository = require('@/providers/database/ticket.repository');
const eventRepository = require('@/providers/database/event.repository');
const promotionRepository = require('@/providers/database/promotion.repository');
const analyticsRepository = require('@/providers/database/analytics.repository');
const venueRepository = require('@/providers/database/venue.repository');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const TICKET_SECRET = process.env.JWT_TICKET_SECRET;

const getTicketsByUserId = async (userId, page = 1, limit = 10) => {
    const allTickets = await ticketRepository.getTicketsByUserId(userId);

    if (allTickets.length === 0) {
        return {
            tickets: [],
            pagination: {
                currentPage: page,
                limit: limit,
                totalPages: 0,
                totalItems: 0
            }
        };
    }

    const statusPriority = {
        'paid': 1,
        'pending': 2,
        'checkedIn': 3,
        'cancelled': 4
    };

    allTickets.sort((a, b) => {
        const priorityA = statusPriority[a.status] || 99;
        const priorityB = statusPriority[b.status] || 99;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        return b.purchaseDate - a.purchaseDate;
    });

    const totalItems = allTickets.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedTickets = allTickets.slice(startIndex, endIndex);

    const ticketsWithEventDetails = await Promise.all(paginatedTickets.map(async (ticketData) => {
        const eventData = await eventRepository.getEventById(ticketData.eventId);
        let eventInfo = null;

        if (eventData) {
            eventInfo = {
                id: eventData.id,
                name: eventData.name,
                date: eventData.date,
                imageUrl: eventData.imageUrl,
                venueName: eventData.venueName,
                city: eventData.city,
                status: eventData.status
            };
        } else {
            eventInfo = { id: ticketData.eventId, name: "Unknown Event", status: "deleted" };
        }

        return {
            id: ticketData.id,
            status: ticketData.status,
            type: ticketData.type,
            price: ticketData.price,
            seat: ticketData.seat,
            qrCode: ticketData.qrCode,
            purchaseDate: ticketData.purchaseDate,
            event: eventInfo
        };
    }));

    return {
        tickets: ticketsWithEventDetails,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: totalPages,
            totalItems: totalItems
        }
    };
};

const bookTicket = async (userId, eventId, ticketType, quantity = 1, promoCode = null) => {
    const ticketId = `tkt_${uuidv4()}`;
    let appliedPromotion = null;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) throw new Error("Invalid ticket quantity.");

    return ticketRepository.runTransaction(async (transaction) => {
        const eventData = await eventRepository.getEventInTransaction(transaction, eventId);
        if (!eventData) {
            throw new Error("Event not found!");
        }
        const ticketTypeData = eventData.ticketTypes[ticketType];

        if (!ticketTypeData) {
            throw new Error(`Ticket type '${ticketType}' does not exist.`);
        }
        if (ticketTypeData.available < qty) {
            throw new Error(`Not enough tickets available. Only ${ticketTypeData.available} left.`);
        }

        const unitPrice = ticketTypeData.price;
        let totalPrice = unitPrice * qty;
        const originalTotalPrice = totalPrice;

        if (promoCode) {
            const foundPromo = await promotionRepository.findPromoByCodeInTransaction(transaction, promoCode);

            if (foundPromo) {
                appliedPromotion = foundPromo;
                const now = new Date().getTime();

                if (appliedPromotion.validUntil <= now) throw new Error('Promotion has expired.');
                if (appliedPromotion.usedCount >= appliedPromotion.usageLimit) throw new Error('Promotion usage limit reached.');
                if (appliedPromotion.eventId && appliedPromotion.eventId !== eventId) throw new Error('Promotion not valid for this event.');

                if (appliedPromotion.minTicketQuantity && qty < appliedPromotion.minTicketQuantity) {
                    throw new Error(`Promotion requires minimum ${appliedPromotion.minTicketQuantity} tickets.`);
                }

                if (appliedPromotion.discountType === 'percent') {
                    totalPrice = totalPrice * (1 - appliedPromotion.discountValue);
                } else if (appliedPromotion.discountType === 'amount') {
                    totalPrice = Math.max(0, totalPrice - appliedPromotion.discountValue);
                }
            }
        }

        const qrPayload = {
            ticketId: ticketId,
            userId: userId,
            eventId: eventId,
            quantity: qty
        };
        const qrCodeJwt = jwt.sign(qrPayload, TICKET_SECRET);

        const newTicketData = {
            id: ticketId,
            eventId: eventId,
            userId: userId,
            organizerId: eventData.organizerId,
            type: ticketType,

            price: totalPrice,
            originalPrice: originalTotalPrice,
            quantity: qty,
            unitPrice: unitPrice,

            appliedPromoCode: promoCode,
            seat: null,
            qrCode: qrCodeJwt,
            status: 'pending',
            purchaseDate: new Date().getTime(),
        };

        await ticketRepository.createTicketInTransaction(transaction, ticketId, newTicketData);

        const newAvailableCount = ticketTypeData.available - qty;
        await eventRepository.updateEventInTransaction(transaction, eventId, {
            [`ticketTypes.${ticketType}.available`]: newAvailableCount
        });

        if (appliedPromotion) {
            await promotionRepository.incrementPromotionUsedCountInTransaction(transaction, appliedPromotion._id || appliedPromotion.id);
        }

        return newTicketData;
    });
};

const cancelPendingTicket = async (ticketId) => {
    return ticketRepository.runTransaction(async (transaction) => {
        const ticketData = await ticketRepository.getTicketInTransaction(transaction, ticketId);
        if (!ticketData) {
            console.warn(`Attempted to cancel non-existent ticket: ${ticketId}`);
            return null;
        }

        if (ticketData.status !== 'pending') {
            console.log(`Ticket ${ticketId} is not in 'pending' state (${ticketData.status}), cannot cancel.`);
            return ticketData;
        }

        await ticketRepository.updateTicketInTransaction(transaction, ticketId, { status: 'cancelled' });

        await eventRepository.incrementEventTicketTypeAvailableInTransaction(transaction, ticketData.eventId, ticketData.type, 1);

        console.log(`Ticket ${ticketId} cancelled, 1 ticket of type ${ticketData.type} returned to event ${ticketData.eventId}.`);
        return { ...ticketData, status: 'cancelled' };
    });
};

const confirmTicketPayment = async (ticketId) => {
    return ticketRepository.runTransaction(async (transaction) => {
        const ticketData = await ticketRepository.getTicketInTransaction(transaction, ticketId);

        if (!ticketData) {
            throw new Error('Ticket not found.');
        }

        if (ticketData.status === 'paid' || ticketData.status === 'checkedIn') {
            console.log(`Ticket ${ticketId} is already confirmed.`);
            return ticketData;
        }

        if (ticketData.status !== 'pending') {
            console.warn(`Cannot confirm ticket with status: ${ticketData.status}`);
            return ticketData;
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayTimestamp = now.getTime().toString();

        await ticketRepository.updateTicketInTransaction(transaction, ticketId, {
            status: 'paid',
            updatedAt: Date.now(),
            paymentTime: Date.now()
        });

        await analyticsRepository.updateAnalyticsForConfirmPaymentInTransaction(transaction, ticketData.eventId, {
            price: ticketData.price,
            ticketType: ticketData.type,
            quantity: 1,
            dailyTimestamp: todayTimestamp
        });

        console.log(`Ticket ${ticketId} confirmed. Analytics updated for date: ${now.toISOString()}`);

        return { ...ticketData, status: 'paid' };
    });
};

const getTicketDetailsById = async (ticketId, requestingUserId) => {
    const ticketData = await ticketRepository.getTicketById(ticketId);

    if (!ticketData) {
        throw new Error('Ticket not found.');
    }

    const eventData = await eventRepository.getEventById(ticketData.eventId);
    if (!eventData) {
        throw new Error('Associated event not found.');
    }

    const isTicketOwner = ticketData.userId === requestingUserId;
    const isEventOrganizer = eventData.organizerId === requestingUserId;

    if (!isTicketOwner && !isEventOrganizer) {
        throw new Error('Forbidden: You do not have permission to view this ticket.');
    }

    let venueData = null;
    if (eventData.venueId) {
        venueData = await venueRepository.getVenueById(eventData.venueId);
    }

    return {
        ticket: ticketData,
        event: {
            name: eventData.name,
            date: eventData.date,
            endDate: eventData.endDate,
            bannerUrl: eventData.bannerUrl,
            eventType: eventData.eventType,
            onlineUrl: eventData.onlineUrl,
            city: eventData.city,
            venueName: eventData.venueName,
        },
        venue: venueData ? {
            name: venueData.name,
            addressDetails: venueData.addressDetails,
            location: venueData.location
        } : null
    };
};

module.exports = {
    getTicketsByUserId,
    bookTicket,
    cancelPendingTicket,
    confirmTicketPayment,
    getTicketDetailsById,
};
