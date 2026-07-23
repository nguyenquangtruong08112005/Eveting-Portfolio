// providers/database/seat.contract.js
// Expected interface for a seat repository adapter.
// Each adapter MUST implement all methods below.

const REQUIRED_METHODS = [
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
  'getSeatsWithStatuses'
];

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('Seat repository adapter must be a non-null object.');
  }
  const missing = REQUIRED_METHODS.filter(
    (method) => typeof adapter[method] !== 'function'
  );
  if (missing.length > 0) {
    throw new Error(
      `Seat repository adapter is missing required method(s): ${missing.join(', ')}`
    );
  }
}

module.exports = { REQUIRED_METHODS, validateAdapter };
