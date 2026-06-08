const jwt = require('jsonwebtoken');
const config = require('@/shared/config/env.config');

const TICKET_SECRET = config.jwtTicketSecret;

function generateTicketQR(ticketId, userId, eventId, quantity) {
  const qrPayload = {
    ticketId: ticketId,
    userId: userId,
    eventId: eventId,
    quantity: quantity
  };
  return jwt.sign(qrPayload, TICKET_SECRET);
}

module.exports = { generateTicketQR };
