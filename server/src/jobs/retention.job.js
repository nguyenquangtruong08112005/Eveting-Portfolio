/**
 * W6 retention job — dry-run by default (RETENTION_DRY_RUN=true).
 * Cleans completed outbox, expired idempotency keys.
 */
require('dotenv').config({ quiet: true });
require('../alias-bootstrap');
const { query } = require('../providers/database/postgres.client');

const DRY = process.env.RETENTION_DRY_RUN !== 'false';
const OUTBOX_DAYS = Number(process.env.RETENTION_OUTBOX_DAYS || 30);
const IDEMP_DAYS = Number(process.env.RETENTION_IDEMPOTENCY_DAYS || 7);

async function run() {
  console.log(`[retention] dryRun=${DRY} outboxDays=${OUTBOX_DAYS} idempDays=${IDEMP_DAYS}`);

  const outboxSql = `
    SELECT count(*)::int AS n FROM outbox
    WHERE status = 'completed' AND created_at < NOW() - ($1 || ' days')::interval`;
  const outbox = await query(outboxSql, [String(OUTBOX_DAYS)]);
  console.log(`[retention] outbox completed old rows=${outbox.rows[0].n}`);
  if (!DRY && outbox.rows[0].n > 0) {
    await query(
      `DELETE FROM outbox
       WHERE status = 'completed' AND created_at < NOW() - ($1 || ' days')::interval`,
      [String(OUTBOX_DAYS)]
    );
  }

  const idemp = await query(
    `SELECT count(*)::int AS n FROM idempotency_keys WHERE expires_at < NOW()`
  );
  console.log(`[retention] idempotency expired rows=${idemp.rows[0].n}`);
  if (!DRY && idemp.rows[0].n > 0) {
    await query(`DELETE FROM idempotency_keys WHERE expires_at < NOW()`);
  }

  console.log('[retention] done');
  process.exit(0);
}

run().catch((e) => {
  console.error('[retention] failed', e.message);
  process.exit(1);
});
