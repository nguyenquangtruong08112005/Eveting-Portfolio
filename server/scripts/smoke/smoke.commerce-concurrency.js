#!/usr/bin/env node
/* Order checkout contention smoke: one remaining ticket, two concurrent orders. */
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  [PASS] ${message}`);
}

async function run() {
  const suffix = uuidv4();
  const eventId = `evt_checkout_race_${suffix}`;
  const users = [`usr_checkout_a_${suffix}`, `usr_checkout_b_${suffix}`];
  const type = { id: `${eventId}:only`, name: 'Only', price: 75000, available: 1, total: 1 };
  const now = Date.now();
  try {
    for (const userId of users) {
      await query('INSERT INTO auth_users (id,email,password_hash,roles,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,true,NOW(),NOW())', [userId, `${userId}@smoke.test`, 'x', ['user']]);
      await query('INSERT INTO user_profiles (id,name,created_at,updated_at) VALUES ($1,$2,NOW(),NOW())', [userId, userId]);
    }
    await query(
      `INSERT INTO events (id,name,description,start_at,event_type,organizer_id,min_price,status,visibility,lifecycle_status,category,tags,sponsors,hot_score,view_count,required_age,is_outdoor,created_at,last_updated_at,raw_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [eventId, 'Checkout race', 'race', new Date(now), 'physical', users[0], 75000, 'active', 'public', 'published', [], [], JSON.stringify([]), 0, 0, 0, false, new Date(now), new Date(now), JSON.stringify({ ticketTypes: { only: type } })]
    );
    await query('INSERT INTO event_ticket_types (id,event_id,code,name,price,capacity,available,sold_count,sort_order,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,1,1,0,0,true,NOW(),NOW())', [type.id, eventId, 'only', type.name, type.price]);

    const results = await Promise.allSettled(users.map((userId) => ticketService.createCheckout(userId, {
      eventId, items: [{ ticketType: 'only', quantity: 1 }],
    })));
    assert(results.filter((result) => result.status === 'fulfilled').length === 1, 'exactly one concurrent checkout succeeds');
    assert(results.filter((result) => result.status === 'rejected').length === 1, 'one concurrent checkout is rejected for availability');
    const orders = await query('SELECT COUNT(*)::int AS count FROM orders WHERE event_id = $1', [eventId]);
    const tickets = await query('SELECT COUNT(*)::int AS count FROM tickets WHERE event_id = $1', [eventId]);
    const available = await query('SELECT available FROM event_ticket_types WHERE event_id = $1 AND code = $2', [eventId, 'only']);
    assert(orders.rows[0].count === 1 && tickets.rows[0].count === 1, 'losing checkout leaves no orphan order or ticket');
    assert(Number(available.rows[0].available) === 0, 'availability is decremented exactly once');
  } finally {
    await query('DELETE FROM payment_attempts WHERE order_id IN (SELECT id FROM orders WHERE event_id = $1)', [eventId]);
    await query('DELETE FROM tickets WHERE event_id = $1', [eventId]);
    await query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE event_id = $1)', [eventId]);
    await query('DELETE FROM orders WHERE event_id = $1', [eventId]);
    await query('DELETE FROM event_ticket_types WHERE event_id = $1', [eventId]);
    await query('DELETE FROM events WHERE id = $1', [eventId]);
    for (const userId of users) await query('DELETE FROM auth_users WHERE id = $1', [userId]);
  }
}

run()
  .then(() => console.log('commerce concurrency smoke passed'))
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool().end();
    process.exit(process.exitCode || 0);
  });
