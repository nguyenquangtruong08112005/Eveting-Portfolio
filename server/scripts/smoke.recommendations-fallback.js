#!/usr/bin/env node
/**
 * smoke.recommendations-fallback.js
 *
 * Validates Phase P1.9-S2: Relational Recommendations Fallback
 *  1. Tests direct Postgres query `getRecommendedEventsRelational`
 *  2. Tests endpoint `/api/web/events/recommendations` fallback
 */

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';
process.env.EVENT_DATABASE_PROVIDER = 'postgres';

require('./../src/alias-bootstrap');

const { spawn } = require('child_process');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');
const userRepository = require('@/providers/database/user.repository');

const TEST_PORT = process.env.TEST_PORT || '39889';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const JWT_SECRET = 'super_secret_key_at_least_256_bits_for_backend_auth_smoke_testing_1234567890';

const PASS = [];
const FAIL = [];

function assert(label, condition) {
    if (condition) {
        console.log(`  ✓ ${label}`);
        PASS.push(label);
    } else {
        console.log(`  ✗ ${label}`);
        FAIL.push(label);
    }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    console.log('');
    console.log('smoke.recommendations-fallback.js');
    console.log('─────────────────────────────────');

    const testUser1Id = `usr_rec_1_${uuidv4()}`;
    const testUser2Id = `usr_rec_2_${uuidv4()}`;
    const testUser3Id = `usr_rec_3_${uuidv4()}`;

    const testOrganizerId = `org_rec_${uuidv4()}`;

    const eventAId = `evt_rec_a_${uuidv4()}`;
    const eventBId = `evt_rec_b_${uuidv4()}`;
    const eventCId = `evt_rec_c_${uuidv4()}`;
    const eventDId = `evt_rec_d_${uuidv4()}`;
    const eventEId = `evt_rec_e_${uuidv4()}`;
    const eventFId = `evt_rec_f_${uuidv4()}`;

    const now = Date.now();

    console.log('\n  [Setup Test DB Data]');

    // 1. Insert mock users
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'User 1', 'mock_hash', $3, true),
                ($4, $5, 'User 2', 'mock_hash', $6, true),
                ($7, $8, 'User 3', 'mock_hash', $9, true)`,
        [
            testUser1Id, `rec1_${uuidv4().substring(0,8)}@test.com`, ['user'],
            testUser2Id, `rec2_${uuidv4().substring(0,8)}@test.com`, ['user'],
            testUser3Id, `rec3_${uuidv4().substring(0,8)}@test.com`, ['user']
        ]
    );

    await userRepository.createUser(testUser1Id, {
        email: `rec1_${uuidv4().substring(0,8)}@test.com`,
        name: 'User 1',
        matchingPreferences: { interests: ['Music_rec_smoke', 'Jazz_rec_smoke'] },
        historyEventIds: [],
        roles: ['attendee']
    });

    await userRepository.createUser(testUser2Id, {
        email: `rec2_${uuidv4().substring(0,8)}@test.com`,
        name: 'User 2',
        matchingPreferences: { interests: ['Music_rec_smoke'] },
        historyEventIds: [eventCId],
        roles: ['attendee']
    });

    await userRepository.createUser(testUser3Id, {
        email: `rec3_${uuidv4().substring(0,8)}@test.com`,
        name: 'User 3',
        matchingPreferences: { interests: [] },
        historyEventIds: [],
        roles: ['attendee']
    });

    // 2. Insert mock events
    // Event A: active, public, future, matches Music_rec_smoke and Jazz_rec_smoke
    await eventRepository.createEvent(eventAId, {
        name: 'Event A (Music & Jazz)',
        description: 'Jazz session',
        date: now + 1000 * 60 * 60 * 24, // tomorrow
        eventType: 'physical',
        organizerId: testOrganizerId,
        category: ['Music_rec_smoke'],
        tags: ['Jazz_rec_smoke'],
        status: 'active',
        visibility: 'public',
        hotScore: 100,
        createdAt: now,
        lastUpdatedAt: now,
    });

    // Event B: active, public, future, matches Art_rec_smoke and Painting_rec_smoke
    await eventRepository.createEvent(eventBId, {
        name: 'Event B (Art & Painting)',
        description: 'Painting session',
        date: now + 1000 * 60 * 60 * 48, // in 2 days
        eventType: 'physical',
        organizerId: testOrganizerId,
        category: ['Art_rec_smoke'],
        tags: ['Painting_rec_smoke'],
        status: 'active',
        visibility: 'public',
        hotScore: 50,
        createdAt: now,
        lastUpdatedAt: now,
    });

    // Event C: active, public, future, matches Music_rec_smoke and Rock_rec_smoke (excluded in User 2 history)
    await eventRepository.createEvent(eventCId, {
        name: 'Event C (Music & Rock)',
        description: 'Rock gig',
        date: now + 1000 * 60 * 60 * 72, // in 3 days
        eventType: 'physical',
        organizerId: testOrganizerId,
        category: ['Music_rec_smoke'],
        tags: ['Rock_rec_smoke'],
        status: 'active',
        visibility: 'public',
        hotScore: 80,
        createdAt: now,
        lastUpdatedAt: now,
    });

    // Event D: active, public, past, matches Music_rec_smoke and Blues_rec_smoke
    await eventRepository.createEvent(eventDId, {
        name: 'Event D (Past Music)',
        description: 'Past Blues session',
        date: now - 1000 * 60 * 60 * 24, // yesterday
        eventType: 'physical',
        organizerId: testOrganizerId,
        category: ['Music_rec_smoke'],
        tags: ['Blues_rec_smoke'],
        status: 'active',
        visibility: 'public',
        hotScore: 200,
        createdAt: now,
        lastUpdatedAt: now,
    });

    // Event E: active, private, future, matches Music_rec_smoke and Pop_rec_smoke
    await eventRepository.createEvent(eventEId, {
        name: 'Event E (Private Music)',
        description: 'Private Pop gig',
        date: now + 1000 * 60 * 60 * 96, // in 4 days
        eventType: 'physical',
        organizerId: testOrganizerId,
        category: ['Music_rec_smoke'],
        tags: ['Pop_rec_smoke'],
        status: 'active',
        visibility: 'private',
        hotScore: 90,
        createdAt: now,
        lastUpdatedAt: now,
    });

    // Event F: pending, public, future, matches Music_rec_smoke and Country_rec_smoke
    await eventRepository.createEvent(eventFId, {
        name: 'Event F (Pending Music)',
        description: 'Pending Country gig',
        date: now + 1000 * 60 * 60 * 120, // in 5 days
        eventType: 'physical',
        organizerId: testOrganizerId,
        category: ['Music_rec_smoke'],
        tags: ['Country_rec_smoke'],
        status: 'pending',
        visibility: 'public',
        hotScore: 70,
        createdAt: now,
        lastUpdatedAt: now,
    });

    console.log('\n  [Testing Repository Level Relational Query]');

    // Case 1: User 1 interests: ['Music_rec_smoke', 'Jazz_rec_smoke'], no history exclusion
    const recs1 = await eventRepository.getRecommendedEventsRelational(['Music_rec_smoke', 'Jazz_rec_smoke'], [], 100);
    const recs1Ids = recs1.map(r => r.id);
    console.log('  recs1Ids (User 1):', recs1Ids);
    assert('User 1 query returns Event A', recs1Ids.includes(eventAId));
    assert('User 1 query returns Event C', recs1Ids.includes(eventCId));
    assert('User 1 query does NOT return Event B (no interest overlap)', !recs1Ids.includes(eventBId));
    assert('User 1 query does NOT return Event D (past event)', !recs1Ids.includes(eventDId));
    assert('User 1 query does NOT return Event E (private event)', !recs1Ids.includes(eventEId));
    assert('User 1 query does NOT return Event F (pending event)', !recs1Ids.includes(eventFId));

    // Case 2: User 2 interests: ['Music_rec_smoke'], history exclusion includes Event C
    const recs2 = await eventRepository.getRecommendedEventsRelational(['Music_rec_smoke'], [eventCId], 100);
    const recs2Ids = recs2.map(r => r.id);
    console.log('  recs2Ids (User 2):', recs2Ids);
    assert('User 2 query returns Event A', recs2Ids.includes(eventAId));
    assert('User 2 query does NOT return Event C (history excluded)', !recs2Ids.includes(eventCId));

    // Case 3: User 3 interests: [], no history exclusion
    const recs3 = await eventRepository.getRecommendedEventsRelational([], [], 100);
    const recs3Ids = recs3.map(r => r.id);
    console.log('  recs3Ids (User 3):', recs3Ids);
    assert('User 3 query returns Event A', recs3Ids.includes(eventAId));
    assert('User 3 query returns Event B', recs3Ids.includes(eventBId));
    assert('User 3 query returns Event C', recs3Ids.includes(eventCId));
    // Verify relative hotScore sorting among our test events (Event A: 100, Event C: 80, Event B: 50)
    const idxA = recs3Ids.indexOf(eventAId);
    const idxC = recs3Ids.indexOf(eventCId);
    const idxB = recs3Ids.indexOf(eventBId);
    assert('User 3 query results sorted by hot score DESC', idxA < idxC && idxC < idxB);

    // 3. Spawning application server (Elasticsearch explicitly unconfigured by forcing empty ELASTIC_NODE_URL)
    console.log('\n  [Spawning Application Server (No ES)]');
    const env = {
        ...process.env,
        PORT: TEST_PORT,
        AUTH_PROVIDER: 'backend',
        ACCESS_TOKEN_SECRET: JWT_SECRET,
        ELASTIC_NODE_URL: '', // Forced empty to prevent loading from .env file
    };

    const serverProcess = spawn('node', ['src/server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

    let serverStarted = false;
    serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('Server address') || data.toString().includes('localhost:')) {
            serverStarted = true;
        }
    });

    for (let i = 0; i < 20; i++) {
        if (serverStarted) break;
        try {
            const res = await axios.get(BASE_URL);
            if (res.status === 200) {
                serverStarted = true;
                break;
            }
        } catch (err) {}
        await sleep(500);
    }

    if (!serverStarted) {
        throw new Error('Server failed to start or did not become responsive.');
    }
    console.log('  Server is responsive at:', BASE_URL);

    // 4. Generate tokens and make HTTP calls
    console.log('\n  [Testing HTTP Recommendations Endpoint Fallback]');
    
    // User 1 Call
    const token1 = jwt.sign({ uid: testUser1Id, email: 'test1@test.com', roles: ['user'] }, JWT_SECRET);
    const res1 = await axios.get(`${BASE_URL}/api/web/events/recommendations?limit=100`, {
        headers: { Authorization: `Bearer ${token1}` }
    });
    assert('HTTP recommendations call success for User 1', res1.status === 200);
    const httpRecs1Ids = res1.data.map(e => e.id);
    console.log('  HTTP User 1 recs:', httpRecs1Ids);
    assert('HTTP User 1 returns Event A', httpRecs1Ids.includes(eventAId));
    assert('HTTP User 1 returns Event C', httpRecs1Ids.includes(eventCId));
    assert('HTTP User 1 does NOT return Event B', !httpRecs1Ids.includes(eventBId));

    // User 2 Call (with history exclusion)
    const token2 = jwt.sign({ uid: testUser2Id, email: 'test2@test.com', roles: ['user'] }, JWT_SECRET);
    const res2 = await axios.get(`${BASE_URL}/api/web/events/recommendations?limit=100`, {
        headers: { Authorization: `Bearer ${token2}` }
    });
    assert('HTTP recommendations call success for User 2', res2.status === 200);
    const httpRecs2Ids = res2.data.map(e => e.id);
    console.log('  HTTP User 2 recs:', httpRecs2Ids);
    assert('HTTP User 2 returns Event A', httpRecs2Ids.includes(eventAId));
    assert('HTTP User 2 does NOT return Event C (history excluded)', !httpRecs2Ids.includes(eventCId));

    // User 3 Call (no interests)
    const token3 = jwt.sign({ uid: testUser3Id, email: 'test3@test.com', roles: ['user'] }, JWT_SECRET);
    const res3 = await axios.get(`${BASE_URL}/api/web/events/recommendations?limit=100`, {
        headers: { Authorization: `Bearer ${token3}` }
    });
    assert('HTTP recommendations call success for User 3', res3.status === 200);
    const httpRecs3Ids = res3.data.map(e => e.id);
    console.log('  HTTP User 3 recs:', httpRecs3Ids);
    assert('HTTP User 3 returns Event A', httpRecs3Ids.includes(eventAId));
    assert('HTTP User 3 returns Event B', httpRecs3Ids.includes(eventBId));
    assert('HTTP User 3 returns Event C', httpRecs3Ids.includes(eventCId));

    console.log('\n  [Tear Down Server & Clean DB]');
    serverProcess.kill();

    await query('DELETE FROM user_profiles WHERE id IN ($1, $2, $3)', [testUser1Id, testUser2Id, testUser3Id]);
    await query('DELETE FROM auth_users WHERE id IN ($1, $2, $3)', [testUser1Id, testUser2Id, testUser3Id]);
    await query('DELETE FROM events WHERE id IN ($1, $2, $3, $4, $5, $6)', [eventAId, eventBId, eventCId, eventDId, eventEId, eventFId]);

    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled error running smoke test:', err);
    process.exit(1);
});
