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
const { getIo } = require('@/shared/socket/socket-server');
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
const eventPublisher = require('@/shared/events/event-publisher');
const outboxProcessor = require('@/shared/events/outbox-processor');

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
                    organizerId: eventData.organizerId,
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

        if (ticketData.appliedPromoCode) {
            const promo = await promotionRepository.findPromoByCodeInTransaction(transaction, ticketData.appliedPromoCode);
            if (promo) {
                await promotionRepository.decrementPromotionUsedCountInTransaction(transaction, promo._id || promo.id);
            }
        }

        console.log(`Ticket ${ticketId} cancelled, 1 ticket of type ${ticketData.type} returned to event ${ticketData.eventId}.`);
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
        try {
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
                    if (orderData) {
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
        } catch (err) {
            logger.error(`[ShadowPayment] Failed to update payment, order, or ledger for ticket ${ticketId}: ${err.message}`);
        }
        // ── End shadow payment_attempt, order status, and ledger update ──

        // ── Publish notification event to outbox ──
        try {
            const userProfileResult = await transaction.query('SELECT email, name FROM user_profiles WHERE id = $1', [ticketData.userId]);
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
        } catch (err) {
            logger.error(`[NotificationOutbox] Failed to publish outbox event: ${err.message}`);
        }

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
            status: 'failed',
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

        return { ...ticketData, status: 'failed' };
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

    let venueData = null;
    if (eventData.venueId) {
        venueData = await venueRepository.getVenueById(eventData.venueId);
    }

    return mapTicketDetailResponse(ticketData, eventData, venueData);
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
            [eventId, seatId, now]
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
            const ticketTypeData = eventData.ticketTypes[ticketType];
            if (!ticketTypeData) {
                throw new NotFoundError(`Ticket type '${ticketType}' does not exist for this event.`);
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
                ticketTypeId: 'standard',
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

        const io = getIo();
        if (io) {
            io.to(`event_${eventId}`).emit('seat:sold', { eventId, seatIds });
        }

        return { orderId: shadowOrderId, tickets };
    });
};

module.exports = {
    getTicketsByUserId,
    bookTicket,
    cancelPendingTicket,
    confirmTicketPayment,
    failTicketPayment,
    getTicketDetailsById,
    holdSeat,
    releaseSeat,
    bookHeldSeats,
};
