const ticketRepository = require('@/providers/database/ticket.repository');
const eventRepository = require('@/providers/database/event.repository');
const promotionRepository = require('@/providers/database/promotion.repository');
const analyticsRepository = require('@/providers/database/analytics.repository');
const venueRepository = require('@/providers/database/venue.repository');
const orderRepository = require('@/providers/database/order.repository');
const { v4: uuidv4 } = require('uuid');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require('@/shared/errors');
const { ORDER_STATUS } = require('@/modules/orders/domain/order-status');
const { PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');
const logger = require('@/shared/logger');
const { sortTicketsByPriorityAndDate, buildPagination, mapTicketWithEvent, mapTicketDetailResponse } = require('./helpers/ticket-mappers');
const { generateTicketQR } = require('./helpers/qr-code.helper');
const { applyPromotion } = require('./helpers/promotion-validator.helper');

const getTicketsByUserId = async (userId, page = 1, limit = 10) => {
    const allTickets = await ticketRepository.getTicketsByUserId(userId);

    if (allTickets.length === 0) {
        return {
            tickets: [],
            pagination: { currentPage: page, limit: limit, totalPages: 0, totalItems: 0 }
        };
    }

    sortTicketsByPriorityAndDate(allTickets);

    const totalItems = allTickets.length;
    const pagination = buildPagination(totalItems, page, limit);

    const paginatedTickets = allTickets.slice(pagination.startIndex, pagination.endIndex);

    const ticketsWithEventDetails = await Promise.all(paginatedTickets.map(async (ticketData) => {
        const eventData = await eventRepository.getEventById(ticketData.eventId);
        return mapTicketWithEvent(ticketData, eventData);
    }));

    return {
        tickets: ticketsWithEventDetails,
        pagination: pagination.meta
    };
};

const bookTicket = async (userId, eventId, ticketType, quantity = 1, promoCode = null) => {
    const ticketId = `tkt_${uuidv4()}`;
    let appliedPromotion = null;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) throw new BadRequestError("Invalid ticket quantity.");

    return ticketRepository.runTransaction(async (transaction) => {
        const eventData = await eventRepository.getEventInTransaction(transaction, eventId);
        if (!eventData) {
            throw new NotFoundError("Event not found!");
        }
        const ticketTypeData = eventData.ticketTypes[ticketType];

        if (!ticketTypeData) {
            throw new NotFoundError(`Ticket type '${ticketType}' does not exist.`);
        }
        if (ticketTypeData.available < qty) {
            throw new ConflictError(`Not enough tickets available. Only ${ticketTypeData.available} left.`);
        }

        const unitPrice = ticketTypeData.price;
        let totalPrice = unitPrice * qty;
        const originalTotalPrice = totalPrice;

        if (promoCode) {
            const result = await applyPromotion(promotionRepository, transaction, promoCode, eventId, qty, totalPrice);
            appliedPromotion = result.appliedPromotion;
            totalPrice = result.totalPrice;
        }

        const qrCodeJwt = generateTicketQR(ticketId, userId, eventId, qty);

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

        // ── Shadow order wiring (SAVEPOINT-isolated) ──
        const shadowOrderId = `ord_${uuidv4()}`;
        const shadowOrderItemId = `oi_${uuidv4()}`;
        try {
            await transaction.query('SAVEPOINT shadow_order');
            try {
                await orderRepository.createOrderInTransaction(transaction, {
                    id: shadowOrderId,
                    userId,
                    eventId,
                    organizerId: eventData.organizerId,
                    status: ORDER_STATUS.PENDING_PAYMENT,
                    subtotalAmount: originalTotalPrice,
                    discountAmount: appliedPromotion ? originalTotalPrice - totalPrice : 0,
                    feeAmount: 0,
                    totalAmount: totalPrice,
                    currency: 'VND',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await orderRepository.createOrderItemInTransaction(transaction, {
                    id: shadowOrderItemId,
                    ticketTypeId: ticketType,
                    ticketType,
                    eventId,
                    eventName: eventData.name || null,
                    ticketId,
                    quantity: qty,
                    unitPrice,
                    subtotal: originalTotalPrice,
                    totalAmount: totalPrice,
                    status: 'pending',
                    createdAt: Date.now(),
                }, shadowOrderId);
                await orderRepository.linkTicketToOrderInTransaction(transaction, ticketId, shadowOrderId, shadowOrderItemId);
                await transaction.query('RELEASE SAVEPOINT shadow_order');
            } catch (innerErr) {
                await transaction.query('ROLLBACK TO SAVEPOINT shadow_order');
                await transaction.query('RELEASE SAVEPOINT shadow_order');
                throw innerErr;
            }
        } catch (err) {
            logger.error(`[ShadowOrder] Failed to create order for ticket ${ticketId}: ${err.message}`);
        }
        // ── End shadow order wiring ──

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
            throw new NotFoundError('Ticket not found.');
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

        // ── Shadow payment_attempt update ──
        try {
            const link = await orderRepository.getTicketOrderLinkInTransaction(transaction, ticketId);
            if (link && link.paymentAttemptId) {
                await orderRepository.updatePaymentAttemptInTransaction(transaction, link.paymentAttemptId, {
                    status: PAYMENT_STATUS.SUCCEEDED,
                    completedAt: Date.now(),
                });
            }
        } catch (err) {
            logger.error(`[ShadowPayment] Failed to update payment_attempt for ticket ${ticketId}: ${err.message}`);
        }
        // ── End shadow payment_attempt update ──

        console.log(`Ticket ${ticketId} confirmed. Analytics updated for date: ${now.toISOString()}`);

        return { ...ticketData, status: 'paid' };
    });
};

const getTicketDetailsById = async (ticketId, requestingUserId) => {
    const ticketData = await ticketRepository.getTicketById(ticketId);

    if (!ticketData) {
        throw new NotFoundError('Ticket not found.');
    }

    const eventData = await eventRepository.getEventById(ticketData.eventId);
    if (!eventData) {
        throw new NotFoundError('Associated event not found.');
    }

    const isTicketOwner = ticketData.userId === requestingUserId;
    const isEventOrganizer = eventData.organizerId === requestingUserId;

    if (!isTicketOwner && !isEventOrganizer) {
        throw new ForbiddenError('You do not have permission to view this ticket.');
    }

    let venueData = null;
    if (eventData.venueId) {
        venueData = await venueRepository.getVenueById(eventData.venueId);
    }

    return mapTicketDetailResponse(ticketData, eventData, venueData);
};

module.exports = {
    getTicketsByUserId,
    bookTicket,
    cancelPendingTicket,
    confirmTicketPayment,
    getTicketDetailsById,
};
