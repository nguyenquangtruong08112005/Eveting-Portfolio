const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const app = read('src/app.js');
const orders = read('src/modules/tickets/api/order-routes.js');
const legacyTickets = read('src/modules/tickets/api/routes.js');
const payments = read('src/modules/payments/api/routes.js');
const ticketService = read('src/modules/tickets/application/service.js');

assert.match(app, /app\.use\('\/api\/web\/orders', orderCheckoutRouter\)/);
assert.match(orders, /router\.post\(\s*'\/checkout'/);
assert.match(orders, /ticketController\.createCheckout/);
assert.match(orders, /router\.put\(\s*'\/:orderId\/attendees'/);
assert.match(orders, /body\('eventId'\)\.notEmpty/);
assert.match(orders, /ticketController\.submitOrderAttendees/);
assert.match(legacyTickets, /router\.post\('\/book'/);
assert.match(legacyTickets, /router\.post\('\/book-order'/);
assert.match(legacyTickets, /router\.post\('\/checkout'/);
assert.doesNotMatch(legacyTickets, /\/events\/:eventId\/seats\/confirm/);
assert.doesNotMatch(ticketService, /const convertPerformanceSeatHoldToSold/);
assert.match(ticketService, /confirmPaymentForOrderInTransaction/);
assert.match(ticketService, /seatRepository\.convertPerformanceSeatHoldToSold/);
assert.match(payments, /ticketId or orderId is required/);
assert.match(payments, /router\.post\(\s*'\/cancel'/);
assert.match(payments, /paymentController\.cancelPayment/);

console.log('order checkout contract smoke passed');
