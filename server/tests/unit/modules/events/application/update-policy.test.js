jest.mock('@/shared/logger', () => ({ info: jest.fn() }));

const logger = require('@/shared/logger');
const { hasImportantChanges } = require('@/modules/events/application/policies/update-policy');

describe('hasImportantChanges', () => {
  beforeEach(() => {
    logger.info.mockReset();
  });

  it('returns false when all critical fields match', () => {
    const oldData = { name: 'Event', date: '2026-01-01', venueName: 'Hall' };
    const newData = { name: 'Event', date: '2026-01-01', venueName: 'Hall' };
    expect(hasImportantChanges(oldData, newData)).toBe(false);
    expect(logger.info).not.toHaveBeenCalled();
  });

  const criticalFields = ['name', 'date', 'venueName', 'eventType', 'onlineUrl', 'isOutdoor', 'provinceName', 'districtName', 'wardName', 'streetAddress'];
  criticalFields.forEach((field) => {
    it(`detects change in "${field}"`, () => {
      const oldData = { [field]: 'old' };
      const newData = { [field]: 'new' };
      expect(hasImportantChanges(oldData, newData)).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Important event field changed', { field });
    });
  });

  it('uses JSON.stringify for deep comparison', () => {
    const oldData = { name: { nested: 'val' } };
    const newData = { name: { nested: 'val' } };
    expect(hasImportantChanges(oldData, newData)).toBe(false);
  });

  it('detects undefined vs defined', () => {
    expect(hasImportantChanges({ name: undefined }, { name: 'Event' })).toBe(true);
  });

  it('returns false for empty objects', () => {
    expect(hasImportantChanges({}, {})).toBe(false);
  });
});
