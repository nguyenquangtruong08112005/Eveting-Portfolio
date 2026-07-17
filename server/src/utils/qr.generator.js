/**
 * QR utilities for ticket display and validation payloads.
 *
 * Ticket JWT signing (check-in authority) lives in:
 *   modules/tickets/application/helpers/qr-code.helper.js
 *
 * This module provides portable helpers for content encoding and stable ticket codes
 * so booking paths never import an empty file.
 */

const crypto = require('crypto');

/**
 * @param {string|object} payload
 * @returns {string} content suitable for QR payload / client rendering
 */
function generateQrContent(payload) {
  if (payload == null) {
    throw new Error('QR payload is required');
  }
  if (typeof payload === 'string') {
    return payload;
  }
  return JSON.stringify(payload);
}

/**
 * Short stable code derived from ticket id (display / offline backup).
 * @param {string|number} ticketId
 * @returns {string}
 */
function generateTicketCode(ticketId) {
  if (ticketId == null || ticketId === '') {
    throw new Error('ticketId is required');
  }
  return crypto
    .createHash('sha256')
    .update(String(ticketId))
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

/**
 * Build a structured ticket QR payload object (client may render as QR image).
 * @param {{ ticketId: string, eventId?: string, userId?: string, token?: string }} parts
 */
function buildTicketQrPayload(parts) {
  if (!parts || !parts.ticketId) {
    throw new Error('ticketId is required');
  }
  return {
    v: 1,
    ticketId: String(parts.ticketId),
    eventId: parts.eventId != null ? String(parts.eventId) : undefined,
    userId: parts.userId != null ? String(parts.userId) : undefined,
    token: parts.token || undefined,
    code: generateTicketCode(parts.ticketId)
  };
}

module.exports = {
  generateQrContent,
  generateTicketCode,
  buildTicketQrPayload
};
