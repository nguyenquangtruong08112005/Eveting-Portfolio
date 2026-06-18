require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

async function smoke() {
  require('../src/alias-bootstrap');
  const seatRepo = require('../src/providers/database/seat.repository');
  const { query } = require('../src/providers/database/postgres.client');

  console.log('Starting Seat Map Schema & Repository Smoke Test...');

  // Setup test data
  const mapId = 'map_smoke_test';
  const sectionId = 'sec_smoke_test';
  const seatId = 'seat_smoke_test';

  console.log('Cleaning up old test data if any...');
  await query('DELETE FROM seats WHERE id = $1', [seatId]);
  await query('DELETE FROM seat_sections WHERE id = $1', [sectionId]);
  await query('DELETE FROM seat_maps WHERE id = $1', [mapId]);

  console.log('1. Creating Seat Map...');
  await seatRepo.createSeatMap(mapId, {
    name: 'Smoke Test Hall',
    totalRows: 10,
    totalCols: 10
  });

  console.log('2. Creating Seat Section...');
  await seatRepo.createSeatSections([{
    id: sectionId,
    seatMapId: mapId,
    name: 'VIP Section',
    priceMultiplier: 1.5
  }]);

  console.log('3. Creating Seat...');
  await seatRepo.createSeats([{
    id: seatId,
    seatSectionId: sectionId,
    rowName: 'A',
    seatNumber: 5,
    status: 'available'
  }]);

  console.log('4. Verifying getSeatMapById...');
  const seatMap = await seatRepo.getSeatMapById(mapId);
  if (!seatMap || seatMap.name !== 'Smoke Test Hall') {
    throw new Error('Seat map creation or retrieval failed.');
  }
  console.log('Found seat map:', JSON.stringify(seatMap));

  console.log('5. Verifying getSeatsBySection...');
  const seats = await seatRepo.getSeatsBySection(sectionId);
  if (seats.length === 0 || seats[0].id !== seatId) {
    throw new Error('Seats retrieval by section failed.');
  }
  console.log('Found seat:', JSON.stringify(seats[0]));

  console.log('6. Verifying getSeatsByMapId...');
  const mapSeats = await seatRepo.getSeatsByMapId(mapId);
  if (mapSeats.length === 0 || mapSeats[0].id !== seatId) {
    throw new Error('Seats retrieval by map ID failed.');
  }

  console.log('7. Verifying updateSeatStatus...');
  await seatRepo.updateSeatStatus(seatId, 'blocked');
  const updatedSeats = await seatRepo.getSeatsBySection(sectionId);
  if (updatedSeats[0].status !== 'blocked') {
    throw new Error('Updating seat status failed.');
  }
  console.log('Seat status successfully updated to blocked.');

  console.log('Cleaning up test data...');
  await query('DELETE FROM seats WHERE id = $1', [seatId]);
  await query('DELETE FROM seat_sections WHERE id = $1', [sectionId]);
  await query('DELETE FROM seat_maps WHERE id = $1', [mapId]);

  console.log('Seat Map Schema & Repository Smoke Test PASSED!');
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
