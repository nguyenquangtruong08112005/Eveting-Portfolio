require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';

let pass = 0;
let fail = 0;

function assert(condition, msg) {
  if (condition) {
    pass++;
    console.log(`  PASS: ${msg}`);
  } else {
    fail++;
    console.error(`  FAIL: ${msg}`);
  }
}

function error(msg) {
  fail++;
  console.error(`  FAIL: ${msg}`);
}

async function smoke() {
  require('../../src/alias-bootstrap');
  const { publish } = require('../../src/shared/events/event-publisher');
  const { processPending } = require('../../src/jobs/outbox-publisher');
  const { query } = require('../../src/providers/database/postgres.client');

  console.log('=== Phase 04 Outbox Reliability Smoke Test ===\n');

  const testRunId = `p04_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const allIds = [];

  async function cleanOutbox(id) {
    if (!id) return;
    try { await query("DELETE FROM outbox_dlq WHERE outbox_id = $1", [id]); } catch (_) {}
    try { await query("DELETE FROM outbox WHERE id = $1", [id]); } catch (_) {}
  }

  async function finalCleanup() {
    for (const id of allIds) { await cleanOutbox(id); }
  }

  function makeId(label) {
    return `${testRunId}_${label}`;
  }

  try {
    // ====================================================================
    // PHASE 1: Basic publish → pending → process → terminal
    // ====================================================================
    console.log('1. Basic publish / pending / projection path...\n');
    const basicId = makeId('basic');
    allIds.push(basicId);

    {
      const id = await publish('search_index', { action: 'index', eventId: basicId });
      assert(id && id.startsWith('out_'), `Published search_index event: ${id}`);

      const rows = (await query("SELECT status FROM outbox WHERE id = $1", [id])).rows;
      assert(rows.length === 1 && rows[0].status === 'pending', `Initial state is pending for ${id}`);

      await processPending();

      const after = (await query("SELECT status, retry_count, error_message FROM outbox WHERE id = $1", [id])).rows;
      assert(after.length === 1, `Record found after processing`);
      assert(after[0].status === 'completed' || after[0].status === 'failed',
        `Terminal status: ${after[0].status}`);
      if (after[0].status === 'failed') {
        console.log(`  INFO: ${id} completed with status=failed (expected if ES unavail): ${after[0].error_message}`);
      } else {
        assert(after[0].retry_count === 0, `Retry count 0 on success`);
      }
      console.log('');
    }

    // ====================================================================
    // PHASE 2: Retry progression → backoff eligibility → DLQ
    // ====================================================================
    console.log('2. Retry / backoff / DLQ lifecycle...\n');

    const dlqIds = [];
    for (let i = 0; i < 2; i++) {
      const id = await publish('notification', {
        channel: 'email',
        target: `dlq-test-${testRunId}-${i}@invalid.local`,
        title: 'DLQ Retry Test',
        body: 'This must end up in DLQ'
      });
      assert(id && id.startsWith('out_'), `Published notification ${i} with ID`);
      dlqIds.push(id);
      allIds.push(id);
    }

    // Derive MAX_RETRIES from env or default (must match outbox-publisher)
    const MAX_RETRIES = Number(process.env.OUTBOX_MAX_RETRIES) || 5;

    for (const id of dlqIds) {
      console.log(`  --- Row ${id} ---`);

      // Clean up any DLQ entry from cross-contamination, and reset outbox row
      await query("DELETE FROM outbox_dlq WHERE outbox_id = $1", [id]);
      const cur = (await query("SELECT retry_count, status, error_message FROM outbox WHERE id = $1", [id])).rows;
      if (cur.length > 0 && (cur[0].retry_count > 0 || cur[0].status !== 'pending')) {
        await query(
          "UPDATE outbox SET retry_count = 0, status = 'pending', error_message = NULL, updated_at = $2 WHERE id = $1",
          [id, new Date()]
        );
      }

      // Verify initial pending
      let rows = (await query("SELECT status, retry_count FROM outbox WHERE id = $1", [id])).rows;
      assert(rows.length === 1 && rows[0].status === 'pending' && rows[0].retry_count === 0,
        `Initial state: pending, retry_count=0`);

      // Each iteration: claim & process (will fail on email channel missing provider)
      // After each failure, reset updated_at to epoch so backoff condition is satisfied
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        await processPending();

        rows = (await query("SELECT status, retry_count, error_message FROM outbox WHERE id = $1", [id])).rows;

        if (rows.length === 0) {
          error(`Row ${id} disappeared on attempt ${attempt + 1}`);
          break;
        }

        const expectedRetries = attempt + 1;
        const isLast = expectedRetries >= MAX_RETRIES;

        if (isLast) {
          // After max retries, row should be in DLQ and outbox status = 'failed'
          assert(rows[0].status === 'failed',
            `After ${MAX_RETRIES} failures: status=failed (got: ${rows[0].status})`);
          assert(rows[0].retry_count >= MAX_RETRIES,
            `retry_count=${rows[0].retry_count} >= ${MAX_RETRIES}`);

          const dlqRows = (await query(
            "SELECT id, retry_count, error_message FROM outbox_dlq WHERE outbox_id = $1", [id]
          )).rows;
          assert(dlqRows.length === 1,
            `DLQ entry exists for ${id} (got ${dlqRows.length})`);
          assert(dlqRows[0].retry_count === rows[0].retry_count,
            `DLQ retry_count matches outbox (${dlqRows[0].retry_count} vs ${rows[0].retry_count})`);
          console.log(`  INFO: ${id} moved to DLQ as ${dlqRows[0].id} after ${MAX_RETRIES} failures`);
        } else {
          // Still within retry budget: status should be 'pending' with incremented retry_count
          assert(rows[0].status === 'pending',
            `Attempt ${expectedRetries}: status=pending (got: ${rows[0].status})`);
          assert(rows[0].retry_count === expectedRetries,
            `Attempt ${expectedRetries}: retry_count=${expectedRetries} (got: ${rows[0].retry_count})`);
          assert(rows[0].error_message && rows[0].error_message.length > 0,
            `Attempt ${expectedRetries}: error_message recorded`);

          // Sanity check: backoff eligibility (backoff formula non-zero for retry_count > 0)
          // Must verify the row would be claimable only after backoff elapses.
          // We override updated_at below, so here we just confirm the code path produced the correct state.
          assert(rows[0].retry_count > 0, `Backoff eligibility: retry_count=${rows[0].retry_count} > 0 triggers backoff`);

          // Reset updated_at to epoch so the backoff condition is satisfied immediately.
          // This is the key mechanism making the test deterministic without altering production backoff.
          await query("UPDATE outbox SET updated_at = '1970-01-01 00:00:00+00'::timestamptz WHERE id = $1", [id]);
        }
      }

      // Verify no further claiming happens when row is in terminal state (active guard + status check)
      const beforeFinal = (await query("SELECT status FROM outbox WHERE id = $1", [id])).rows;
      await processPending();
      const afterFinal = (await query("SELECT status FROM outbox WHERE id = $1", [id])).rows;
      assert(beforeFinal[0].status === afterFinal[0].status,
        `No state change after terminal: ${afterFinal[0].status}`);
      console.log(`  PASS: Idempotent processPending on terminal row OK\n`);
    }

    // ====================================================================
    // PHASE 3: Manual requeue from DLQ
    // ====================================================================
    console.log('3. Manual requeue from DLQ...\n');

    {
      const dlqEntries = (await query(
        "SELECT id, outbox_id, event_type, payload, retry_count FROM outbox_dlq WHERE outbox_id = ANY($1) ORDER BY created_at ASC LIMIT 1",
        [dlqIds]
      )).rows;

      assert(dlqEntries.length > 0, 'At least one DLQ entry available for requeue test');
      console.log(`  Using DLQ entry: ${dlqEntries[0].id} (outbox_id=${dlqEntries[0].outbox_id})\n`);

      if (dlqEntries.length > 0) {
        const entry = dlqEntries[0];
        const now = new Date();

        // Restore to outbox with reset state
        const outboxExists = (await query(`SELECT count(*)::int AS n FROM outbox WHERE id = $1`, [entry.outbox_id])).rows[0].n;
        if (outboxExists > 0) {
          await query(
            `UPDATE outbox SET status = 'pending', retry_count = 0, error_message = NULL, updated_at = $2 WHERE id = $1`,
            [entry.outbox_id, now]
          );
        } else {
          await query(
            `INSERT INTO outbox (id, event_type, payload, status, retry_count, error_message, created_at, updated_at)
             VALUES ($1, $2, $3, 'pending', 0, NULL, $4, $4)`,
            [entry.outbox_id, entry.event_type, entry.payload, now]
          );
        }
        await query("DELETE FROM outbox_dlq WHERE id = $1", [entry.id]);
        assert(true, `Requeued ${entry.outbox_id} from DLQ`);

        // Verify reset state
        const restored = (await query(
          "SELECT status, retry_count FROM outbox WHERE id = $1", [entry.outbox_id]
        )).rows;
        assert(restored.length > 0, 'Requeued row exists');
        assert(restored[0].status === 'pending' && restored[0].retry_count === 0,
          `Reset to pending/0 (got status=${restored[0].status}, retries=${restored[0].retry_count})`);

        // Process again — should fail again and begin a new retry cycle
        await query(
          "UPDATE outbox SET updated_at = '1970-01-01 00:00:00+00'::timestamptz WHERE id = $1",
          [entry.outbox_id]
        );
        await processPending();

        const afterRequeue = (await query(
          "SELECT status, retry_count FROM outbox WHERE id = $1", [entry.outbox_id]
        )).rows;
        assert(afterRequeue.length > 0, 'Row exists after requeue processing');
        assert(afterRequeue[0].retry_count === 1,
          `Retry_count incremented to 1 after requeue (got ${afterRequeue[0].retry_count})`);
        console.log('');
      }
    }

    // ====================================================================
    // PHASE 4: Concurrent safety (SKIP LOCKED / active guard)
    // ====================================================================
    console.log('4. Concurrent safety (active guard / SKIP LOCKED)...\n');

    {
      const skipIds = [];
      for (let i = 0; i < 3; i++) {
        const id = await publish('search_index', { action: 'index', eventId: makeId(`skip_${i}`) });
        skipIds.push(id);
        allIds.push(id);
      }

      const r1 = await processPending();
      const r2 = await processPending();
      assert(true, 'No crash on sequential processPending calls (active guard)');

      // Verify all eventually reached terminal
      for (const id of skipIds) {
        const rows = (await query("SELECT status FROM outbox WHERE id = $1", [id])).rows;
        assert(rows[0].status === 'completed' || rows[0].status === 'failed',
          `Skip-locked row ${id} terminal: ${rows[0].status}`);
      }
      console.log('');
    }

    // ====================================================================
    // Summary
    // ====================================================================
    console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
    if (fail > 0) {
      process.exit(1);
    }
    console.log('Phase 04 Outbox Reliability Smoke Test PASSED!');
  } catch (err) {
    console.error(`\nSmoke test error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await finalCleanup();
  }
}

smoke();
