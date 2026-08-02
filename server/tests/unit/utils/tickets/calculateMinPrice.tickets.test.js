const { calculateMinPrice } = require('@/utils/tickets/calculateMinPrice.tickets');

describe('calculateMinPrice', () => {
  it('returns null for null input', () => {
    expect(calculateMinPrice(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(calculateMinPrice(undefined)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(calculateMinPrice('string')).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(calculateMinPrice({})).toBeNull();
  });

  it('returns null when no prices are valid numbers', () => {
    const types = { VIP: { price: 'free' }, Normal: { price: undefined } };
    expect(calculateMinPrice(types)).toBeNull();
  });

  it('returns the single price when only one ticket type', () => {
    const types = { VIP: { price: 500 } };
    expect(calculateMinPrice(types)).toBe(500);
  });

  it('returns the minimum price among multiple types', () => {
    const types = { VIP: { price: 1000 }, Normal: { price: 500 }, Economy: { price: 750 } };
    expect(calculateMinPrice(types)).toBe(500);
  });

  it('ignores non-numeric price values and finds min among numeric ones', () => {
    const types = { VIP: { price: 1000 }, Normal: { price: 'free' }, Economy: { price: 300 } };
    expect(calculateMinPrice(types)).toBe(300);
  });

  it('returns zero when zero is the lowest price', () => {
    const types = { Free: { price: 0 }, VIP: { price: 1000 } };
    expect(calculateMinPrice(types)).toBe(0);
  });

  it('handles negative prices', () => {
    const types = { Discounted: { price: -100 }, Normal: { price: 500 } };
    expect(calculateMinPrice(types)).toBe(-100);
  });

  it('handles floating point prices', () => {
    const types = { VIP: { price: 99.99 }, Normal: { price: 49.95 } };
    expect(calculateMinPrice(types)).toBe(49.95);
  });
});
