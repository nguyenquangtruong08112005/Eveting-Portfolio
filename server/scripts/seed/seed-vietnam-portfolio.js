/**
 * Entrypoint script for Phase 03 Deterministic Vietnam Portfolio Data Seeding.
 * Delegates execution to seed.platform.postgres.js.
 */
const { runSeed } = require('./seed.platform.postgres');

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Portfolio seed failed:', err.message || err);
    process.exit(1);
  });
