// Smoke test for Ticket repository (Postgres, read-only only)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.tickets.js
//   DATABASE_URL=postgres://... TICKET_SMOKE_ID=<id> node scripts/smoke.tickets.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.TICKET_DATABASE_PROVIDER = 'postgres';

async function smoke() {
require('../src/alias-bootstrap');
  const ticketRepo = require('../src/providers/database/ticket.repository');

  console.log('Ticket repository provider: ' + process.env.TICKET_DATABASE_PROVIDER);
  console.log('');

  const smokeId = process.env.TICKET_SMOKE_ID || 'tkt_alice_vdf_1';
  console.log('Looking up ticket by id: ' + smokeId);
  const ticket = await ticketRepo.getTicketById(smokeId);
  if (ticket) {
    console.log('Found (getTicketById): ' + JSON.stringify(ticket, null, 2));
  } else {
    console.log('Not found via getTicketById');
  }

  if (ticket) {
    console.log('');
    console.log('Testing getTicketsByUserId for user: ' + ticket.userId);
    const userTickets = await ticketRepo.getTicketsByUserId(ticket.userId);
    console.log('getTicketsByUserId returned ' + userTickets.length + ' tickets');
    if (userTickets.length > 0) {
      console.log('First user ticket: ' + JSON.stringify(userTickets[0], null, 2));
    }

    console.log('');
    console.log('Testing getAttendeeTicketsByEventId for event: ' + ticket.eventId);
    const attendeeTickets = await ticketRepo.getAttendeeTicketsByEventId(ticket.eventId);
    console.log('getAttendeeTicketsByEventId returned ' + attendeeTickets.length + ' attendee tickets');

    console.log('');
    console.log('Testing getPaidTicketsByEventId for event: ' + ticket.eventId);
    const paidTickets = await ticketRepo.getPaidTicketsByEventId(ticket.eventId);
    console.log('getPaidTicketsByEventId returned ' + paidTickets.length + ' paid tickets');
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
