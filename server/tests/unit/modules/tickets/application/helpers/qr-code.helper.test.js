const jwt = require('jsonwebtoken');
const { generateTicketQR } = require('@/modules/tickets/application/helpers/qr-code.helper');

describe('generateTicketQR', () => {
  it('returns a JWT string', () => {
    const token = generateTicketQR('tkt_1', 'u1', 'evt_1', 2);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('encodes payload fields', () => {
    const token = generateTicketQR('tkt_1', 'u1', 'evt_1', 2);
    const decoded = jwt.verify(token, process.env.JWT_TICKET_SECRET);
    expect(decoded.ticketId).toBe('tkt_1');
    expect(decoded.userId).toBe('u1');
    expect(decoded.eventId).toBe('evt_1');
    expect(decoded.quantity).toBe(2);
  });

  it('accepts optional expiresIn', () => {
    const token = generateTicketQR('tkt_1', 'u1', 'evt_1', 1, '1h');
    const decoded = jwt.verify(token, process.env.JWT_TICKET_SECRET);
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp - decoded.iat).toBe(3600);
  });

  it('omits exp when expiresIn is null', () => {
    const token = generateTicketQR('tkt_1', 'u1', 'evt_1', 1, null);
    const decoded = jwt.verify(token, process.env.JWT_TICKET_SECRET);
    expect(decoded.exp).toBeUndefined();
  });
});
