'use strict';

const { REQUIRED_METHODS, validateAdapter } = require('@/providers/database/seat.contract');

function makeAdapter() {
  const adapter = {};
  for (const method of REQUIRED_METHODS) {
    adapter[method] = jest.fn();
  }
  return adapter;
}

describe('seat.contract', () => {
  it('exports the full required method list', () => {
    expect(REQUIRED_METHODS).toEqual([
      'createSeatMap',
      'createSeatSections',
      'createSeats',
      'getSeatsBySection',
      'getSeatMapById',
      'getSeatsByMapId',
      'updateSeatStatus',
      'getSeatById',
      'createSeatHold',
      'getSeatHold',
      'getActiveHoldForSeat',
      'releaseSeatHold',
      'releaseExpiredHolds',
      'convertHoldToSold',
      'getSeatsWithStatuses',
      'createPerformance',
      'materializePerformanceSeats',
      'getPerformanceSeatAvailability',
      'getPerformanceSeatLayout',
      'savePerformanceSeatLayout',
      'holdPerformanceSeats',
      'releasePerformanceSeatHold',
      'convertPerformanceSeatHoldToSold',
      'releaseExpiredPerformanceSeatHolds',
    ]);
  });

  it('accepts an adapter implementing every method', () => {
    expect(() => validateAdapter(makeAdapter())).not.toThrow();
  });

  it('rejects null', () => {
    expect(() => validateAdapter(null)).toThrow('must be a non-null object');
  });

  it('rejects undefined', () => {
    expect(() => validateAdapter(undefined)).toThrow('must be a non-null object');
  });

  it('rejects non-object values', () => {
    expect(() => validateAdapter('adapter')).toThrow('must be a non-null object');
    expect(() => validateAdapter(42)).toThrow('must be a non-null object');
    expect(() => validateAdapter(false)).toThrow('must be a non-null object');
  });

  it('rejects an empty array as an incomplete adapter', () => {
    expect(() => validateAdapter([])).toThrow('missing required method(s)');
  });

  it('reports every missing method in the error message', () => {
    const adapter = makeAdapter();
    delete adapter.createSeats;
    delete adapter.releaseExpiredPerformanceSeatHolds;
    expect(() => validateAdapter(adapter)).toThrow('createSeats, releaseExpiredPerformanceSeatHolds');
  });

  it('rejects when a required method is not a function', () => {
    const adapter = makeAdapter();
    adapter.getSeatById = 'not-a-function';
    expect(() => validateAdapter(adapter)).toThrow('getSeatById');
  });
});
