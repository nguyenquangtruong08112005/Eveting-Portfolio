const { generateQrContent, generateTicketCode, buildTicketQrPayload } = require('@/utils/qr.generator');

describe('generateQrContent', () => {
  it('throws when payload is null', () => {
    expect(() => generateQrContent(null)).toThrow('QR payload is required');
  });

  it('throws when payload is undefined', () => {
    expect(() => generateQrContent(undefined)).toThrow('QR payload is required');
  });

  it('returns the string when payload is a string', () => {
    expect(generateQrContent('hello')).toBe('hello');
  });

  it('returns the string when payload is an empty string', () => {
    expect(generateQrContent('')).toBe('');
  });

  it('returns JSON stringified object when payload is an object', () => {
    const obj = { ticketId: 'tkt_1', eventId: 'evt_1' };
    expect(generateQrContent(obj)).toBe(JSON.stringify(obj));
  });

  it('returns JSON stringified array when payload is an array', () => {
    expect(generateQrContent([1, 2, 3])).toBe('[1,2,3]');
  });

  it('returns JSON stringified number when payload is a number', () => {
    expect(generateQrContent(42)).toBe('42');
  });
});

describe('generateTicketCode', () => {
  it('throws when ticketId is null', () => {
    expect(() => generateTicketCode(null)).toThrow('ticketId is required');
  });

  it('throws when ticketId is undefined', () => {
    expect(() => generateTicketCode(undefined)).toThrow('ticketId is required');
  });

  it('throws when ticketId is empty string', () => {
    expect(() => generateTicketCode('')).toThrow('ticketId is required');
  });

  it('returns a 16-character uppercase hex string', () => {
    const code = generateTicketCode('tkt_123');
    expect(code).toMatch(/^[0-9A-F]{16}$/);
  });

  it('accepts a numeric ticketId', () => {
    const code = generateTicketCode(42);
    expect(code).toMatch(/^[0-9A-F]{16}$/);
  });

  it('is deterministic for the same input', () => {
    expect(generateTicketCode('abc')).toBe(generateTicketCode('abc'));
  });

  it('produces different codes for different inputs', () => {
    expect(generateTicketCode('abc')).not.toBe(generateTicketCode('xyz'));
  });
});

describe('buildTicketQrPayload', () => {
  it('throws when parts is null', () => {
    expect(() => buildTicketQrPayload(null)).toThrow('ticketId is required');
  });

  it('throws when parts is undefined', () => {
    expect(() => buildTicketQrPayload(undefined)).toThrow('ticketId is required');
  });

  it('throws when ticketId is missing from parts', () => {
    expect(() => buildTicketQrPayload({})).toThrow('ticketId is required');
  });

  it('builds a payload with only ticketId', () => {
    const payload = buildTicketQrPayload({ ticketId: 'tkt_1' });
    expect(payload).toEqual({
      v: 1,
      ticketId: 'tkt_1',
      eventId: undefined,
      userId: undefined,
      token: undefined,
      code: generateTicketCode('tkt_1'),
    });
  });

  it('builds a payload with all optional fields', () => {
    const payload = buildTicketQrPayload({ ticketId: 'tkt_1', eventId: 'evt_1', userId: 'u1', token: 'abc' });
    expect(payload).toEqual({
      v: 1,
      ticketId: 'tkt_1',
      eventId: 'evt_1',
      userId: 'u1',
      token: 'abc',
      code: generateTicketCode('tkt_1'),
    });
  });

  it('coerces ticketId, eventId, userId to strings', () => {
    const payload = buildTicketQrPayload({ ticketId: 1, eventId: 2, userId: 3 });
    expect(payload.ticketId).toBe('1');
    expect(payload.eventId).toBe('2');
    expect(payload.userId).toBe('3');
  });

  it('omits token when falsy', () => {
    const payload = buildTicketQrPayload({ ticketId: 'tkt_1', token: '' });
    expect(payload.token).toBeUndefined();
  });
});
