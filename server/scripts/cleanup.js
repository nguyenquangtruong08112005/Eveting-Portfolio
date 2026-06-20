require('../src/alias-bootstrap');
require('dotenv').config();
const { query } = require('../src/providers/database/postgres.client');

async function cleanup() {
  try {
    console.log('Cleaning up invalid/test events from database...');
    // Delete events that don't have a valid name or are test events
    const res = await query(`
      DELETE FROM events 
      WHERE name IS NULL 
         OR name = '' 
         OR id LIKE 'evt_test_%' 
         OR id LIKE 'lc_%'
         OR description = 'test'
         OR min_price IS NULL
    `);
    console.log(`Deleted ${res.rowCount} invalid/test events.`);
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

// Wait for pg to initialize if needed, or run directly
cleanup();
