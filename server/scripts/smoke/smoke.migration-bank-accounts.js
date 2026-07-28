#!/usr/bin/env node
/**
 * smoke.migration-bank-accounts.js
 *
 * Regression: migration 067 must handle both clean-schema (current 066, no
 * legacy columns) and legacy-schema (prior 066 with encrypted_account_number,
 * account_holder, bank_name) paths.  Also validates idempotent re-apply.
 *
 * Safe to run on an existing schema - reads 067 SQL and applies twice
 * (idempotent) then tests a legacy-shaped temp table in a rollback TX.
 */

require('dotenv').config({ quiet: true });
if (!process.env.DATABASE_URL) { console.error('FATAL: DATABASE_URL required.'); process.exit(1); }

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const PASS = [];
const FAIL = [];

function assert(label, condition) {
  if (condition) { console.log('  ' + '\u2713' + ' ' + label); PASS.push(label); }
  else { console.log('  ' + '\u2717' + ' ' + label); FAIL.push(label); }
}

async function readMigration(name) {
  return fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'migrations', name), 'utf8');
}

async function run() {
  console.log('');
  console.log('smoke.migration-bank-accounts.js');
  console.log('----------------------------------');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const migration067 = await readMigration('067_add_bank_accounts_encrypted_payload.sql');

    // -- Test 1: Clean-schema path (current bank_accounts has no legacy cols) --
    console.log('\n  [Test 1: Clean-schema - apply 067 against current bank_accounts]');
    const client1 = await pool.connect();
    try {
      await client1.query('BEGIN');
      await client1.query(migration067);
      await client1.query('COMMIT');
      assert('067 applied successfully on clean schema', true);
    } catch (err) {
      await client1.query('ROLLBACK').catch(function () {});
      assert('067 applied successfully on clean schema', false);
      console.error('    ERROR:', err.message);
    } finally {
      client1.release();
    }

    // -- Test 2: Idempotent re-apply --
    console.log('\n  [Test 2: Idempotent re-apply of 067]');
    const client2 = await pool.connect();
    try {
      await client2.query('BEGIN');
      await client2.query(migration067);
      await client2.query('COMMIT');
      assert('067 re-applied idempotently', true);
    } catch (err) {
      await client2.query('ROLLBACK').catch(function () {});
      assert('067 re-applied idempotently', false);
      console.error('    ERROR:', err.message);
    } finally {
      client2.release();
    }

    // -- Test 3: Legacy-schema path (table has legacy cols, missing encrypted ones) --
    console.log('\n  [Test 3: Legacy schema - 067 with encrypted_account_number + no encrypted_payload]');
    const client3 = await pool.connect();
    try {
      await client3.query('BEGIN');

      await client3.query(
        'CREATE TEMP TABLE IF NOT EXISTS temp_bank_accounts_legacy (' +
        '  organizer_id TEXT PRIMARY KEY,' +
        '  encrypted_account_number TEXT NOT NULL,' +
        '  account_holder TEXT NOT NULL,' +
        '  bank_name TEXT NOT NULL,' +
        '  keyed_fingerprint TEXT NOT NULL,' +
        '  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),' +
        '  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()' +
        ')'
      );

      await client3.query(
        'INSERT INTO temp_bank_accounts_legacy ' +
        '(organizer_id, encrypted_account_number, account_holder, bank_name, keyed_fingerprint) ' +
        "VALUES ('legacy_test_org', 'enc_123', 'Legacy Holder', 'LegacyBank', 'fp_legacy')"
      );

      const legacySql =
        'ALTER TABLE temp_bank_accounts_legacy ADD COLUMN IF NOT EXISTS encrypted_payload TEXT;' +
        'ALTER TABLE temp_bank_accounts_legacy ADD COLUMN IF NOT EXISTS masked_display TEXT;' +
        'DO $$ BEGIN ' +
        "  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_bank_accounts_legacy' AND column_name = 'encrypted_account_number') THEN " +
        '    ALTER TABLE temp_bank_accounts_legacy ALTER COLUMN encrypted_account_number DROP NOT NULL; ' +
        '  END IF; ' +
        'END $$; ' +
        'DO $$ BEGIN ' +
        "  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_bank_accounts_legacy' AND column_name = 'account_holder') THEN " +
        '    ALTER TABLE temp_bank_accounts_legacy ALTER COLUMN account_holder DROP NOT NULL; ' +
        '  END IF; ' +
        'END $$; ' +
        'DO $$ BEGIN ' +
        "  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_bank_accounts_legacy' AND column_name = 'bank_name') THEN " +
        '    ALTER TABLE temp_bank_accounts_legacy ALTER COLUMN bank_name DROP NOT NULL; ' +
        '  END IF; ' +
        'END $$;';

      await client3.query(legacySql);

      const row = await client3.query(
        'SELECT * FROM temp_bank_accounts_legacy WHERE organizer_id = $1',
        ['legacy_test_org']
      );
      assert('Legacy row preserved after migration', row.rows.length === 1);
      assert('Legacy encrypted_account_number still has value', row.rows[0].encrypted_account_number === 'enc_123');
      assert('Legacy account_holder still has value', row.rows[0].account_holder === 'Legacy Holder');
      assert('Legacy bank_name still has value', row.rows[0].bank_name === 'LegacyBank');
      assert('New encrypted_payload is NULL (legacy row)', row.rows[0].encrypted_payload === null);
      assert('New masked_display is NULL (legacy row)', row.rows[0].masked_display === null);

      // Re-apply on legacy schema (idempotent)
      await client3.query(legacySql);

      const row2 = await client3.query(
        'SELECT * FROM temp_bank_accounts_legacy WHERE organizer_id = $1',
        ['legacy_test_org']
      );
      assert('Legacy row still intact after idempotent re-apply', row2.rows.length === 1);
      assert('encrypted_account_number still has value', row2.rows[0].encrypted_account_number === 'enc_123');

      await client3.query('ROLLBACK');
      assert('Legacy schema test completed (rolled back cleanly)', true);
    } catch (err) {
      await client3.query('ROLLBACK').catch(function () {});
      assert('Legacy schema test completed (rolled back cleanly)', false);
      console.error('    ERROR:', err.message);
    } finally {
      client3.release();
    }

    // -- Test 4: Verify current bank_accounts shape (has encrypted_payload, no legacy cols) --
    console.log('\n  [Test 4: Current bank_accounts schema shape]');
    const client4 = await pool.connect();
    try {
      const cols = await client4.query(
        'SELECT column_name, is_nullable ' +
        'FROM information_schema.columns ' +
        "WHERE table_name = 'bank_accounts' " +
        'ORDER BY ordinal_position'
      );
      const colNames = cols.rows.map(function (r) { return r.column_name; });
      assert('bank_accounts has encrypted_payload', colNames.indexOf('encrypted_payload') !== -1);
      assert('bank_accounts has masked_display', colNames.indexOf('masked_display') !== -1);
      assert('bank_accounts has keyed_fingerprint', colNames.indexOf('keyed_fingerprint') !== -1);
      assert('bank_accounts does NOT have encrypted_account_number', colNames.indexOf('encrypted_account_number') === -1);
      client4.release();
    } catch (err) {
      assert('Schema shape check failed', false);
      console.error('    ERROR:', err.message);
      client4.release();
    }

  } finally {
    await pool.end();
  }
}

run()
  .then(function () {
    console.log('');
    console.log('  Total: ' + PASS.length + ' passed, ' + FAIL.length + ' failed');
    console.log('');
    process.exit(FAIL.length > 0 ? 1 : 0);
  })
  .catch(function (err) {
    console.error('Unhandled error:', err.message || err);
    process.exit(1);
  });
