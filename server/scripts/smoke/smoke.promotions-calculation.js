#!/usr/bin/env node
/**
 * smoke.promotions-calculation.js
 *
 * Validates:
 *  1. Percentage discount calculation (e.g. 20% off) for standard booking.
 *  2. Amount discount calculation (e.g. 30,000 VND off) for standard booking.
 *  3. Percentage discount calculation for seating booking (bookHeldSeats) and that promo used_count is incremented.
 *  4. Transactional release (decrement used_count) on cancelPendingTicket.
 *  5. Transactional release (decrement used_count) on failTicketPayment.
 *  6. Usage limit enforcement (returns ConflictError when usage_limit is reached).
 */

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';
process.env.EVENT_DATABASE_PROVIDER = 'postgres';
process.env.ORDER_DATABASE_PROVIDER = 'postgres';
process.env.TICKET_DATABASE_PROVIDER = 'postgres';
process.env.PROMOTION_DATABASE_PROVIDER = 'postgres';

require('../../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const ticketService = require('@/modules/tickets/application/service');
const eventRepository = require('@/providers/database/event.repository');
const seatRepository = require('@/providers/database/seat.repository');
const promotionRepository = require('@/providers/database/promotion.repository');

const PASS = [];
const FAIL = [];

function assert(label, condition) {
    if (condition) {
        console.log(`  ✓ ${label}`);
        PASS.push(label);
    } else {
        console.log(`  ✗ ${label}`);
        FAIL.push(label);
    }
}

async function run() {
    console.log('');
    console.log('smoke.promotions-calculation.js');
    console.log('────────────────────────────────');

    const testUserId = `usr_promo_${uuidv4()}`;
    const testOrganizerId = `org_promo_${uuidv4()}`;
    const testEventId = `evt_promo_${uuidv4()}`;
    const testMapId = `map_promo_${uuidv4()}`;
    const testSectionId = `sec_promo_${uuidv4()}`;
    const testSeatId = `seat_promo_${uuidv4()}`;
    const now = Date.now();

    console.log('\n  [Setup Test DB Data]');

    // Insert user
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'Promo Test User', 'mock_hash', $3, true)`,
        [testUserId, `promo_${uuidv4()}@test.com`, ['user']]
    );

    // Insert Event
    const ticketTypes = {
        standard: { name: 'Standard', price: 100000, available: 10, total: 10 },
    };
    await eventRepository.createEvent(testEventId, {
        name: 'Promo Test Event',
        description: 'Testing promo codes',
        date: now,
        eventType: 'physical',
        organizerId: testOrganizerId,
        ticketTypes: ticketTypes,
        minPrice: 100000,
        status: 'active',
        visibility: 'public',
        createdAt: now,
        lastUpdatedAt: now,
    });

    // Insert Seat Map, Section, Seat for seating test
    await seatRepository.createSeatMap(testMapId, { name: 'Promo Hall', totalRows: 5, totalCols: 5 });
    await seatRepository.createSeatSections([{ id: testSectionId, seatMapId: testMapId, name: 'Main Section' }]);
    await seatRepository.createSeats([{ id: testSeatId, seatSectionId: testSectionId, rowName: 'A', seatNumber: 1, status: 'available' }]);

    // Create promotions
    const promoCodePercent = `PERC20_${uuidv4().substring(0,8).toUpperCase()}`;
    const promoCodeAmount = `AMT30_${uuidv4().substring(0,8).toUpperCase()}`;
    const promoCodeLimit = `LIMIT1_${uuidv4().substring(0,8).toUpperCase()}`;

    // Percent Promo (20% off)
    const promoPercentData = {
        id: `promo_${uuidv4()}`,
        organizerId: testOrganizerId,
        code: promoCodePercent,
        name: '20 Percent Off',
        discountType: 'percent',
        discountValue: 0.20,
        minTicketQuantity: 1,
        validFrom: now - 3600000,
        validUntil: now + 3600000,
        usageLimit: 100,
        usedCount: 0,
        isPublic: true,
        createdAt: now
    };
    await promotionRepository.createPromotion(promoPercentData.id, promoPercentData);

    // Amount Promo (30,000 VND off)
    const promoAmountData = {
        id: `promo_${uuidv4()}`,
        organizerId: testOrganizerId,
        code: promoCodeAmount,
        name: '30k VND Off',
        discountType: 'amount',
        discountValue: 30000,
        minTicketQuantity: 1,
        validFrom: now - 3600000,
        validUntil: now + 3600000,
        usageLimit: 100,
        usedCount: 0,
        isPublic: true,
        createdAt: now
    };
    await promotionRepository.createPromotion(promoAmountData.id, promoAmountData);

    // Limit Promo (usage limit = 1)
    const promoLimitData = {
        id: `promo_${uuidv4()}`,
        organizerId: testOrganizerId,
        code: promoCodeLimit,
        name: 'Limit One Code',
        discountType: 'percent',
        discountValue: 0.50,
        minTicketQuantity: 1,
        validFrom: now - 3600000,
        validUntil: now + 3600000,
        usageLimit: 1,
        usedCount: 0,
        isPublic: true,
        createdAt: now
    };
    await promotionRepository.createPromotion(promoLimitData.id, promoLimitData);

    // --- TEST 1: Percentage Discount ---
    console.log('\n  [Test 1: Percentage Discount (20% Off)]');
    const tkt1 = await ticketService.bookTicket(testUserId, testEventId, 'standard', 1, promoCodePercent);
    assert('Ticket booked with percent promo has correct price (80k instead of 100k)', tkt1.price === 80000);
    assert('Ticket originalPrice remains 100k', tkt1.originalPrice === 100000);
    assert('Ticket has promo code linked', tkt1.appliedPromoCode === promoCodePercent);

    let promoPercent = await promotionRepository.getPromotionById(promoPercentData.id);
    assert('Promotion usedCount incremented to 1', promoPercent.usedCount === 1);

    // --- TEST 2: Amount Discount ---
    console.log('\n  [Test 2: Amount Discount (30k VND Off)]');
    const tkt2 = await ticketService.bookTicket(testUserId, testEventId, 'standard', 1, promoCodeAmount);
    assert('Ticket booked with amount promo has correct price (70k)', tkt2.price === 70000);
    
    let promoAmount = await promotionRepository.getPromotionById(promoAmountData.id);
    assert('Amount promotion usedCount incremented to 1', promoAmount.usedCount === 1);

    // --- TEST 3: Seating Booking Promotion & Increment ---
    console.log('\n  [Test 3: Seating Booking Percent Discount]');
    // Hold seat first
    await ticketService.holdSeat(testUserId, testEventId, testSeatId);
    // Book held seat
    const seatBooking = await ticketService.bookHeldSeats(testUserId, testEventId, [testSeatId], promoCodePercent);
    const tktSeat = seatBooking.tickets[0];
    assert('Seat ticket price calculated with percent promo (80k)', tktSeat.price === 80000);
    assert('Seat ticket originalPrice is 100k', tktSeat.originalPrice === 100000);
    
    promoPercent = await promotionRepository.getPromotionById(promoPercentData.id);
    assert('Percent promotion usedCount incremented to 2 after seating booking', promoPercent.usedCount === 2);

    // --- TEST 4: Transactional Release on Cancel ---
    console.log('\n  [Test 4: Release Promo Usage on cancelPendingTicket]');
    await ticketService.cancelPendingTicket(tkt1.id);
    promoPercent = await promotionRepository.getPromotionById(promoPercentData.id);
    assert('Percent promotion usedCount decremented (released) back to 1 on ticket cancellation', promoPercent.usedCount === 1);

    // --- TEST 5: Transactional Release on Payment Failure ---
    console.log('\n  [Test 5: Release Promo Usage on failTicketPayment]');
    await ticketService.failTicketPayment(tkt2.id, 'Payment simulation failure');
    promoAmount = await promotionRepository.getPromotionById(promoAmountData.id);
    assert('Amount promotion usedCount decremented (released) back to 0 on payment failure', promoAmount.usedCount === 0);

    // --- TEST 6: Limit Enforcement ---
    console.log('\n  [Test 6: Promotion Usage Limit Enforcement]');
    // Book using limit-1 promo code once (succeeds)
    const tktLimit1 = await ticketService.bookTicket(testUserId, testEventId, 'standard', 1, promoCodeLimit);
    assert('First booking with limit-1 promo code succeeds', tktLimit1.price === 50000);
    
    let promoLimit = await promotionRepository.getPromotionById(promoLimitData.id);
    assert('Limit promotion usedCount is 1', promoLimit.usedCount === 1);

    // Try booking again with the same code (should fail due to usage limit)
    let limitErr = null;
    try {
        await ticketService.bookTicket(testUserId, testEventId, 'standard', 1, promoCodeLimit);
    } catch (e) {
        limitErr = e;
    }
    assert('Second booking with limit-1 promo code throws ConflictError', limitErr !== null && limitErr.statusCode === 409 && limitErr.message.includes('limit reached'));

    // Cancel the limit-1 ticket to verify it releases and allows booking again
    console.log('  [Re-releasing the limit promo code]');
    await ticketService.cancelPendingTicket(tktLimit1.id);
    promoLimit = await promotionRepository.getPromotionById(promoLimitData.id);
    assert('Limit promotion usedCount reset to 0 after cancellation', promoLimit.usedCount === 0);

    // Try booking again (should now succeed)
    const tktLimit2 = await ticketService.bookTicket(testUserId, testEventId, 'standard', 1, promoCodeLimit);
    assert('Booking succeeds after releasing limit-1 promo code', tktLimit2.price === 50000);

    console.log('\n  [Cleanup DB]');
    await query('DELETE FROM tickets WHERE id IN ($1, $2, $3, $4, $5)', [tkt1.id, tkt2.id, tktSeat.id, tktLimit1.id, tktLimit2.id]);
    await query('DELETE FROM seat_holds WHERE event_id = $1', [testEventId]);
    await query('DELETE FROM seats WHERE id = $1', [testSeatId]);
    await query('DELETE FROM seat_sections WHERE id = $1', [testSectionId]);
    await query('DELETE FROM seat_maps WHERE id = $1', [testMapId]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);
    await query('DELETE FROM promotions WHERE id IN ($1, $2, $3)', [promoPercentData.id, promoAmountData.id, promoLimitData.id]);
    await query('DELETE FROM auth_users WHERE id = $1', [testUserId]);

    assert('cleanup completed successfully', true);

    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled error:', err.message || err);
    process.exit(1);
});
