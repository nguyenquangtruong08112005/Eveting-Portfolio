const { toDb, fromDb, nowDb, nowMs } = require('@/providers/database/time.helper');

describe('toDb', () => {
  it('returns null for null', () => {
    expect(toDb(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(toDb(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(toDb('')).toBeNull();
  });

  it('returns the same Date when given a Date', () => {
    const d = new Date('2025-06-15T12:00:00Z');
    expect(toDb(d)).toBe(d);
  });

  it('returns null for invalid Date', () => {
    expect(toDb(new Date('invalid'))).toBeNull();
  });

  it('converts millisecond number to Date', () => {
    const ms = 1700000000000;
    const result = toDb(ms);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(ms);
  });

  it('converts second number (< 1e11) to Date', () => {
    const sec = 1700000000;
    const result = toDb(sec);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(sec * 1000);
  });

  it('returns null for NaN number', () => {
    expect(toDb(NaN)).toBeNull();
  });

  it('parses ISO string to Date', () => {
    const result = toDb('2025-06-15T12:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2025-06-15T12:00:00.000Z');
  });

  it('parses numeric string as millis', () => {
    const ms = 1700000000000;
    const result = toDb(String(ms));
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(ms);
  });

  it('parses numeric string as seconds when < 1e11', () => {
    const sec = 1700000000;
    const result = toDb(String(sec));
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(sec * 1000);
  });

  it('returns null for unparseable string', () => {
    expect(toDb('not-a-date')).toBeNull();
  });

  it('returns null for whitespace-padded string (source uses untrimmed value)', () => {
    expect(toDb('  2025-06-15T12:00:00.000Z  ')).toBeNull();
  });

  it('returns null for boolean', () => {
    expect(toDb(true)).toBeNull();
  });

  it('returns null for object', () => {
    expect(toDb({})).toBeNull();
  });
});

describe('fromDb', () => {
  it('returns null for null', () => {
    expect(fromDb(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(fromDb(undefined)).toBeNull();
  });

  it('converts Date to milliseconds', () => {
    const d = new Date('2025-06-15T12:00:00.000Z');
    expect(fromDb(d)).toBe(d.getTime());
  });

  it('returns the same number when given a number', () => {
    expect(fromDb(42)).toBe(42);
  });

  it('parses valid ISO string to milliseconds', () => {
    const result = fromDb('2025-06-15T12:00:00.000Z');
    expect(result).toBe(new Date('2025-06-15T12:00:00.000Z').getTime());
  });

  it('returns null for unparseable string', () => {
    expect(fromDb('bad')).toBeNull();
  });

  it('returns null for object', () => {
    expect(fromDb({})).toBeNull();
  });
});

describe('nowDb', () => {
  it('returns a Date instance', () => {
    expect(nowDb()).toBeInstanceOf(Date);
  });

  it('returns the current time', () => {
    const before = Date.now();
    const result = nowDb().getTime();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });
});

describe('nowMs', () => {
  it('returns a number', () => {
    expect(typeof nowMs()).toBe('number');
  });

  it('returns the current time in milliseconds', () => {
    const before = Date.now();
    const result = nowMs();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });
});
