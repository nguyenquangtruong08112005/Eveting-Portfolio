require('dotenv').config({ quiet: true });

require('../../src/alias-bootstrap');

const PASS = [];
const FAIL = [];

function assert(condition, msg) {
  if (!condition) {
    FAIL.push(msg);
    console.error('  [FAIL] ' + msg);
  } else {
    PASS.push(msg);
    console.log('  [PASS] ' + msg);
  }
}

function makeReq(user, params = {}, body = {}, query = {}) {
  return {
    user: user || null,
    params,
    body,
    query,
    originalUrl: '/test-url',
    method: 'POST',
  };
}

function makeRes() {
  const state = { statusCode: 200, body: null };
  function res() { return res; }
  res.status = function(code) { state.statusCode = code; return res; };
  res.send = function(body) { state.body = body; return res; };
  res.json = function(body) { state.body = body; return res; };
  res._state = state;
  return res;
}

async function run() {
  console.log('--- Phase 02-T1 RBAC & Ownership Enforcement Smoke Test ---');
  console.log('');

  const { requireRole, requireOwnership, userHasRole } = require('@/shared/middleware/authz.middleware');
  const eventRepository = require('@/providers/database/event.repository');
  const venueRepository = require('@/providers/database/venue.repository');
  const ticketRepository = require('@/providers/database/ticket.repository');
  const orderRepository = require('@/providers/database/order.repository');

  // --- Test 1: requireRole with single role and multiple roles ---
  console.log('--- Test 1: requireRole single & multiple roles ---');
  (function() {
    const mwSingle = requireRole('admin');
    const mwMulti = requireRole('admin', 'organizer');
    const mwArr = requireRole(['admin', 'organizer']);

    const adminReq = makeReq({ uid: 'u-admin', roles: ['admin'] });
    const orgReq = makeReq({ uid: 'u-org', roles: ['organizer'] });
    const attendeeReq = makeReq({ uid: 'u-attendee', roles: ['attendee'] });

    let passed1 = false, passed2 = false, passed3 = false, forbidden1 = false;

    mwSingle(adminReq, makeRes(), () => { passed1 = true; });
    mwMulti(orgReq, makeRes(), () => { passed2 = true; });
    mwArr(adminReq, makeRes(), () => { passed3 = true; });

    const resForb = makeRes();
    mwSingle(attendeeReq, resForb, () => {});
    forbidden1 = resForb._state.statusCode === 403;

    assert(passed1 === true, 'requireRole("admin") allows admin user');
    assert(passed2 === true, 'requireRole("admin", "organizer") allows organizer user');
    assert(passed3 === true, 'requireRole(["admin", "organizer"]) allows admin user');
    assert(forbidden1 === true, 'requireRole("admin") rejects attendee with 403');
  })();

  // --- Test 2: Attendee attempting to access Admin endpoint receives 403 ---
  console.log('\n--- Test 2: Attendee attempting to access Admin endpoint ---');
  (function() {
    const adminMiddleware = requireRole('admin');
    const attendeeReq = makeReq({ uid: 'attendee-123', roles: ['attendee'] });
    const res = makeRes();
    let calledNext = false;

    adminMiddleware(attendeeReq, res, () => { calledNext = true; });

    assert(calledNext === false, 'Attendee is blocked from admin endpoint');
    assert(res._state.statusCode === 403, 'Attendee gets HTTP 403 on admin endpoint');
    assert(res._state.body && res._state.body.error.includes('Forbidden'), 'Response includes Forbidden message');
  })();

  // --- Test 3: Unauthenticated user receives 401 ---
  console.log('\n--- Test 3: Unauthenticated user receives 401 ---');
  (function() {
    const mw = requireRole('organizer');
    const noUserReq = makeReq(null);
    const res = makeRes();
    let calledNext = false;

    mw(noUserReq, res, () => { calledNext = true; });

    assert(calledNext === false, 'Unauthenticated user blocked');
    assert(res._state.statusCode === 401, 'Returns HTTP 401');
    assert(res._state.body && res._state.body.error.includes('Unauthorized'), 'Response contains Unauthorized message');
  })();

  // --- Test 4: requireOwnership for Event (Organizer A vs Organizer B) ---
  console.log('\n--- Test 4: Organizer A cannot mutate Organizer B event ---');
  await (async function() {
    // Mock event repository getEventById
    const origGetEventById = eventRepository.getEventById;
    eventRepository.getEventById = async (id) => {
      if (id === 'evt-org-b') {
        return { id: 'evt-org-b', organizerId: 'org-b-id', name: 'Organizer B Event' };
      }
      return null;
    };

    try {
      const ownershipMw = requireOwnership('Event', 'eventId');

      // Organizer A request attempting to mutate Event owned by Organizer B
      const orgAReq = makeReq({ uid: 'org-a-id', roles: ['organizer'] }, { eventId: 'evt-org-b' });
      const resA = makeRes();
      let calledNextA = false;

      await ownershipMw(orgAReq, resA, () => { calledNextA = true; });

      assert(calledNextA === false, 'Organizer A is blocked from mutating Organizer B event');
      assert(resA._state.statusCode === 403, 'Organizer A receives HTTP 403');
      assert(resA._state.body && resA._state.body.error.includes('Forbidden'), 'HTTP 403 payload includes Forbidden error message');

      // Organizer B request mutating their own event
      const orgBReq = makeReq({ uid: 'org-b-id', roles: ['organizer'] }, { eventId: 'evt-org-b' });
      const resB = makeRes();
      let calledNextB = false;

      await ownershipMw(orgBReq, resB, () => { calledNextB = true; });

      assert(calledNextB === true, 'Organizer B is allowed to mutate their own event');
      assert(orgBReq.targetResource && orgBReq.targetResource.id === 'evt-org-b', 'Target resource attached to request');

      // Admin bypass on Organizer B event
      const adminReq = makeReq({ uid: 'admin-id', roles: ['admin'] }, { eventId: 'evt-org-b' });
      const resAdmin = makeRes();
      let calledNextAdmin = false;

      await ownershipMw(adminReq, resAdmin, () => { calledNextAdmin = true; });

      assert(calledNextAdmin === true, 'Admin bypasses ownership check for Event');
    } finally {
      eventRepository.getEventById = origGetEventById;
    }
  })();

  // --- Test 5: requireOwnership for Venue, Order, Ticket ---
  console.log('\n--- Test 5: requireOwnership for Venue, Order, Ticket ---');
  await (async function() {
    const origGetVenue = venueRepository.getVenueById;
    const origGetTicket = ticketRepository.getTicketById;
    const origGetOrder = orderRepository.getOrderById;

    venueRepository.getVenueById = async (id) => ({ id, organizerId: 'org-owner-1' });
    ticketRepository.getTicketById = async (id) => ({ id, userId: 'user-owner-1', organizerId: 'event-org', eventId: 'evt-1' });
    orderRepository.getOrderById = async (id) => ({ id, userId: 'user-owner-1', organizerId: 'event-org' });

    try {
      const mwVenue = requireOwnership('Venue', 'venueId');
      const mwTicket = requireOwnership('Ticket', 'ticketId');
      const mwOrder = requireOwnership('Order', 'orderId');

      // Wrong user on venue
      const reqWrongVenue = makeReq({ uid: 'wrong-user', roles: ['organizer'] }, { venueId: 'v-1' });
      const resVenue = makeRes();
      await mwVenue(reqWrongVenue, resVenue, () => {});
      assert(resVenue._state.statusCode === 403, 'requireOwnership Venue returns 403 for non-owner');

      // Right user on venue
      const reqRightVenue = makeReq({ uid: 'org-owner-1', roles: ['organizer'] }, { venueId: 'v-1' });
      let venuePassed = false;
      await mwVenue(reqRightVenue, makeRes(), () => { venuePassed = true; });
      assert(venuePassed === true, 'requireOwnership Venue passes for owner');

      // Wrong user on ticket
      const reqWrongTicket = makeReq({ uid: 'wrong-user', roles: ['attendee'] }, { ticketId: 't-1' });
      const resTicket = makeRes();
      await mwTicket(reqWrongTicket, resTicket, () => {});
      assert(resTicket._state.statusCode === 403, 'requireOwnership Ticket returns 403 for non-owner');

      // Right user on ticket
      const reqRightTicket = makeReq({ uid: 'user-owner-1', roles: ['attendee'] }, { ticketId: 't-1' });
      let ticketPassed = false;
      await mwTicket(reqRightTicket, makeRes(), () => { ticketPassed = true; });
      assert(ticketPassed === true, 'requireOwnership Ticket passes for owner');

      // Wrong user on order
      const reqWrongOrder = makeReq({ uid: 'wrong-user', roles: ['attendee'] }, { orderId: 'o-1' });
      const resOrder = makeRes();
      await mwOrder(reqWrongOrder, resOrder, () => {});
      assert(resOrder._state.statusCode === 403, 'requireOwnership Order returns 403 for non-owner');

    } finally {
      venueRepository.getVenueById = origGetVenue;
      ticketRepository.getTicketById = origGetTicket;
      orderRepository.getOrderById = origGetOrder;
    }
  })();

  // --- Test 6: Invalid payload params rejected with 400 express-validator payload ---
  console.log('\n--- Test 6: express-validator 400 error payload ---');
  await (async function() {
    const { param } = require('express-validator');
    const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
    const { AppError } = require('@/shared/errors');

    const chain = param('eventId').notEmpty().withMessage('eventId is required');
    const invalidReq = makeReq({ uid: 'u1' }, {}); // empty params
    await chain(invalidReq, makeRes(), () => {});

    let caughtError = null;
    try {
      validateRequest(invalidReq, makeRes(), () => {});
    } catch (err) {
      caughtError = err;
    }

    assert(caughtError !== null, 'validateRequest throws Error when validation fails');
    assert(caughtError instanceof AppError, 'Thrown error is instance of AppError');
    assert(caughtError.statusCode === 400, 'Error status code is 400');
    assert(caughtError.message.includes('eventId is required'), 'Error message contains validation message');
  })();

  // --- Test 7: Ticket with BOTH userId AND organizerId — buyer passes, wrong user 403, event organizer fallback ---
  console.log('\n--- Test 7: Ticket dual-owner regression (buyer userId vs organizerId) ---');
  await (async function() {
    const origGetTicket = ticketRepository.getTicketById;
    const origGetEvent = eventRepository.getEventById;

    ticketRepository.getTicketById = async (id) => {
      if (id === 'tkt-dual') {
        return { id: 'tkt-dual', userId: 'buyer-42', organizerId: 'org-99', eventId: 'evt-dual' };
      }
      return null;
    };

    eventRepository.getEventById = async (id) => {
      if (id === 'evt-dual') {
        return { id: 'evt-dual', organizerId: 'org-99' };
      }
      return null;
    };

    try {
      const mwTicket = requireOwnership('Ticket', 'ticketId');

      // 7a: Purchaser (userId) must pass — this is the regression fix
      const reqBuyer = makeReq({ uid: 'buyer-42', roles: ['attendee'] }, { ticketId: 'tkt-dual' });
      let buyerPassed = false;
      await mwTicket(reqBuyer, makeRes(), () => { buyerPassed = true; });
      assert(buyerPassed === true, 'requireOwnership Ticket with both organizerId+userId passes for purchaser userId');

      // 7b: Wrong user must still get 403
      const reqIntruder = makeReq({ uid: 'intruder-99', roles: ['attendee'] }, { ticketId: 'tkt-dual' });
      const resIntruder = makeRes();
      await mwTicket(reqIntruder, resIntruder, () => {});
      assert(resIntruder._state.statusCode === 403, 'requireOwnership Ticket with both fields returns 403 for wrong user');

      // 7c: Event organizer fallback must still work
      const reqOrgFallback = makeReq({ uid: 'org-99', roles: ['organizer'] }, { ticketId: 'tkt-dual' });
      let orgFallbackPassed = false;
      await mwTicket(reqOrgFallback, makeRes(), () => { orgFallbackPassed = true; });
      assert(orgFallbackPassed === true, 'requireOwnership Ticket allows event organizer fallback');
    } finally {
      ticketRepository.getTicketById = origGetTicket;
      eventRepository.getEventById = origGetEvent;
    }
  })();

  console.log('');
  console.log('=== Results ===');
  console.log('  PASS: ' + PASS.length);
  console.log('  FAIL: ' + FAIL.length);

  if (FAIL.length > 0) {
    console.error('FAILURES:');
    for (const f of FAIL) {
      console.error('  - ' + f);
    }
    process.exit(1);
  } else {
    console.log('All RBAC & Ownership enforcement smoke tests passed.');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
