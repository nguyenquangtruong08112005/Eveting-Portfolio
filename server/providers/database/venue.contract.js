// providers/database/venue.contract.js
// Expected interface for a venue repository adapter.
// Each adapter (firebase, postgres, etc.) MUST implement all methods below.

const REQUIRED_METHODS = [
  'getAllVenues',
  'createVenue',
  'getVenueById',
  'getVenueRawById',
];

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('Venue repository adapter must be a non-null object.');
  }
  const missing = REQUIRED_METHODS.filter(
    (method) => typeof adapter[method] !== 'function'
  );
  if (missing.length > 0) {
    throw new Error(
      `Venue repository adapter is missing required method(s): ${missing.join(', ')}`
    );
  }
}

module.exports = { REQUIRED_METHODS, validateAdapter };
