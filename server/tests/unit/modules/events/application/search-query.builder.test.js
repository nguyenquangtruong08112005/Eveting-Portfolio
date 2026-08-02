const moment = require('moment');
const {
  parseDateToMs,
  normalizeSearchParams,
  buildSearchQuery,
} = require('@/modules/events/application/query-builders/search-query.builder');

describe('parseDateToMs', () => {
  it('returns null for undefined/null/empty', () => {
    expect(parseDateToMs(undefined)).toBeNull();
    expect(parseDateToMs(null)).toBeNull();
    expect(parseDateToMs('')).toBeNull();
    expect(parseDateToMs('  ')).toBeNull();
  });

  it('returns the number for numeric input', () => {
    expect(parseDateToMs(1700000000000)).toBe(1700000000000);
  });

  it('returns null for NaN number', () => {
    expect(parseDateToMs(NaN)).toBeNull();
  });

  it('parses digit-only string as number', () => {
    expect(parseDateToMs('1700000000000')).toBe(1700000000000);
  });

  it('returns number for huge digit string (Number coerces safely)', () => {
    expect(parseDateToMs('999999999999999999999')).toBe(1e+21);
  });

  it('parses ISO date string', () => {
    const result = parseDateToMs('2026-07-31');
    const expected = moment('2026-07-31').valueOf();
    expect(result).toBe(expected);
  });

  it('parses ISO date string as end of day', () => {
    const result = parseDateToMs('2026-07-31', true);
    const expected = moment('2026-07-31').endOf('day').valueOf();
    expect(result).toBe(expected);
  });

  it('returns null for invalid string', () => {
    expect(parseDateToMs('not-a-date')).toBeNull();
  });
});

describe('normalizeSearchParams', () => {
  it('city takes precedence over location', () => {
    const result = normalizeSearchParams({ city: 'Hanoi', location: 'Saigon' });
    expect(result.city).toBe('Hanoi');
    expect(result.location).toBe('Hanoi');
  });

  it('falls back to location when city empty', () => {
    const result = normalizeSearchParams({ city: '', location: 'Saigon' });
    expect(result.city).toBe('Saigon');
  });

  it('dateFrom takes precedence over startDate', () => {
    const result = normalizeSearchParams({ dateFrom: '2026-01-01', startDate: '2025-01-01' });
    expect(result.startDate).toBe('2026-01-01');
    expect(result.dateFrom).toBe('2026-01-01');
  });

  it('dateTo takes precedence over endDate', () => {
    const result = normalizeSearchParams({ dateTo: '2026-12-31', endDate: '2025-12-31' });
    expect(result.endDate).toBe('2026-12-31');
    expect(result.dateTo).toBe('2026-12-31');
  });

  it('resolves category aliases', () => {
    expect(normalizeSearchParams({ category: 'theater' }).category).toBe('arts');
    expect(normalizeSearchParams({ category: 'theatre' }).category).toBe('arts');
    expect(normalizeSearchParams({ category: 'exhibition' }).category).toBe('arts');
  });

  it('preserves unknown category', () => {
    expect(normalizeSearchParams({ category: 'music' }).category).toBe('music');
  });

  it('is case-insensitive for category alias', () => {
    expect(normalizeSearchParams({ category: 'Theater' }).category).toBe('arts');
  });

  it('passes through other params', () => {
    const result = normalizeSearchParams({ q: 'jazz', sortBy: 'date' });
    expect(result.q).toBe('jazz');
    expect(result.sortBy).toBe('date');
  });

  it('handles undefined/empty city and dates', () => {
    const result = normalizeSearchParams({});
    expect(result.city).toBeUndefined();
    expect(result.location).toBeUndefined();
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });
});

describe('buildSearchQuery', () => {
  it('returns default pagination and sort', () => {
    const result = buildSearchQuery({});
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(10);
    expect(result.sort).toEqual([{ date: { order: 'asc' } }]);
  });

  it('parses page and limit', () => {
    const result = buildSearchQuery({ page: '3', limit: '20' });
    expect(result.offset).toBe(40);
    expect(result.limit).toBe(20);
  });

  it('adds category term filter (lowercased)', () => {
    const result = buildSearchQuery({ category: 'Music' });
    expect(result.query.bool.must).toContainEqual({ term: { "category.keyword": "music" } });
  });

  it('adds city term filter', () => {
    const result = buildSearchQuery({ city: 'Hanoi' });
    expect(result.query.bool.must).toContainEqual({ term: { "city.keyword": "Hanoi" } });
  });

  it('adds date range from startDate', () => {
    const result = buildSearchQuery({ startDate: '1700000000000' });
    expect(result.query.bool.must).toContainEqual({ range: { date: { gte: 1700000000000 } } });
  });

  it('adds date range from endDate', () => {
    const result = buildSearchQuery({ endDate: '1700000000000' });
    expect(result.query.bool.must).toContainEqual({ range: { date: { lte: 1700000000000 } } });
  });

  it('adds full date range when both present', () => {
    const result = buildSearchQuery({ startDate: '1000', endDate: '2000' });
    expect(result.query.bool.must).toContainEqual({ range: { date: { gte: 1000, lte: 2000 } } });
  });

  it('handles date preset "today"', () => {
    const result = buildSearchQuery({ date: 'today' });
    const rangeFilter = result.query.bool.must.find(m => m.range);
    expect(rangeFilter).toBeDefined();
    expect(rangeFilter.range.date.gte).toBeDefined();
    expect(rangeFilter.range.date.lt).toBeDefined();
  });

  it('handles date preset "tomorrow"', () => {
    const result = buildSearchQuery({ date: 'tomorrow' });
    const rangeFilter = result.query.bool.must.find(m => m.range);
    expect(rangeFilter).toBeDefined();
    expect(rangeFilter.range.date.gte).toBeDefined();
    expect(rangeFilter.range.date.lt).toBeDefined();
  });

  it('handles date preset "this_week"', () => {
    const result = buildSearchQuery({ date: 'this_week' });
    const rangeFilter = result.query.bool.must.find(m => m.range);
    expect(rangeFilter).toBeDefined();
    expect(rangeFilter.range.date.gte).toBeDefined();
    expect(rangeFilter.range.date.lte).toBeDefined();
  });

  it('handles date preset "upcoming"', () => {
    const result = buildSearchQuery({ date: 'upcoming' });
    const rangeFilter = result.query.bool.must.find(m => m.range);
    expect(rangeFilter).toBeDefined();
    expect(rangeFilter.range.date.gte).toBeDefined();
    expect(rangeFilter.range.date.lte).toBeUndefined();
  });

  it('adds minPrice filter', () => {
    const result = buildSearchQuery({ minPrice: '100' });
    const rangeFilter = result.query.bool.must.find(m => m.range);
    expect(rangeFilter.range.minPrice).toEqual({ gte: 100 });
  });

  it('adds maxPrice filter', () => {
    const result = buildSearchQuery({ maxPrice: '500' });
    const rangeFilter = result.query.bool.must.find(m => m.range);
    expect(rangeFilter.range.minPrice).toEqual({ lte: 500 });
  });

  it('combines minPrice and maxPrice', () => {
    const result = buildSearchQuery({ minPrice: '100', maxPrice: '500' });
    const rangeFilter = result.query.bool.must.find(m => m.range);
    expect(rangeFilter.range.minPrice).toEqual({ gte: 100, lte: 500 });
  });

  it('adds hasVideo exists filter', () => {
    const result = buildSearchQuery({ hasVideo: 'true' });
    expect(result.query.bool.must).toContainEqual({ exists: { field: "videoUrl" } });
  });

  it('builds full-text search with should clauses', () => {
    const result = buildSearchQuery({ q: 'jazz concert' });
    const boolFilter = result.query.bool.must.find(m => m.bool);
    expect(boolFilter).toBeDefined();
    expect(boolFilter.bool.should).toHaveLength(2);
    expect(boolFilter.bool.minimum_should_match).toBe(1);
  });

  it('uses _score sort when q is provided', () => {
    const result = buildSearchQuery({ q: 'jazz' });
    expect(result.sort).toEqual([{ _score: { order: "desc" } }]);
  });

  it('uses minPrice sort with provided order', () => {
    const result = buildSearchQuery({ sortBy: 'minPrice', sortOrder: 'asc' });
    expect(result.sort).toEqual([{ minPrice: { order: 'asc' } }]);
  });

  it('falls back to date asc for unknown sortBy', () => {
    const result = buildSearchQuery({ sortBy: 'unknown' });
    expect(result.sort).toEqual([{ date: { order: 'asc' } }]);
  });

  it('uses match_all when no must filters', () => {
    const result = buildSearchQuery({});
    expect(result.query.bool.must).toEqual({ match_all: {} });
  });

  it('uses must array when filters present', () => {
    const result = buildSearchQuery({ category: 'music' });
    expect(Array.isArray(result.query.bool.must)).toBe(true);
  });
});
