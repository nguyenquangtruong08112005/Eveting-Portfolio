const jwt = require('jsonwebtoken');
const config = require('@/shared/config/env.config');

const TICKET_SECRET = config.jwtTicketSecret;

function generateTicketQR(ticketId, userId, eventId, quantity, expiresIn = null) {
  const qrPayload = {
    ticketId: ticketId,
    userId: userId,
    eventId: eventId,
    quantity: quantity
  };
  const options = {};
  if (expiresIn) {
    options.expiresIn = expiresIn;
  }
  return jwt.sign(qrPayload, TICKET_SECRET, options);
}

module.exports = { generateTicketQR };
