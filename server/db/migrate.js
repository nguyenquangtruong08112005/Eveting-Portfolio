require('dotenv').config({ quiet: true });
const { readdirSync, readFileSync } = require('fs');
const { join } = require('path');
const { Pool } = require('pg');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    const appliedSet = new Set(applied.map(function(r) { return r.filename; }));

    const migrationsDir = join(__dirname, 'migrations');
    var files = readdirSync(migrationsDir).filter(function(f) { return f.endsWith('.sql'); }).sort();

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (appliedSet.has(file)) {
        console.log('SKIP  ' + file + ' (already applied)');
        continue;
      }
      var sql = readFileSync(join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
      console.log('OK    ' + file);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(function(err) {
  console.error('Migration failed: ' + err.message);
  process.exit(1);
});
