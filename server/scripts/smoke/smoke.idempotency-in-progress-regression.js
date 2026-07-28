#!/usr/bin/env node
/*
 * Focused regression smoke for migration 079 and the shared idempotency store.
 * Requires DATABASE_URL and migrations through 079.
 */

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required.');
    process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';
require('../../src/alias-bootstrap');

const { randomUUID } = require('crypto');
const { query, getPool } = require('@/providers/database/postgres.client');
const idempotencyRepository = require('@/providers/database/idempotency.repository');

const prefix = `idem_in_progress_${randomUUID()}`;
const key = `${prefix}_key`;
const userId = `${prefix}_user`;
const endpoint = 'POST:/idempotency-regression';
const requestHash = 'request-hash-a';

function assert(condition, message) {
    if (!condition) throw new Error(message);
    console.log(`PASS: ${message}`);
}

async function run() {
    const columns = await query(
        `SELECT attname, attnotnull
         FROM pg_attribute
         WHERE attrelid = 'idempotency_keys'::regclass
           AND attname IN ('response_code', 'response_body')
           AND NOT attisdropped`,
    );
    assert(columns.rows.length === 2, 'idempotency response columns exist');
    assert(columns.rows.every((row) => !row.attnotnull),
        'in-progress rows may omit response code and body');

    const acquired = await idempotencyRepository.acquireLock(key, userId, endpoint, requestHash);
    assert(acquired.success, 'new request acquires an in-progress lock');

    const inProgress = await idempotencyRepository.getByKey(key);
    assert(inProgress.status === 'IN_PROGRESS'
        && inProgress.responseCode === null
        && inProgress.responseBody === null,
    'in-progress record stores no response yet');

    const concurrent = await idempotencyRepository.acquireLock(key, userId, endpoint, requestHash);
    assert(!concurrent.success && concurrent.conflict,
        'same principal and payload sees an active-request conflict');

    const mismatch = await idempotencyRepository.acquireLock(key, userId, endpoint, 'request-hash-b');
    assert(!mismatch.success && mismatch.mismatch,
        'same principal cannot reuse a key with a different payload');

    const ownedByOther = await idempotencyRepository.acquireLock(key, `${userId}_other`, endpoint, requestHash);
    assert(!ownedByOther.success && ownedByOther.ownedByOther,
        'another principal cannot claim the same global key');

    await idempotencyRepository.saveResponse(key, userId, endpoint, 201, { id: 'created' });
    const replay = await idempotencyRepository.acquireLock(key, userId, endpoint, requestHash);
    assert(!replay.success && replay.record
        && replay.record.status === 'COMPLETED'
        && replay.record.responseCode === 201
        && replay.record.responseBody.id === 'created',
    'completed response is retained for exact replay');

    await idempotencyRepository.deleteKey(key, userId, endpoint);
    const retry = await idempotencyRepository.acquireLock(key, userId, endpoint, requestHash);
    assert(retry.success, 'released key can be acquired for a retry after a 5xx');
}

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await query('DELETE FROM idempotency_keys WHERE key LIKE $1', [`${prefix}%`]);
        } finally {
            await getPool().end();
        }
    });
