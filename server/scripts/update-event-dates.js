require('dotenv').config();
require('../src/alias-bootstrap');
const { query } = require('../src/providers/database/postgres.client');

async function run() {
  console.log('Updating database event dates to future...');
  const res = await query('SELECT id, name, date FROM events');
  console.log(`Found ${res.rows.length} events in database.`);
  
  const now = Date.now();
  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows[i];
    // Spread them out: event i starts in (i+1)*2 days
    const futureDate = now + (i + 1) * 2 * 24 * 60 * 60 * 1000;
    const endDate = futureDate + 4 * 60 * 60 * 1000; // 4 hours duration
    
    await query(
      'UPDATE events SET date = $1, end_date = $2, status = $3, visibility = $4 WHERE id = $5',
      [futureDate, endDate, 'active', 'public', row.id]
    );
    console.log(`Updated event "${row.name}" (${row.id}) -> Date: ${new Date(futureDate).toDateString()}`);
  }
  console.log('Database update completed successfully.');
}

run().catch(console.error);
