#!/usr/bin/env node
/**
 * smoke.repeated-booking.js
 *
 * Validates that consecutive ticket bookings on the same event:
 *  1. Correctly decrement the ticket type availability.
 *  2. Keep availability consistent in both the `ticket_types` column and the `raw_data` column.
 *  3. Do NOT corrupt or overwrite other fields (like name, description) inside `raw_data` when nested paths are updated.
 *
 * Run: node scripts/smoke.repeated-booking.js
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

require('./../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const ticketService = require('@/modules/tickets/application/service');
const eventRepository = require('@/providers/database/event.repository');

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
    console.log('smoke.repeated-booking.js');
    console.log('─────────────────────────');

    const testUserId = `usr_test_${uuidv4()}`;
    const testEventId = `evt_test_rep_${uuidv4()}`;
    const now = Date.now();

    console.log('\n  [Setup]');

    const ticketTypes = {
        vip: { name: 'VIP', price: 100000, available: 10, total: 10 },
        standard: { name: 'Standard', price: 50000, available: 20, total: 20 },
    };

    // Create the event with complete data, setting raw_data properly
    const eventData = {
        name: 'Repeated Booking Test Event',
        description: 'Test event description',
        date: now,
        eventType: 'physical',
        organizerId: testUserId,
        ticketTypes: ticketTypes,
        minPrice: 50000,
        status: 'active',
        visibility: 'public',
        category: ['music'],
        tags: ['rock'],
        sponsors: [],
        createdAt: now,
        lastUpdatedAt: now,
    };

    await eventRepository.createEvent(testEventId, eventData);
    assert(`test event "${testEventId}" created via repository`, true);

    // Verify initial values in DB
    let ev = await eventRepository.getEventById(testEventId);
    assert('initial name matches', ev.name === 'Repeated Booking Test Event');
    assert('initial vip available is 10', ev.ticketTypes.vip.available === 10);
    assert('initial standard available is 20', ev.ticketTypes.standard.available === 20);

    // ── Booking 1 (Quantity: 2) ──
    console.log('\n  [Booking 1: quantity = 2]');
    const t1 = await ticketService.bookTicket(testUserId, testEventId, 'vip', 2);
    assert('booking 1 ticket created', t1 && t1.id.startsWith('tkt_'));

    // Fetch and verify event values after booking 1
    ev = await eventRepository.getEventById(testEventId);
    assert('name intact after booking 1', ev.name === 'Repeated Booking Test Event');
    assert('description intact after booking 1', ev.description === 'Test event description');
    assert('category intact after booking 1', ev.category && ev.category[0] === 'music');
    assert('vip available is 8 in DB projection', ev.ticketTypes.vip.available === 8);
    assert('standard available is still 20 in DB projection', ev.ticketTypes.standard.available === 20);

    // Read raw columns directly from database
    const row1 = (await query('SELECT ticket_types, raw_data FROM events WHERE id = $1', [testEventId])).rows[0];
    assert('typed ticket_types vip available is 8', row1.ticket_types.vip.available === 8);
    assert('raw_data vip available is 8', row1.raw_data.ticketTypes.vip.available === 8);
    assert('raw_data name intact', row1.raw_data.name === 'Repeated Booking Test Event');

    // ── Booking 2 (Quantity: 3) ──
    console.log('\n  [Booking 2: quantity = 3]');
    const t2 = await ticketService.bookTicket(testUserId, testEventId, 'vip', 3);
    assert('booking 2 ticket created', t2 && t2.id.startsWith('tkt_'));

    // Fetch and verify event values after booking 2
    ev = await eventRepository.getEventById(testEventId);
    assert('name intact after booking 2', ev.name === 'Repeated Booking Test Event');
    assert('vip available is 5 in DB projection', ev.ticketTypes.vip.available === 5);
    assert('standard available is still 20 in DB projection', ev.ticketTypes.standard.available === 20);

    // Read raw columns directly from database after booking 2
    const row2 = (await query('SELECT ticket_types, raw_data FROM events WHERE id = $1', [testEventId])).rows[0];
    assert('typed ticket_types vip available is 5', row2.ticket_types.vip.available === 5);
    assert('raw_data vip available is 5', row2.raw_data.ticketTypes.vip.available === 5);
    assert('raw_data name still intact', row2.raw_data.name === 'Repeated Booking Test Event');

    // ── Cleanup ──
    console.log('\n  [Cleanup]');

    // Find and delete the orders / payment attempts associated with test tickets
    const link1 = await orderRepositoryLinkInfo(t1.id);
    const link2 = await orderRepositoryLinkInfo(t2.id);

    if (link1 && link1.orderId) {
        await query('UPDATE tickets SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL WHERE id = $1', [t1.id]);
        await query('DELETE FROM payment_attempts WHERE order_id = $1', [link1.orderId]);
        await query('DELETE FROM order_items WHERE order_id = $1', [link1.orderId]);
        await query('DELETE FROM orders WHERE id = $1', [link1.orderId]);
    }
    if (link2 && link2.orderId) {
        await query('UPDATE tickets SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL WHERE id = $1', [t2.id]);
        await query('DELETE FROM payment_attempts WHERE order_id = $1', [link2.orderId]);
        await query('DELETE FROM order_items WHERE order_id = $1', [link2.orderId]);
        await query('DELETE FROM orders WHERE id = $1', [link2.orderId]);
    }

    await query('DELETE FROM tickets WHERE id IN ($1, $2)', [t1.id, t2.id]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);

    assert('cleanup completed', true);

    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

async function orderRepositoryLinkInfo(ticketId) {
    try {
        const orderRepository = require('@/providers/database/order.repository');
        return await orderRepository.getTicketOrderLink(ticketId);
    } catch (e) {
        return null;
    }
}

run().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
