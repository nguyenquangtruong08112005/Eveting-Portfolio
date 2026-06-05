// Smoke test for User repository (Postgres, read-only only)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.users.js
//   DATABASE_URL=postgres://... USER_SMOKE_ID=<id> node scripts/smoke.users.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.USER_DATABASE_PROVIDER = 'postgres';

async function smoke() {
  var userRepo = require('../src/providers/database/user.repository');

  console.log('User repository provider: ' + process.env.USER_DATABASE_PROVIDER);
  console.log('');

  var smokeId = process.env.USER_SMOKE_ID;
  if (smokeId) {
    console.log('Looking up user by id: ' + smokeId);
    var user = await userRepo.getUserDataById(smokeId);
    if (user) {
      console.log('Found: ' + JSON.stringify(user, null, 2));
    } else {
      console.log('Not found');
    }

    console.log('');
    var roles = await userRepo.getUserRoles(smokeId);
    console.log('getUserRoles("' + smokeId + '"): ' + JSON.stringify(roles));

    console.log('');
    var emailUser = await userRepo.findUserByEmail(user ? user.email : 'none@test.com');
    console.log('findUserByEmail: ' + (emailUser ? 'found' : 'not found'));
  } else {
    console.log('Set USER_SMOKE_ID env var to test a specific user.');
    console.log('Listing all users is not available as getUsersByIds requires IDs.');
    console.log('Pass USER_SMOKE_ID=<PostgreSQL-UUID> to run smoke test.');
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
