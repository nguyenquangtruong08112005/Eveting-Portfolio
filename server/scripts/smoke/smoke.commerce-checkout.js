#!/usr/bin/env node
/*
 * Focused authoritative-checkout smoke.
 * Requires a migrated local PostgreSQL database. It verifies mixed-ticket
 * atomicity, order-wide payment linking, promotion release, and stock rollback.
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
require('../../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const { query, getPool } = require('@/providers/database/postgres.client');
const ticketService = require('@/modules/tickets/application/service');
const orderRepository = require('@/providers/database/order.repository');
const promotionRepository = require('@/providers/database/promotion.repository');
const { PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  [PASS] ${message}`);
}

async function run() {
  const suffix = uuidv4();
  const userId = `usr_commerce_${suffix}`;
  const eventId = `evt_commerce_${suffix}`;
  const promoId = `pro_commerce_${suffix}`;
  const questionId = `question_commerce_${suffix}`;
  const now = Date.now();
  const types = {
    standard: { id: `${eventId}:standard`, name: 'Standard', price: 50000, available: 4, total: 4 },
    vip: { id: `${eventId}:vip`, name: 'VIP', price: 100000, available: 2, total: 2 },
  };

  try {
    await query('INSERT INTO auth_users (id, email, password_hash, roles, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,true,NOW(),NOW())', [userId, `${userId}@smoke.test`, 'x', ['user']]);
    await query('INSERT INTO user_profiles (id, name, created_at, updated_at) VALUES ($1,$2,NOW(),NOW())', [userId, 'Commerce Smoke']);
    await query(
      `INSERT INTO events (id, name, description, start_at, event_type, organizer_id, min_price, status, visibility, lifecycle_status, category, tags, sponsors, hot_score, view_count, required_age, is_outdoor, created_at, last_updated_at, raw_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [eventId, 'Commerce Smoke', 'checkout', new Date(now), 'physical', userId, 50000, 'active', 'public', 'published', [], [], JSON.stringify([]), 0, 0, 0, false, new Date(now), new Date(now), JSON.stringify({ ticketTypes: types })]
    );
    for (const [code, type] of Object.entries(types)) {
      await query('INSERT INTO event_ticket_types (id,event_id,code,name,price,capacity,available,sold_count,sort_order,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,true,NOW(),NOW())', [type.id, eventId, code, type.name, type.price, type.total, type.available]);
    }
    await query(
      'INSERT INTO event_custom_questions (id,event_id,question_text,question_type,is_required,options,sort_order,created_at,updated_at) VALUES ($1,$2,$3,$4,true,$5,0,NOW(),NOW())',
      [questionId, eventId, 'Dietary requirement', 'text', JSON.stringify([])]
    );
    await promotionRepository.createPromotion(promoId, {
      organizerId: userId, code: `SAVE${suffix.slice(0, 8).toUpperCase()}`, eventId, validFrom: now - 1000, validUntil: now + 60000,
      usageLimit: 2, usedCount: 0, ticketUsageLimit: 10, usedTicketCount: 0, perUserLimit: 1,
      minTicketQuantity: 1, discountType: 'amount', discountValue: 10000, minOrder: 0, isPublic: true, isEnabled: true, createdAt: now,
    });

    const checkout = await ticketService.createCheckout(userId, {
      eventId,
      items: [{ ticketType: 'standard', quantity: 2 }, { ticketType: 'vip', quantity: 1 }],
      promoCode: `SAVE${suffix.slice(0, 8).toUpperCase()}`,
      attendees: [
        { name: 'Smoke One', email: 'one@smoke.test', answers: { [questionId]: 'Vegetarian' } },
        { name: 'Smoke Two', email: 'two@smoke.test', answers: { [questionId]: 'None' } },
        { name: 'Smoke Three', email: 'three@smoke.test', answers: { [questionId]: 'Vegan' } },
      ],
    });
    assert(checkout.tickets.length === 2, 'mixed checkout creates exactly two linked ticket records');
    assert(checkout.totalAmount === 190000, 'server calculates integer-VND order total once');
    const order = await orderRepository.getOrderById(checkout.orderId);
    assert(order.items.length === 2, 'order contains both ticket types');
    assert(order.items.reduce((sum, item) => sum + item.totalAmount, 0) === order.totalAmount, 'item totals reconcile to order total');
    const usage = (await query('SELECT status FROM voucher_usages WHERE order_id = $1', [checkout.orderId])).rows[0];
    assert(usage.status === 'reserved', 'promotion usage is reserved with the checkout transaction');
    const attendees = await query('SELECT attendee_name, answers, question_snapshot FROM order_attendees WHERE order_id = $1 ORDER BY sort_order', [checkout.orderId]);
    assert(attendees.rows.length === 3, 'custom attendee answers persist for every ticket in the order');
    assert(attendees.rows[0].answers[questionId] === 'Vegetarian', 'custom attendee answer is stored by question ID');
    assert(attendees.rows[0].question_snapshot.some((question) => question.id === questionId), 'order stores an immutable custom-question snapshot');

    const attemptId = `pa_commerce_${suffix}`;
    await orderRepository.createPaymentAttemptAndLinkOrderAtomic({
      id: attemptId, orderId: checkout.orderId, status: PAYMENT_STATUS.PROCESSING, provider: 'zalopay', paymentMethod: 'zalopay',
      providerOrderId: `smoke_${suffix}`, amount: checkout.totalAmount, currency: 'VND', createdAt: Date.now(), updatedAt: Date.now(),
    });
    const linked = await query('SELECT COUNT(*)::int AS count FROM tickets WHERE order_id = $1 AND payment_attempt_id = $2', [checkout.orderId, attemptId]);
    assert(linked.rows[0].count === 2, 'one payment attempt links every order ticket');

    await ticketService.failOrderPayment(checkout.orderId, 'smoke failure', null, attemptId);
    const cancelled = await query("SELECT COUNT(*)::int AS count FROM tickets WHERE order_id = $1 AND status = 'cancelled'", [checkout.orderId]);
    assert(cancelled.rows[0].count === 2, 'payment failure cancels every pending ticket');
    const released = (await query('SELECT status FROM voucher_usages WHERE order_id = $1', [checkout.orderId])).rows[0];
    assert(released.status === 'released', 'payment failure releases promotion usage');
    const availability = await query('SELECT code, available FROM event_ticket_types WHERE event_id = $1 ORDER BY code', [eventId]);
    assert(Number(availability.rows[0].available) === 4 && Number(availability.rows[1].available) === 2, 'payment failure restores all ticket availability');

    let failed = false;
    try {
      await ticketService.createCheckout(userId, { eventId, items: [{ ticketType: 'standard', quantity: 1 }, { ticketType: 'vip', quantity: 3 }] });
    } catch (_) {
      failed = true;
    }
    assert(failed, 'mixed checkout rejects unavailable ticket types');
    const orphanOrders = await query("SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1 AND event_id = $2 AND id <> $3", [userId, eventId, checkout.orderId]);
    assert(orphanOrders.rows[0].count === 0, 'failed mixed checkout leaves no orphan order or ticket');
  } finally {
    await query('DELETE FROM order_attendees WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [userId]);
    await query('DELETE FROM voucher_usages WHERE user_id = $1', [userId]);
    await query('DELETE FROM payment_attempts WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [userId]);
    await query('DELETE FROM tickets WHERE user_id = $1', [userId]);
    await query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [userId]);
    await query('DELETE FROM orders WHERE user_id = $1', [userId]);
    await query('DELETE FROM promotions WHERE id = $1', [promoId]);
    await query('DELETE FROM event_ticket_types WHERE event_id = $1', [eventId]);
    await query('DELETE FROM events WHERE id = $1', [eventId]);
    await query('DELETE FROM auth_users WHERE id = $1', [userId]);
  }
}

run()
  .then(() => console.log('commerce checkout smoke passed'))
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool().end();
    process.exit(process.exitCode || 0);
  });
