const ticketRepository = require('@/providers/database/ticket.repository');
const eventRepository = require('@/providers/database/event.repository');
const { query } = require('@/providers/database/postgres.client');
const promotionRepository = require('@/providers/database/promotion.repository');
const analyticsRepository = require('@/providers/database/analytics.repository');
const venueRepository = require('@/providers/database/venue.repository');
const orderRepository = require('@/providers/database/order.repository');
const seatRepository = require('@/providers/database/seat.repository');
const membershipRepository = require('@/providers/database/membership.repository');
const cacheProvider = require('@/shared/cache/cache-provider');
const cacheNamespace = require('@/shared/cache/namespace-helpers');
const { getIo } = require('@/shared/socket/socket-server');
const { v4: uuidv4 } = require('uuid');
const {
  AppError,
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
const promotionService = require('@/modules/promotions/application/service');
const eventPublisher = require('@/shared/events/event-publisher');
const outboxProcessor = require('@/shared/events/outbox-processor');
const { toDb } = require('@/providers/database/time.helper');

const PERFORMANCE_SEAT_HOLD_TTL_MS = 10 * 60 * 1000;
const MAX_SEATS_PER_HOLD = 10;

const normalizeSeatIds = (seatIds) => {
    if (!Array.isArray(seatIds) || seatIds.length === 0 || seatIds.length > MAX_SEATS_PER_HOLD) {
        throw new BadRequestError(`seatIds must contain between 1 and ${MAX_SEATS_PER_HOLD} seats.`);
    }
    const normalized = seatIds.map((seatId) => String(seatId || '').trim()).sort();
    if (normalized.some((seatId) => !seatId) || new Set(normalized).size !== normalized.length) {
        throw new BadRequestError('seatIds must be unique non-empty values.');
    }
    return normalized;
};

const seatAlreadyReservedError = () => new AppError(
    'One or more requested seats are already reserved.',
    409,
    'SEAT_ALREADY_RESERVED'
);

const getTicketType = (event, ticketType) => {
    const types = event.ticketTypes || {};
    if (Array.isArray(types)) {
        return types.find((type) => type.id === ticketType || type.type === ticketType) || null;
    }
    return types[ticketType] || null;
};

const validateCheckoutAttendees = (questions, attendees, ticketQuantity) => {
    if (attendees == null) return [];
    if (!Array.isArray(attendees) || attendees.length !== ticketQuantity) {
        throw new BadRequestError('attendees must contain exactly one entry per ticket.');
    }
    const byId = new Map((questions || []).map((question) => [question.id, question]));
    return attendees.map((attendee, index) => {
        if (!attendee || typeof attendee !== 'object' || Array.isArray(attendee)) {
            throw new BadRequestError(`attendees[${index}] must be an object.`);
        }
        const answers = attendee.answers || {};
        if (typeof answers !== 'object' || Array.isArray(answers)) {
            throw new BadRequestError(`attendees[${index}].answers must be keyed by question ID.`);
        }
        for (const questionId of Object.keys(answers)) {
            if (!byId.has(questionId)) throw new BadRequestError(`Unknown custom question '${questionId}'.`);
        }
        for (const question of byId.values()) {
            const answer = answers[question.id];
            const empty = answer == null || answer === '' || (Array.isArray(answer) && answer.length === 0);
            if (question.isRequired && empty) throw new BadRequestError(`Question '${question.id}' is required.`);
            if (empty) continue;
            const options = question.options || [];
            if (question.questionType === 'single_choice' && !options.includes(answer)) {
                throw new BadRequestError(`Invalid answer for question '${question.id}'.`);
            }
            if (question.questionType === 'multi_choice' && (!Array.isArray(answer) || answer.some((value) => !options.includes(value)))) {
                throw new BadRequestError(`Invalid answer for question '${question.id}'.`);
            }
        }
        return { id: `att_${uuidv4()}`, name: attendee.name || null, email: attendee.email || null, answers };
    });
};

const createCheckout = async (userId, payload) => {
    const { eventId, items, promoCode, voucherCode, attendees, seatHold } = payload || {};
    if (!eventId || !Array.isArray(items) || items.length === 0 || items.length > 20) {
        throw new BadRequestError('eventId and between 1 and 20 checkout items are required.');
    }
    if (promoCode && voucherCode) throw new BadRequestError('Only one promoCode or voucherCode may be applied.');
    const promotionCode = promoCode || voucherCode || null;
    const seen = new Set();
    const normalizedItems = items.map((item) => {
        const ticketType = String(item?.ticketType || '').trim();
        const quantity = Number(item?.quantity);
        if (!ticketType || !Number.isInteger(quantity) || quantity < 1 || seen.has(ticketType)) {
            throw new BadRequestError('Each checkout item needs a unique ticketType and positive integer quantity.');
        }
        seen.add(ticketType);
        return { ticketType, quantity };
    });

    return ticketRepository.runTransaction(async (transaction) => {
        const event = await eventRepository.getEventInTransaction(transaction, eventId);
        if (!event) throw new NotFoundError('Event not found.');
        const now = Date.now();
        const pricedItems = normalizedItems.map((item) => {
            const type = getTicketType(event, item.ticketType);
            if (!type) throw new NotFoundError(`Ticket type '${item.ticketType}' does not exist.`);
            if (!Number.isSafeInteger(Number(type.price)) || Number(type.price) < 0) {
                throw new BadRequestError(`Ticket type '${item.ticketType}' price must be an integer VND amount.`);
            }
            if (Number(type.available) < item.quantity) {
                throw new ConflictError(`Not enough '${item.ticketType}' tickets available.`);
            }
            return { ...item, type, price: Number(type.price) };
        });
        const ticketQuantity = pricedItems.reduce((total, item) => total + item.quantity, 0);
        const subtotalAmount = pricedItems.reduce((total, item) => total + item.price * item.quantity, 0);
        const questions = await eventRepository.getCustomQuestions(eventId, transaction);
        const validatedAttendees = validateCheckoutAttendees(questions, attendees, ticketQuantity);
        const normalizedSeatHold = seatHold ? {
            performanceId: String(seatHold.performanceId || ''),
            holdToken: String(seatHold.holdToken || ''),
            seatIds: normalizeSeatIds(seatHold.seatIds),
        } : null;
        if (normalizedSeatHold && (!normalizedSeatHold.performanceId || !normalizedSeatHold.holdToken || normalizedSeatHold.seatIds.length !== ticketQuantity)) {
            throw new BadRequestError('seatHold must match checkout ticket quantity.');
        }

        const orderId = `ord_${uuidv4()}`;
        let discountAmount = 0;
        let totalAmount = subtotalAmount;
        await orderRepository.createOrderInTransaction(transaction, {
            id: orderId,
            userId,
            eventId,
            organizerId: event.organizerId || null,
            status: ORDER_STATUS.PENDING_PAYMENT,
            subtotalAmount,
            discountAmount,
            feeAmount: 0,
            totalAmount,
            currency: 'VND',
            expiresAt: now + PERFORMANCE_SEAT_HOLD_TTL_MS,
            createdAt: now,
            updatedAt: now,
            rawData: { promotionCode, seatHold: normalizedSeatHold, messageForAttendee: event.messageForAttendee || '' },
        });
        let promotion = null;
        if (promotionCode) {
            promotion = await promotionService.reserveDiscountInTransaction(transaction, {
                code: promotionCode,
                userId,
                orderId,
                eventId,
                organizerId: event.organizerId || null,
                ticketQuantity,
                subtotalVnd: subtotalAmount,
            });
            discountAmount = Number(promotion.discountAmount);
            totalAmount = Number(promotion.totalAmount);
            await orderRepository.updateOrderTotalsInTransaction(transaction, orderId, {
                subtotalAmount, discountAmount, feeAmount: 0, totalAmount, updatedAt: now,
            });
        }
        const tickets = [];
        let remainingDiscount = discountAmount;
        for (let index = 0; index < pricedItems.length; index += 1) {
            const item = pricedItems[index];
            const lineSubtotal = item.price * item.quantity;
            const lineDiscount = index === pricedItems.length - 1
                ? remainingDiscount
                : Math.floor((discountAmount * lineSubtotal) / subtotalAmount);
            remainingDiscount -= lineDiscount;
            const ticketId = `tkt_${uuidv4()}`;
            const orderItemId = `oi_${uuidv4()}`;
            const ticket = {
                id: ticketId, eventId, userId, organizerId: event.organizerId || null,
                type: item.ticketType, price: lineSubtotal - lineDiscount, originalPrice: lineSubtotal,
                quantity: item.quantity, unitPrice: item.price, appliedPromoCode: promotionCode,
                seat: null, qrCode: generateTicketQR(ticketId, userId, eventId, item.quantity),
                status: 'pending', purchaseDate: now,
            };
            await ticketRepository.createTicketInTransaction(transaction, ticketId, ticket);
            await orderRepository.createOrderItemInTransaction(transaction, {
                id: orderItemId, ticketTypeId: item.type.id || null, ticketType: item.ticketType,
                eventId, eventName: event.name || null, ticketId, quantity: item.quantity,
                unitPrice: item.price, subtotal: lineSubtotal, totalAmount: ticket.price,
                status: 'pending', createdAt: now,
            }, orderId);
            await orderRepository.linkTicketToOrderInTransaction(transaction, ticketId, orderId, orderItemId, null);
            await eventRepository.updateEventInTransaction(transaction, eventId, {
                [`ticketTypes.${item.ticketType}.available`]: Number(item.type.available) - item.quantity,
            });
            tickets.push(ticket);
        }
        if (validatedAttendees.length > 0) {
            await eventRepository.replaceOrderAttendeesInTransaction(transaction, eventId, orderId, validatedAttendees, questions);
        }
        await cacheNamespace.invalidateSeatAvailability(eventId);
        if (totalAmount === 0) {
            await confirmPaymentForOrderInTransaction(transaction, orderId, 'free-order');
        }
        return { orderId, status: totalAmount === 0 ? ORDER_STATUS.PAID : ORDER_STATUS.PENDING_PAYMENT, currency: 'VND', subtotalAmount, discountAmount, totalAmount, tickets, promotion, buyerMessage: event.messageForAttendee || '' };
    });
};

const submitOrderAttendees = async (userId, eventId, orderId, attendees) => ticketRepository.runTransaction(async (transaction) => {
    const order = await eventRepository.getBuyerOrderInTransaction(transaction, eventId, orderId, userId);
    if (!order) throw new NotFoundError('Order not found.');
    if (order.status !== ORDER_STATUS.PENDING_PAYMENT) throw new ConflictError('Attendee answers cannot be changed after payment.');
    const questions = await eventRepository.getCustomQuestions(eventId, transaction);
    const validated = validateCheckoutAttendees(questions, attendees, Number(order.ticket_quantity));
    await eventRepository.replaceOrderAttendeesInTransaction(transaction, eventId, orderId, validated, questions);
    return { orderId, attendees: validated };
});

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
        
        // Generate a fresh dynamic expiring QR token for the ticket validation
        const dynamicQrCode = generateTicketQR(
            ticketData.id,
            ticketData.userId,
            ticketData.eventId,
            ticketData.quantity || 1,
            process.env.QR_CODE_TTL || '1h'
        );
        const ticketWithDynamicQr = { ...ticketData, qrCode: dynamicQrCode };
        
        return mapTicketWithEvent(ticketWithDynamicQr, eventData);
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
        const originalTotalPrice = unitPrice * qty;

        const membership = await membershipRepository.getUserMembershipInTransaction(transaction, userId);
        const discountPercentage = membership ? membership.discountPercentage : 0;
        const membershipDiscountAmount = originalTotalPrice * discountPercentage;
        const membershipDiscountedPrice = originalTotalPrice - membershipDiscountAmount;

        let totalPrice = membershipDiscountedPrice;

        if (promoCode) {
            const result = await applyPromotion(promotionRepository, transaction, promoCode, eventId, qty, membershipDiscountedPrice);
            appliedPromotion = result.appliedPromotion;
            totalPrice = result.totalPrice;
        }

        const qrCodeJwt = generateTicketQR(ticketId, userId, eventId, qty);

        // Prefer relational event.organizerId (column); raw Firebase ids are stripped in hydrate
        const organizerId = eventData.organizerId || null;

        const newTicketData = {
            id: ticketId,
            eventId: eventId,
            userId: userId,
            organizerId,
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

            membershipDiscountAmount,
            membershipDiscountRate: discountPercentage,
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
                    organizerId,
                    status: ORDER_STATUS.PENDING_PAYMENT,
                    subtotalAmount: originalTotalPrice,
                    discountAmount: originalTotalPrice - totalPrice,
                    feeAmount: 0,
                    totalAmount: totalPrice,
                    currency: 'VND',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    rawData: {
                        membershipDiscountAmount,
                        membershipDiscountRate: discountPercentage,
                    }
                });
                await orderRepository.createOrderItemInTransaction(transaction, {
                    id: shadowOrderItemId,
                    ticketTypeId: ticketTypeData.id || null,
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
            // Portfolio V1: order is required for commerce integrity — do not swallow.
            logger.error(`[Order] Failed to create order for ticket ${ticketId}: ${err.message}`);
            throw err;
        }
        // ── End order wiring ──

        await cacheNamespace.invalidateSeatAvailability(eventId);

        return newTicketData;
    });
};

const bookOrderAtomic = async (userId, eventId, items, promoCode = null) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestError('items must be a non-empty array.');
    }

    return ticketRepository.runTransaction(async (transaction) => {
        const eventData = await eventRepository.getEventInTransaction(transaction, eventId);
        if (!eventData) throw new NotFoundError('Event not found.');

        let subtotalAmount = 0;
        const ticketEntries = [];

        for (const item of items) {
            const qty = parseInt(item.quantity);
            if (isNaN(qty) || qty < 1) throw new BadRequestError(`Invalid quantity for ${item.ticketType}`);

            const ticketTypeData = eventData.ticketTypes[item.ticketType];
            if (!ticketTypeData) throw new NotFoundError(`Ticket type '${item.ticketType}' does not exist.`);
            if (ticketTypeData.available < qty) {
                throw new ConflictError(`Not enough ${item.ticketType} tickets. Only ${ticketTypeData.available} left.`);
            }

            const unitPrice = Number(ticketTypeData.price);
            const entrySubtotal = unitPrice * qty;
            subtotalAmount += entrySubtotal;

            ticketEntries.push({ item, unitPrice, entrySubtotal, ticketTypeData, qty });
        }

        const membership = await membershipRepository.getUserMembershipInTransaction(transaction, userId);
        const discountPercentage = membership ? membership.discountPercentage : 0;
        const membershipDiscountAmount = subtotalAmount * discountPercentage;
        const membershipDiscountedPrice = subtotalAmount - membershipDiscountAmount;
        let totalAmount = membershipDiscountedPrice;
        let appliedPromotion = null;

        if (promoCode) {
            const totalQty = ticketEntries.reduce((s, e) => s + e.qty, 0);
            const result = await applyPromotion(promotionRepository, transaction, promoCode, eventId, totalQty, membershipDiscountedPrice);
            appliedPromotion = result.appliedPromotion;
            totalAmount = result.totalPrice;
        }

        if (appliedPromotion) {
            await promotionRepository.incrementPromotionUsedCountInTransaction(transaction, appliedPromotion._id || appliedPromotion.id);
        }

        const organizerId = eventData.organizerId || null;

        // One order
        const orderId = `ord_${uuidv4()}`;
        await orderRepository.createOrderInTransaction(transaction, {
            id: orderId,
            userId,
            eventId,
            organizerId,
            status: ORDER_STATUS.PENDING_PAYMENT,
            subtotalAmount,
            discountAmount: subtotalAmount - totalAmount,
            feeAmount: 0,
            totalAmount,
            currency: 'VND',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            rawData: { membershipDiscountAmount, membershipDiscountRate: discountPercentage },
        });

        // Tickets and order items
        const tickets = [];
        for (const { item, unitPrice, entrySubtotal, ticketTypeData, qty } of ticketEntries) {
            const ticketId = `tkt_${uuidv4()}`;
            const orderItemId = `oi_${uuidv4()}`;
            const qrCodeJwt = generateTicketQR(ticketId, userId, eventId, qty);

            const proportionalWeight = subtotalAmount > 0 ? entrySubtotal / subtotalAmount : 1 / ticketEntries.length;
            const ticketPrice = Math.round(totalAmount * proportionalWeight);
            const originalPrice = entrySubtotal;

            const newTicketData = {
                id: ticketId,
                eventId,
                userId,
                organizerId,
                type: item.ticketType,
                price: ticketPrice,
                originalPrice,
                quantity: qty,
                unitPrice,
                appliedPromoCode: promoCode,
                seat: null,
                qrCode: qrCodeJwt,
                status: 'pending',
                purchaseDate: Date.now(),
                membershipDiscountAmount: Math.round(membershipDiscountAmount * proportionalWeight),
                membershipDiscountRate: discountPercentage,
            };

            await ticketRepository.createTicketInTransaction(transaction, ticketId, newTicketData);

            await orderRepository.createOrderItemInTransaction(transaction, {
                id: orderItemId,
                ticketTypeId: ticketTypeData.id || null,
                ticketType: item.ticketType,
                eventId,
                eventName: eventData.name || null,
                ticketId,
                quantity: qty,
                unitPrice,
                subtotal: originalPrice,
                totalAmount: ticketPrice,
                status: 'pending',
                createdAt: Date.now(),
            }, orderId);

            await orderRepository.linkTicketToOrderInTransaction(transaction, ticketId, orderId, orderItemId, null);

            await eventRepository.updateEventInTransaction(transaction, eventId, {
                [`ticketTypes.${item.ticketType}.available`]: ticketTypeData.available - qty,
            });

            tickets.push(newTicketData);
        }

        await cacheNamespace.invalidateSeatAvailability(eventId);

        logger.info(`[bookOrderAtomic] Order ${orderId}: ${tickets.length} ticket groups, total ${totalAmount} VND`);
        return { orderId, tickets };
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

        if (ticketData.appliedPromoCode) {
            const promo = await promotionRepository.findPromoByCodeInTransaction(transaction, ticketData.appliedPromoCode);
            if (promo) {
                await promotionRepository.decrementPromotionUsedCountInTransaction(transaction, promo._id || promo.id);
            }
        }

        console.log(`Ticket ${ticketId} cancelled, 1 ticket of type ${ticketData.type} returned to event ${ticketData.eventId}.`);
        await cacheNamespace.invalidateSeatAvailability(ticketData.eventId);
        return { ...ticketData, status: 'cancelled' };
    });
};

const confirmTicketPayment = async (ticketId, zpTransId = null, tx = null) => {
    const execute = async (transaction) => {
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

        // Credit loyalty points and evaluate membership upgrade
        try {
            const pointsEarned = Math.floor(Number(ticketData.price || 0) / 10000);
            if (pointsEarned > 0) {
                const ledgerId = `ledger_${uuidv4()}`;
                await membershipRepository.logLoyaltyPointsEntryInTransaction(transaction, {
                    id: ledgerId,
                    userId: ticketData.userId,
                    points: pointsEarned,
                    transactionType: 'ticket_purchase',
                    referenceId: ticketData.id,
                    createdAt: Date.now()
                });

                const userMembership = await membershipRepository.getUserMembershipInTransaction(transaction, ticketData.userId);
                const newLifetimePoints = (userMembership ? userMembership.lifetimePoints : 0) + pointsEarned;

                const tiers = await membershipRepository.getMembershipTiersInTransaction(transaction);
                let qualifiedTier = tiers[0];
                for (const tier of tiers) {
                    if (newLifetimePoints >= tier.minPointsRequired) {
                        qualifiedTier = tier;
                    }
                }

                const currentTierId = userMembership ? userMembership.tierId : 'tier_standard';
                const newTierId = qualifiedTier.id !== currentTierId ? qualifiedTier.id : null;

                await membershipRepository.updateUserMembershipPointsAndTierInTransaction(
                    transaction,
                    ticketData.userId,
                    pointsEarned,
                    pointsEarned,
                    newTierId
                );

                if (newTierId) {
                    logger.info(`[Membership] User ${ticketData.userId} upgraded from ${currentTierId} to ${newTierId}`);
                }
            }
        } catch (err) {
            logger.error(`[Membership] Failed to process loyalty points / upgrade for ticket ${ticketId}: ${err.message}`);
        }

        // ── Shadow payment_attempt, order status, and ledger update ──
        // SAVEPOINT: failure here must not abort ticket paid status
        try {
            await transaction.query('SAVEPOINT shadow_payment');
            const link = await orderRepository.getTicketOrderLinkInTransaction(transaction, ticketId);
            if (link) {
                if (link.paymentAttemptId) {
                    const paymentUpdates = {
                        status: PAYMENT_STATUS.SUCCEEDED,
                        completedAt: Date.now(),
                    };
                    if (zpTransId) {
                        paymentUpdates.providerTransactionId = zpTransId;
                    }
                    await orderRepository.updatePaymentAttemptInTransaction(transaction, link.paymentAttemptId, paymentUpdates);
                }
                if (link.orderId) {
                    await orderRepository.updateOrderStatusInTransaction(transaction, link.orderId, ORDER_STATUS.PAID, Date.now());

                    const orderData = await orderRepository.getOrderInTransaction(transaction, link.orderId);
                    if (orderData && orderData.organizerId) {
                        const settings = await orderRepository.getOrganizerSettingsInTransaction(transaction, orderData.organizerId);
                        const platformFeeRate = settings ? settings.platformFeeRate : 0.05;

                        const grossAmount = Number(orderData.totalAmount || 0);
                        const platformFee = Number((grossAmount * platformFeeRate).toFixed(2));
                        const netAmount = Number((grossAmount - platformFee).toFixed(2));

                        await orderRepository.createLedgerEntryInTransaction(transaction, {
                            id: `led_${uuidv4()}`,
                            orderId: orderData.id,
                            organizerId: orderData.organizerId,
                            grossAmount,
                            platformFee,
                            netAmount,
                            createdAt: Date.now()
                        });
                    }
                }
            }
            await transaction.query('RELEASE SAVEPOINT shadow_payment');
        } catch (err) {
            try {
                await transaction.query('ROLLBACK TO SAVEPOINT shadow_payment');
                await transaction.query('RELEASE SAVEPOINT shadow_payment');
            } catch (_) { /* ignore */ }
            logger.error(`[ShadowPayment] Failed to update payment, order, or ledger for ticket ${ticketId}: ${err.message}`);
        }
        // ── End shadow payment_attempt, order status, and ledger update ──

        // ── Publish notification event to outbox ──
        try {
            await transaction.query('SAVEPOINT notif_outbox');
            const userProfileResult = await transaction.query(
                `SELECT a.email, p.name
                 FROM auth_users a
                 LEFT JOIN user_profiles p ON p.id = a.id
                 WHERE a.id = $1`,
                [ticketData.userId]
            );
            const email = userProfileResult.rows[0]?.email || 'customer@example.com';
            const name = userProfileResult.rows[0]?.name || 'Customer';

            await eventPublisher.publish('notification', {
                channel: 'email',
                target: email,
                title: 'Ticket Booking Successful',
                body: `Hello ${name}, your ticket payment for event ${ticketData.eventId} was confirmed. Your ticket ID is ${ticketId}.`
            }, transaction);

            await eventPublisher.publish('notification', {
                channel: 'socket',
                target: `user_${ticketData.userId}`,
                event: 'ticket_paid',
                title: 'Ticket Confirmed',
                body: `Your ticket payment was confirmed!`,
                data: { ticketId, eventId: ticketData.eventId }
            }, transaction);
            await transaction.query('RELEASE SAVEPOINT notif_outbox');
        } catch (err) {
            try {
                await transaction.query('ROLLBACK TO SAVEPOINT notif_outbox');
                await transaction.query('RELEASE SAVEPOINT notif_outbox');
            } catch (_) { /* ignore */ }
            logger.error(`[NotificationOutbox] Failed to publish outbox event: ${err.message}`);
        }

        await cacheNamespace.invalidateSeatAvailability(ticketData.eventId);

        console.log(`Ticket ${ticketId} confirmed. Analytics updated for date: ${now.toISOString()}`);

        return { ...ticketData, status: 'paid' };
    };

    let result;
    if (tx) {
        result = await execute(tx);
    } else {
        result = await ticketRepository.runTransaction(execute);
    }

    outboxProcessor.triggerProcess();

    return result;
};

const failTicketPayment = async (ticketId, reason = 'Payment failed', tx = null) => {
    const execute = async (transaction) => {
        const ticketData = await ticketRepository.getTicketInTransaction(transaction, ticketId);
        if (!ticketData) {
            throw new NotFoundError('Ticket not found.');
        }

        if (ticketData.status === 'paid' || ticketData.status === 'checkedIn') {
            console.log(`Ticket ${ticketId} is already paid/checkedIn. Cannot fail.`);
            return ticketData;
        }

        await ticketRepository.updateTicketInTransaction(transaction, ticketId, {
            status: 'cancelled',
            updatedAt: Date.now()
        });

        if (ticketData.appliedPromoCode) {
            const promo = await promotionRepository.findPromoByCodeInTransaction(transaction, ticketData.appliedPromoCode);
            if (promo) {
                await promotionRepository.decrementPromotionUsedCountInTransaction(transaction, promo._id || promo.id);
            }
        }

        // Update shadow payment_attempt, order status
        try {
            const link = await orderRepository.getTicketOrderLinkInTransaction(transaction, ticketId);
            if (link) {
                if (link.paymentAttemptId) {
                    await orderRepository.updatePaymentAttemptInTransaction(transaction, link.paymentAttemptId, {
                        status: PAYMENT_STATUS.FAILED,
                        failureReason: reason,
                        completedAt: Date.now(),
                    });
                }
                if (link.orderId) {
                    await orderRepository.updateOrderStatusInTransaction(transaction, link.orderId, ORDER_STATUS.FAILED, null);
                }
            }
        } catch (err) {
            logger.error(`[ShadowPayment] Failed to fail payment or order for ticket ${ticketId}: ${err.message}`);
        }

        await cacheNamespace.invalidateSeatAvailability(ticketData.eventId);

        return { ...ticketData, status: 'cancelled' };
    };

    if (tx) {
        return execute(tx);
    } else {
        return ticketRepository.runTransaction(execute);
    }
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

    // Generate a fresh dynamic expiring QR token for the ticket validation
    const dynamicQrCode = generateTicketQR(
        ticketData.id,
        ticketData.userId,
        ticketData.eventId,
        ticketData.quantity || 1,
        process.env.QR_CODE_TTL || '1h'
    );
    const ticketWithDynamicQr = { ...ticketData, qrCode: dynamicQrCode };

    let venueData = null;
    if (eventData.venueId) {
        venueData = await venueRepository.getVenueById(eventData.venueId);
    }

    return mapTicketDetailResponse(ticketWithDynamicQr, eventData, venueData);
};

const holdSeat = async (userId, eventId, seatId) => {
    return ticketRepository.runTransaction(async (transaction) => {
        const seat = await seatRepository.getSeatById(seatId);
        if (!seat) {
            throw new NotFoundError('Seat not found.');
        }
        if (seat.status !== 'available') {
            throw new ConflictError('Seat is not available.');
        }

        const now = Date.now();

        // Release expired holds on this seat for this event first
        await transaction.query(
            `UPDATE seat_holds 
             SET status = 'released' 
             WHERE event_id = $1 AND seat_id = $2 AND status = 'held' AND expires_at <= $3`,
            [eventId, seatId, toDb(now)]
        );

        // Check if there is an active (unexpired) hold on this seat
        const activeHold = await seatRepository.getActiveHoldForSeat(eventId, seatId);
        if (activeHold) {
            if (activeHold.userId === userId) {
                // Already held by this user, return same hold data
                return { success: true, eventId, seatId, expiresAt: activeHold.expiresAt };
            }
            throw new ConflictError('Seat is currently held by another user.');
        }

        // Check if seat is already sold
        const ticketResult = await transaction.query(
            `SELECT id FROM tickets WHERE event_id = $1 AND seat = $2 AND status != 'cancelled'`,
            [eventId, seatId]
        );
        if (ticketResult.rows.length > 0) {
            throw new ConflictError('Seat is already sold.');
        }

        const holdId = `hold_${uuidv4()}`;
        const expiresAt = now + 600000; // 10 minutes TTL

        await seatRepository.createSeatHold({
            id: holdId,
            eventId,
            seatId,
            userId,
            heldAt: now,
            expiresAt,
            status: 'held',
            createdAt: now
        }, transaction);

        // Set fallback Redis key
        const holdKey = `hold:event:${eventId}:seat:${seatId}`;
        await cacheProvider.set(holdKey, JSON.stringify({ userId, expiresAt }), 600);

        await cacheNamespace.invalidateSeatAvailability(eventId);

        const io = getIo();
        if (io) {
            io.to(`event_${eventId}`).emit('seat:held', { eventId, seatId, expiresAt });
        }

        return { success: true, eventId, seatId, expiresAt };
    });
};

const releaseSeat = async (userId, eventId, seatId) => {
    return ticketRepository.runTransaction(async (transaction) => {
        const activeHold = await seatRepository.getActiveHoldForSeat(eventId, seatId);
        if (!activeHold) {
            return { success: true, message: 'No active hold found.' };
        }

        if (activeHold.userId !== userId) {
            throw new ForbiddenError('You do not own the hold on this seat.');
        }

        await seatRepository.releaseSeatHold(activeHold.id, transaction);

        // Delete Redis key
        const holdKey = `hold:event:${eventId}:seat:${seatId}`;
        await cacheProvider.del(holdKey);

        await cacheNamespace.invalidateSeatAvailability(eventId);

        const io = getIo();
        if (io) {
            io.to(`event_${eventId}`).emit('seat:released', { eventId, seatId });
        }

        return { success: true, eventId, seatId };
    });
};

const bookHeldSeats = async (userId, eventId, seatIds, promoCode = null) => {
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
        throw new BadRequestError('At least one seatId is required.');
    }

    return ticketRepository.runTransaction(async (transaction) => {
        const eventData = await eventRepository.getEventInTransaction(transaction, eventId);
        if (!eventData) {
            throw new NotFoundError('Event not found.');
        }

        const tickets = [];
        let totalAmount = 0;
        let subtotalAmount = 0;
        let ticketTypeData = null;

        for (const seatId of seatIds) {
            // Find active hold in DB
            const activeHold = await seatRepository.getActiveHoldForSeat(eventId, seatId);
            if (!activeHold) {
                throw new ConflictError(`Seat ${seatId} hold has expired or does not exist.`);
            }

            if (activeHold.userId !== userId) {
                throw new ForbiddenError(`You do not own the hold on seat ${seatId}.`);
            }

            const seat = await seatRepository.getSeatById(seatId);
            if (!seat || seat.status !== 'available') {
                throw new ConflictError(`Seat ${seatId} is no longer available.`);
            }

            // Convert hold to sold in DB
            await seatRepository.convertHoldToSold(activeHold.id, transaction);

            // Set seat status to blocked for backward-compatibility with tests
            await seatRepository.updateSeatStatus(seatId, 'blocked', transaction);

            // Clean up cache
            const holdKey = `hold:event:${eventId}:seat:${seatId}`;
            await cacheProvider.del(holdKey);

            const ticketType = 'standard';
            ticketTypeData = null;
            if (Array.isArray(eventData.ticketTypes)) {
                ticketTypeData = eventData.ticketTypes.find(t => t.type === ticketType || t.id === ticketType) || eventData.ticketTypes[0];
            } else if (eventData.ticketTypes && typeof eventData.ticketTypes === 'object') {
                ticketTypeData = eventData.ticketTypes[ticketType] || Object.values(eventData.ticketTypes)[0];
            }
            if (!ticketTypeData) {
                ticketTypeData = { price: 100000, id: 'standard' };
            }

            const unitPrice = Number(ticketTypeData.price);
            subtotalAmount += unitPrice;
        }

        const membership = await membershipRepository.getUserMembershipInTransaction(transaction, userId);
        const discountPercentage = membership ? membership.discountPercentage : 0;
        const membershipDiscountAmount = subtotalAmount * discountPercentage;
        const membershipDiscountedPrice = subtotalAmount - membershipDiscountAmount;

        totalAmount = membershipDiscountedPrice;
        let appliedPromotion = null;

        if (promoCode) {
            const result = await applyPromotion(promotionRepository, transaction, promoCode, eventId, seatIds.length, membershipDiscountedPrice);
            appliedPromotion = result.appliedPromotion;
            totalAmount = result.totalPrice;
        }

        if (appliedPromotion) {
            await promotionRepository.incrementPromotionUsedCountInTransaction(transaction, appliedPromotion._id || appliedPromotion.id);
        }

        const shadowOrderId = `ord_${uuidv4()}`;

        await orderRepository.createOrderInTransaction(transaction, {
            id: shadowOrderId,
            userId,
            eventId,
            organizerId: eventData.organizerId,
            status: ORDER_STATUS.PENDING_PAYMENT,
            subtotalAmount: subtotalAmount,
            discountAmount: subtotalAmount - totalAmount,
            feeAmount: 0,
            totalAmount: totalAmount,
            currency: 'VND',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            rawData: {
                membershipDiscountAmount,
                membershipDiscountRate: discountPercentage,
            }
        });

        for (let i = 0; i < seatIds.length; i++) {
            const seatId = seatIds[i];
            const ticketId = `tkt_${uuidv4()}`;
            const qrCodeJwt = generateTicketQR(ticketId, userId, eventId, 1);

            const newTicketData = {
                id: ticketId,
                eventId: eventId,
                userId: userId,
                organizerId: eventData.organizerId,
                type: 'standard',
                price: totalAmount / seatIds.length,
                originalPrice: subtotalAmount / seatIds.length,
                quantity: 1,
                unitPrice: subtotalAmount / seatIds.length,
                appliedPromoCode: promoCode,
                seat: seatId,
                qrCode: qrCodeJwt,
                status: 'pending',
                purchaseDate: Date.now(),
                membershipDiscountAmount: membershipDiscountAmount / seatIds.length,
                membershipDiscountRate: discountPercentage,
            };

            await ticketRepository.createTicketInTransaction(transaction, ticketId, newTicketData);

            await orderRepository.createOrderItemInTransaction(transaction, {
                id: `oi_${uuidv4()}`,
                ticketTypeId: ticketTypeData.id || null,
                ticketType: 'standard',
                eventId,
                eventName: eventData.name || null,
                ticketId,
                seatId,
                quantity: 1,
                unitPrice: subtotalAmount / seatIds.length,
                subtotal: subtotalAmount / seatIds.length,
                totalAmount: totalAmount / seatIds.length,
                status: 'pending',
                createdAt: Date.now(),
            }, shadowOrderId);

            tickets.push(newTicketData);
        }

        await cacheNamespace.invalidateSeatAvailability(eventId);

        const io = getIo();
        if (io) {
            io.to(`event_${eventId}`).emit('seat:sold', { eventId, seatIds });
        }

        return { orderId: shadowOrderId, tickets };
    });
};

const confirmPaymentForOrderInTransaction = async (tx, orderId, zpTransId = null) => {
    const lockResult = await tx.query(
        'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
    );
    if (lockResult.rows.length === 0) throw new NotFoundError('Order not found.');
    if (lockResult.rows[0].status === ORDER_STATUS.PAID) {
        logger.info(`[confirmPaymentForOrder] Order ${orderId} already paid. Skipping.`);
        return { orderId, confirmedCount: 0, alreadyPaid: true };
    }

    const orderData = await orderRepository.getOrderInTransaction(tx, orderId);
    const seatHold = orderData?.rawData?.seatHold;
    if (seatHold) {
        const converted = await seatRepository.convertPerformanceSeatHoldToSold({
            userId: orderData.userId,
            eventId: orderData.eventId,
            performanceId: seatHold.performanceId,
            holdToken: seatHold.holdToken,
            seatIds: normalizeSeatIds(seatHold.seatIds),
        }, tx);
        if (!converted.converted) throw seatAlreadyReservedError();
    }
    const items = await orderRepository.getOrderItemsInTransaction(tx, orderId);
    const ticketIds = items.map(i => i.ticketId).filter(Boolean);

    const paymentAttempt = await orderRepository.getLatestPaymentAttemptByOrderId(orderId, tx, true);
    if (paymentAttempt && paymentAttempt.status === PAYMENT_STATUS.SUCCEEDED) {
        logger.info(`[confirmPaymentForOrder] Payment attempt ${paymentAttempt.id} already succeeded.`);
        return { orderId, confirmedCount: 0, alreadyPaid: true };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayTimestamp = now.getTime().toString();

    const confirmedTickets = [];
    for (const ticketId of ticketIds) {
        const ticketData = await ticketRepository.getTicketInTransaction(tx, ticketId);
        if (!ticketData) continue;

        if (ticketData.status === 'paid' || ticketData.status === 'checkedIn') {
            confirmedTickets.push(ticketData);
            continue;
        }
        if (ticketData.status !== 'pending') {
            logger.warn(`[confirmPaymentForOrder] Cannot confirm ticket ${ticketId} status: ${ticketData.status}`);
            continue;
        }

        await ticketRepository.updateTicketInTransaction(tx, ticketId, {
            status: 'paid',
            updatedAt: Date.now(),
            paymentTime: Date.now(),
        });

        await analyticsRepository.updateAnalyticsForConfirmPaymentInTransaction(tx, ticketData.eventId, {
            price: ticketData.price,
            ticketType: ticketData.type,
            quantity: 1,
            dailyTimestamp: todayTimestamp,
        });

        try {
            await tx.query('SAVEPOINT membership_loyalty');
            try {
                const pointsEarned = Math.floor(Number(ticketData.price || 0) / 10000);
                if (pointsEarned > 0) {
                    await membershipRepository.logLoyaltyPointsEntryInTransaction(tx, {
                        id: `ledger_${uuidv4()}`,
                        userId: ticketData.userId,
                        points: pointsEarned,
                        transactionType: 'ticket_purchase',
                        referenceId: ticketData.id,
                        createdAt: Date.now(),
                    });
                    const userMembership = await membershipRepository.getUserMembershipInTransaction(tx, ticketData.userId);
                    const newLifetimePoints = (userMembership ? userMembership.lifetimePoints : 0) + pointsEarned;
                    const tiers = await membershipRepository.getMembershipTiersInTransaction(tx);
                    let qualifiedTier = tiers && tiers.length > 0 ? tiers[0] : null;
                    if (tiers) {
                        for (const tier of tiers) {
                            if (newLifetimePoints >= tier.minPointsRequired) qualifiedTier = tier;
                        }
                    }
                    const currentTierId = userMembership ? userMembership.tierId : 'tier_standard';
                    const newTierId = qualifiedTier && qualifiedTier.id !== currentTierId ? qualifiedTier.id : null;
                    await membershipRepository.updateUserMembershipPointsAndTierInTransaction(
                        tx, ticketData.userId, pointsEarned, pointsEarned, newTierId
                    );
                    if (newTierId) logger.info(`[Membership] User ${ticketData.userId} upgraded from ${currentTierId} to ${newTierId}`);
                }
                await tx.query('RELEASE SAVEPOINT membership_loyalty');
            } catch (innerErr) {
                try {
                    await tx.query('ROLLBACK TO SAVEPOINT membership_loyalty');
                    await tx.query('RELEASE SAVEPOINT membership_loyalty');
                } catch (_) { /* ignore rollback failure */ }
                throw innerErr;
            }
        } catch (err) {
            logger.error(`[Membership] Failed loyalty for ticket ${ticketId}: ${err.message}`);
        }

        try {
            await tx.query('SAVEPOINT notif_outbox');
            try {
                const userProfileResult = await tx.query(
                    `SELECT a.email, p.name FROM auth_users a LEFT JOIN user_profiles p ON p.id = a.id WHERE a.id = $1`,
                    [ticketData.userId]
                );
                const email = userProfileResult.rows[0]?.email || 'customer@example.com';
                const name = userProfileResult.rows[0]?.name || 'Customer';
                await eventPublisher.publish('notification', {
                    channel: 'email',
                    target: email,
                    title: 'Ticket Booking Successful',
                    body: `Hello ${name}, your ticket payment for event ${ticketData.eventId} was confirmed. Your ticket ID is ${ticketId}.`,
                }, tx);
                await eventPublisher.publish('notification', {
                    channel: 'socket',
                    target: `user_${ticketData.userId}`,
                    event: 'ticket_paid',
                    title: 'Ticket Confirmed',
                    body: 'Your ticket payment was confirmed!',
                    data: { ticketId, eventId: ticketData.eventId },
                }, tx);
                await tx.query('RELEASE SAVEPOINT notif_outbox');
            } catch (innerErr) {
                try {
                    await tx.query('ROLLBACK TO SAVEPOINT notif_outbox');
                    await tx.query('RELEASE SAVEPOINT notif_outbox');
                } catch (_) { /* ignore rollback failure */ }
                throw innerErr;
            }
        } catch (err) {
            logger.error(`[NotificationAgg] notification failed for ${ticketId}: ${err.message}`);
        }

        confirmedTickets.push({ ...ticketData, status: 'paid' });
        logger.info(`[confirmPaymentForOrder] Ticket ${ticketId} confirmed (order ${orderId}).`);
    }

    if (paymentAttempt && paymentAttempt.status !== PAYMENT_STATUS.SUCCEEDED) {
        await orderRepository.updatePaymentAttemptInTransaction(tx, paymentAttempt.id, {
            status: PAYMENT_STATUS.SUCCEEDED,
            completedAt: Date.now(),
            providerTransactionId: zpTransId || paymentAttempt.providerTransactionId,
        });
    }

    if (orderData && orderData.status !== ORDER_STATUS.PAID) {
        await orderRepository.updateOrderStatusInTransaction(tx, orderId, ORDER_STATUS.PAID, Date.now());
        if (orderData.organizerId) {
            const settings = await orderRepository.getOrganizerSettingsInTransaction(tx, orderData.organizerId);
            const platformFeeRate = settings ? settings.platformFeeRate : 0.05;
            const grossAmount = Number(orderData.totalAmount || 0);
            const platformFee = Number((grossAmount * platformFeeRate).toFixed(2));
            const netAmount = Number((grossAmount - platformFee).toFixed(2));
            await orderRepository.createLedgerEntryInTransaction(tx, {
                id: `led_${uuidv4()}`,
                orderId: orderData.id,
                organizerId: orderData.organizerId,
                grossAmount,
                platformFee,
                netAmount,
                createdAt: Date.now(),
            });
        }
    }

    await promotionService.redeemReservedDiscountInTransaction(tx, orderId);

    await cacheNamespace.invalidateSeatAvailability(orderData.eventId);
    logger.info(`[confirmPaymentForOrder] Order ${orderId}: ${confirmedTickets.length}/${ticketIds.length} tickets.`);
    return { orderId, confirmedCount: confirmedTickets.length, tickets: confirmedTickets };
};

const confirmPaymentForOrder = async (orderId, ticketIds, zpTransId = null) => {
    return ticketRepository.runTransaction(async (tx) => {
        return confirmPaymentForOrderInTransaction(tx, orderId, zpTransId);
    });
};

const failOrderPayment = async (orderId, reason = 'Payment failed', tx = null) => {
    const execute = async (transaction) => {
        const order = await orderRepository.getOrderInTransaction(transaction, orderId);
        if (!order) throw new NotFoundError('Order not found.');
        if (order.status === ORDER_STATUS.PAID) return order;
        const items = await orderRepository.getOrderItemsInTransaction(transaction, orderId);
        for (const item of items) {
            if (!item.ticketId) continue;
            const ticket = await ticketRepository.getTicketInTransaction(transaction, item.ticketId);
            if (!ticket || ticket.status !== 'pending') continue;
            await ticketRepository.updateTicketInTransaction(transaction, ticket.id, { status: 'cancelled', updatedAt: Date.now() });
            await eventRepository.incrementEventTicketTypeAvailableInTransaction(transaction, ticket.eventId, ticket.type, ticket.quantity || 1);
        }
        const seatHold = order.rawData?.seatHold;
        if (seatHold) {
            await seatRepository.releasePerformanceSeatHold({
                userId: order.userId,
                eventId: order.eventId,
                performanceId: seatHold.performanceId,
                holdToken: seatHold.holdToken,
                seatIds: normalizeSeatIds(seatHold.seatIds),
            }, transaction);
        }
        await promotionService.releaseReservedDiscountInTransaction(transaction, orderId);
        await orderRepository.updateOrderStatusInTransaction(transaction, orderId, ORDER_STATUS.FAILED, null);
        await cacheNamespace.invalidateSeatAvailability(order.eventId);
        return { ...order, status: ORDER_STATUS.FAILED, reason };
    };
    return tx ? execute(tx) : ticketRepository.runTransaction(execute);
};

const getSeatsWithStatuses = async (eventId) => {
    return await seatRepository.getSeatsWithStatuses(eventId);
};

const getPerformanceSeatAvailability = async (eventId, performanceId = null) => (
    seatRepository.getPerformanceSeatAvailability(eventId, performanceId)
);

const cachePerformanceSeatStatuses = async (performanceId, seatIds, status, ttlSeconds = 600) => {
    await Promise.all(seatIds.map((seatId) => cacheProvider.set(
        `seat:status:${performanceId}:${seatId}`,
        JSON.stringify({ status, updatedAt: Date.now() }),
        ttlSeconds
    )));
};

const holdPerformanceSeats = async (userId, eventId, performanceId, seatIds) => {
    const normalizedSeatIds = normalizeSeatIds(seatIds);
    const holdToken = `seat_hold_${uuidv4()}`;
    const result = await ticketRepository.runTransaction((transaction) => (
        seatRepository.holdPerformanceSeats({
            userId,
            eventId,
            performanceId,
            seatIds: normalizedSeatIds,
            holdToken,
            expiresAt: Date.now() + PERFORMANCE_SEAT_HOLD_TTL_MS,
        }, transaction)
    ));
    if (!result.held) throw seatAlreadyReservedError();
    const heldSeatIds = result.seats.map((seat) => seat.seatId).sort();
    const expiresAt = result.seats.reduce((latest, seat) => Math.max(latest, Number(seat.expiresAt) || 0), 0);
    await cachePerformanceSeatStatuses(performanceId, heldSeatIds, seatRepository.PERFORMANCE_SEAT_STATUSES.HELD);
    await cacheNamespace.invalidateSeatAvailability(eventId);
    const io = getIo();
    if (io) io.to(`event_${eventId}`).emit('seat:held', { eventId, performanceId, seatIds: heldSeatIds, holdToken, expiresAt });
    return { eventId, performanceId, holdToken, seatIds: heldSeatIds, expiresAt, status: seatRepository.PERFORMANCE_SEAT_STATUSES.HELD };
};

const releasePerformanceSeatHold = async (userId, eventId, performanceId, holdToken, seatIds = null) => {
    const normalizedSeatIds = seatIds ? normalizeSeatIds(seatIds) : null;
    const result = await ticketRepository.runTransaction((transaction) => (
        seatRepository.releasePerformanceSeatHold({ userId, eventId, performanceId, holdToken, seatIds: normalizedSeatIds }, transaction)
    ));
    if (!result.released) throw seatAlreadyReservedError();
    await cachePerformanceSeatStatuses(performanceId, result.seatIds, seatRepository.PERFORMANCE_SEAT_STATUSES.AVAILABLE);
    await cacheNamespace.invalidateSeatAvailability(eventId);
    const io = getIo();
    if (io) io.to(`event_${eventId}`).emit('seat:released', { eventId, performanceId, seatIds: result.seatIds });
    return { eventId, performanceId, holdToken, seatIds: result.seatIds, status: seatRepository.PERFORMANCE_SEAT_STATUSES.AVAILABLE };
};

module.exports = {
    getTicketsByUserId,
    bookTicket,
    bookOrderAtomic,
    createCheckout,
    submitOrderAttendees,
    cancelPendingTicket,
    confirmTicketPayment,
    confirmPaymentForOrder,
    confirmPaymentForOrderInTransaction,
    failOrderPayment,
    failTicketPayment,
    getTicketDetailsById,
    holdSeat,
    releaseSeat,
    bookHeldSeats,
    getSeatsWithStatuses,
    getPerformanceSeatAvailability,
    holdPerformanceSeats,
    releasePerformanceSeatHold,
};
