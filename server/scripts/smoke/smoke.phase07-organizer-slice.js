require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is required');
    process.exit(1);
}

process.env.JWT_TICKET_SECRET =
    process.env.JWT_TICKET_SECRET || 'phase07-smoke-ticket-secret';
process.env.BANK_ACCOUNT_ENCRYPTION_KEY =
    process.env.BANK_ACCOUNT_ENCRYPTION_KEY ||
    Buffer.alloc(32, 7).toString('base64');

require('../../src/alias-bootstrap');

const { query, getPool } = require('../../src/providers/database/postgres.client');
const teamService = require('../../src/modules/memberships/application/organizer-team.service');
const paymentProfileService = require('../../src/modules/payments/application/organizer-payment-profile.service');
const organizerService = require('../../src/modules/organizer/application/service');
const analyticsService = require('../../src/modules/analytics/application/service');
const orderService = require('../../src/modules/organizer/application/order-operations.service');
const cacheProvider = require('../../src/shared/cache/cache-provider');

const runId = uuidv4().replace(/-/g, '').slice(0, 12);
const ids = {
    organizerA: `p07_org_a_${runId}`,
    organizerB: `p07_org_b_${runId}`,
    staff: `p07_staff_${runId}`,
    attendee: `p07_attendee_${runId}`,
    eventA: `p07_event_a_${runId}`,
    eventB: `p07_event_b_${runId}`,
    ticket: `p07_ticket_${runId}`,
    ticketType: `p07_type_${runId}`,
    order: `p07_order_${runId}`,
    orderItem: `p07_item_${runId}`,
};

function assert(condition, message) {
    if (!condition) throw new Error(message);
    console.log(`[PASS] ${message}`);
}

async function applyMigrations() {
    for (const filename of [
        '075_create_organizer_team_rbac.sql',
        '076_create_organizer_analytics_checkin.sql',
        '077_create_organizer_payment_profiles.sql',
    ]) {
        const sql = fs.readFileSync(
            path.join(__dirname, '..', '..', 'db', 'migrations', filename),
            'utf8'
        );
        await query(sql);
        console.log(`[PASS] applied ${filename}`);
    }
}

async function seed() {
    const users = [
        [ids.organizerA, `p07-org-a-${runId}@example.test`, 'Organizer A', ['organizer']],
        [ids.organizerB, `p07-org-b-${runId}@example.test`, 'Organizer B', ['organizer']],
        [ids.staff, `p07-staff-${runId}@example.test`, 'Team Staff', ['user']],
        [ids.attendee, `p07-attendee-${runId}@example.test`, 'Attendee', ['user']],
    ];
    for (const [id, email, name, roles] of users) {
        await query(
            `INSERT INTO auth_users (
                id, email, password_hash, roles, is_active
             ) VALUES ($1, $2, 'smoke-not-a-real-hash', $3, true)`,
            [id, email, roles]
        );
        await query(
            `INSERT INTO user_profiles (id, name, created_at)
             VALUES ($1, $2, NOW())`,
            [id, name]
        );
    }
    for (const [id, name] of [
        [ids.organizerA, 'Phase 07 Organizer A'],
        [ids.organizerB, 'Phase 07 Organizer B'],
    ]) {
        await query(
            `INSERT INTO organizer_profiles (
                id, user_id, company_name, status, created_at
             ) VALUES ($1, $1, $2, 'approved', NOW())`,
            [id, name]
        );
    }
    await query(
        `INSERT INTO events (id, name, organizer_id, status, visibility, created_at)
         VALUES
            ($1, 'Phase 07 Event A', $3, 'active', 'private', NOW()),
            ($2, 'Phase 07 Event B', $4, 'active', 'private', NOW())`,
        [ids.eventA, ids.eventB, ids.organizerA, ids.organizerB]
    );
    await query(
        `INSERT INTO event_ticket_types (
            id, event_id, code, name, price, capacity, available, sold_count
         ) VALUES ($1, $2, 'GENERAL', 'General', 100000, 10, 9, 1)`,
        [ids.ticketType, ids.eventA]
    );
    await query(
        `INSERT INTO orders (
            id, user_id, event_id, organizer_id, status,
            subtotal_amount, total_amount, currency, paid_at
         ) VALUES ($1, $2, $3, $4, 'paid', 100000, 100000, 'VND', NOW())`,
        [ids.order, ids.attendee, ids.eventA, ids.organizerA]
    );
    await query(
        `INSERT INTO order_items (
            id, order_id, ticket_type_id, ticket_type, event_id,
            quantity, unit_price, subtotal, total_amount, status, created_at
         ) VALUES ($1, $2, $3, 'GENERAL', $4, 1, 100000, 100000, 100000, 'paid', NOW())`,
        [ids.orderItem, ids.order, ids.ticketType, ids.eventA]
    );
    await query(
        `INSERT INTO tickets (
            id, event_id, user_id, organizer_id, type, price,
            quantity, status, order_id, check_in_count
         ) VALUES ($1, $2, $3, $4, $5, 100000, 1, 'paid', $6, 0)`,
        [
            ids.ticket,
            ids.eventA,
            ids.attendee,
            ids.organizerA,
            ids.ticketType,
            ids.order,
        ]
    );
}

async function configureTeams() {
    const teamA = await teamService.ensureOrganizerTeam(
        ids.organizerA,
        'Phase 07 Organizer A'
    );
    const teamB = await teamService.ensureOrganizerTeam(
        ids.organizerB,
        'Phase 07 Organizer B'
    );
    const memberA = `p07_member_a_${runId}`;
    const memberB = `p07_member_b_${runId}`;
    await query(
        `INSERT INTO organizer_team_members (
            id, team_id, user_id, role, status, invited_by
         ) VALUES
            ($1, $3, $5, 'CHECK_IN_STAFF', 'ACTIVE', $6),
            ($2, $4, $5, 'MANAGER', 'ACTIVE', $7)`,
        [
            memberA,
            memberB,
            teamA.id,
            teamB.id,
            ids.staff,
            ids.organizerA,
            ids.organizerB,
        ]
    );
    await query(
        `INSERT INTO organizer_team_member_permissions (member_id, permission)
         VALUES
            ($1, 'SCAN_TICKETS'),
            ($1, 'VIEW_CHECKIN_REPORTS'),
            ($2, 'VIEW_ANALYTICS')`,
        [memberA, memberB]
    );
    await query(
        `INSERT INTO organizer_team_member_scopes (
            id, member_id, event_id, ticket_type_id
         ) VALUES ($1, $2, $3, $4)`,
        [`p07_scope_${runId}`, memberA, ids.eventA, ids.ticketType]
    );

    const allowedA = await teamService.authorizeEventPermission(
        ids.staff,
        ids.eventA,
        'SCAN_TICKETS',
        { ticketTypeId: ids.ticketType }
    );
    assert(allowedA.teamId === teamA.id, 'staff can scan its assigned team A ticket type');

    const allowedB = await teamService.authorizeEventPermission(
        ids.staff,
        ids.eventB,
        'VIEW_ANALYTICS'
    );
    assert(allowedB.teamId === teamB.id, 'one user can hold a different role in team B');

    let denied = false;
    try {
        await teamService.authorizeEventPermission(
            ids.staff,
            ids.eventB,
            'VIEW_ORDERS'
        );
    } catch (error) {
        denied = error.code === 'FORBIDDEN';
    }
    assert(denied, 'cross-team permission is denied when team B grant is absent');
}

async function verifyPaymentProfile() {
    const initial = await paymentProfileService.savePaymentProfile(ids.organizerA, {
        fullName: 'Phase 07 Organizer A',
        bankAccountNumber: '123456789001',
        bankName: 'Vietcombank',
        bankBranch: 'Ho Chi Minh City',
        redInvoiceEnabled: true,
        businessType: 'company',
        address: '1 Test Street',
        taxNumber: '0312345678',
    });
    assert(
        initial.bankAccountNumber === 'XXXXXX9001' &&
            initial.verificationStatus === 'PENDING' &&
            initial.kycRequired === true,
        'new payment profile is masked and requires KYC'
    );

    const verified = await paymentProfileService.setVerificationStatus(
        ids.organizerA,
        'VERIFIED',
        'phase 07 smoke'
    );
    assert(
        verified.verificationStatus === 'VERIFIED' && verified.kycRequired === false,
        'verified profile is eligible for legacy payout bank promotion'
    );

    const changed = await paymentProfileService.savePaymentProfile(ids.organizerA, {
        fullName: 'Phase 07 Organizer A',
        bankAccountNumber: '123456789002',
        bankName: 'Vietcombank',
        bankBranch: 'Ho Chi Minh City',
        redInvoiceEnabled: true,
        businessType: 'company',
        address: '1 Test Street',
        taxNumber: '0312345678',
    });
    assert(
        changed.verificationStatus === 'PENDING' &&
            changed.kycRequired === true &&
            changed.kycRevision === verified.kycRevision + 1,
        'bank account change invalidates verification and increments KYC revision'
    );
    const raw = await query(
        `SELECT encrypted_bank_account
         FROM organizer_payment_profiles
         WHERE organizer_id = $1`,
        [ids.organizerA]
    );
    assert(
        !raw.rows[0].encrypted_bank_account.includes('123456789002'),
        'bank account is encrypted at rest'
    );

    await paymentProfileService.setVerificationStatus(
        ids.organizerA,
        'VERIFIED',
        'phase 07 smoke re-verification'
    );
    const changedLegalProfile = await paymentProfileService.savePaymentProfile(ids.organizerA, {
        fullName: 'Phase 07 Organizer A Ltd',
        bankAccountNumber: '123456789002',
        bankName: 'Vietcombank',
        bankBranch: 'Ho Chi Minh City',
        redInvoiceEnabled: true,
        businessType: 'company',
        address: '1 Test Street',
        taxNumber: '0312345678',
    });
    assert(
        changedLegalProfile.verificationStatus === 'PENDING' &&
            changedLegalProfile.kycRequired === true,
        'legal payment-profile changes also require re-KYC'
    );
}

async function verifyAnalyticsAndOrders() {
    await analyticsService.recordTraffic(
        ids.eventA,
        `visitor-${runId}`,
        'google',
        { path: `/events/${ids.eventA}` }
    );
    const revenue = await analyticsService.getRevenueDashboard(ids.eventA);
    assert(
        revenue.totalRevenue === 100000 && revenue.ticketsSold === 1,
        'revenue aggregation counts each paid order and item once'
    );
    const traffic = await analyticsService.getTrafficDashboard(ids.eventA);
    assert(
        traffic.clicks === 1 &&
            traffic.uniqueVisitors === 1 &&
            traffic.buyers === 1 &&
            traffic.conversionRate === 100,
        'traffic source and conversion analytics are visible'
    );
    const orders = await orderService.listOrders(ids.eventA, {
        page: 1,
        limit: 20,
        search: runId,
    });
    assert(orders.total === 1, 'order visibility is scoped to the requested event');
}

async function verifyDuplicateCheckIn() {
    const qrToken = jwt.sign(
        {
            ticketId: ids.ticket,
            eventId: ids.eventA,
            userId: ids.attendee,
            ticketTypeId: ids.ticketType,
        },
        process.env.JWT_TICKET_SECRET
    );
    const first = await organizerService.checkInByQr(qrToken, ids.staff, 'entry');
    assert(
        first.checkInCount === 1 && first.currentlyInside === 1,
        'assigned check-in staff can scan a valid ticket'
    );
    let duplicateError = null;
    try {
        await organizerService.checkInByQr(qrToken, ids.staff, 'entry');
    } catch (error) {
        duplicateError = error;
    }
    assert(
        duplicateError?.code === 'TICKET_ALREADY_CHECKED_IN',
        `duplicate scan returns machine-readable TICKET_ALREADY_CHECKED_IN conflict (received ${duplicateError?.code || 'no code'}: ${duplicateError?.message || 'no error'})`
    );
    const exited = await organizerService.checkInByQr(qrToken, ids.staff, 'exit');
    assert(exited.currentlyInside === 0, 'ticket exit movement is recorded');
}

async function cleanup() {
    await query(
        `DELETE FROM outbox
         WHERE payload->'data'->>'eventId' = ANY($1::text[])`,
        [[ids.eventA, ids.eventB]]
    );
    await query('DELETE FROM notifications WHERE user_id = ANY($1::text[])', [
        [ids.organizerA, ids.organizerB],
    ]);
    await query('DELETE FROM tax_invoice_requests WHERE event_id = ANY($1::text[])', [
        [ids.eventA, ids.eventB],
    ]);
    await query('DELETE FROM ticket_check_ins WHERE event_id = ANY($1::text[])', [
        [ids.eventA, ids.eventB],
    ]);
    await query('DELETE FROM event_traffic_logs WHERE event_id = ANY($1::text[])', [
        [ids.eventA, ids.eventB],
    ]);
    await query('DELETE FROM analytics WHERE event_id = ANY($1::text[])', [
        [ids.eventA, ids.eventB],
    ]);
    await query('DELETE FROM tickets WHERE id = $1', [ids.ticket]);
    await query('DELETE FROM order_items WHERE id = $1', [ids.orderItem]);
    await query('DELETE FROM orders WHERE id = $1', [ids.order]);
    await query('DELETE FROM event_ticket_types WHERE id = $1', [ids.ticketType]);
    await query(
        'DELETE FROM organizer_payment_profiles WHERE organizer_id = ANY($1::text[])',
        [[ids.organizerA, ids.organizerB]]
    );
    await query('DELETE FROM bank_accounts WHERE organizer_id = ANY($1::text[])', [
        [ids.organizerA, ids.organizerB],
    ]);
    await query('DELETE FROM organizer_teams WHERE owner_organizer_id = ANY($1::text[])', [
        [ids.organizerA, ids.organizerB],
    ]);
    await query('DELETE FROM events WHERE id = ANY($1::text[])', [
        [ids.eventA, ids.eventB],
    ]);
    await query('DELETE FROM organizer_profiles WHERE user_id = ANY($1::text[])', [
        [ids.organizerA, ids.organizerB],
    ]);
    await query('DELETE FROM user_event_history WHERE user_id = $1', [ids.attendee]);
    await query('DELETE FROM user_profiles WHERE id = ANY($1::text[])', [
        [ids.organizerA, ids.organizerB, ids.staff, ids.attendee],
    ]);
    await query('DELETE FROM auth_users WHERE id = ANY($1::text[])', [
        [ids.organizerA, ids.organizerB, ids.staff, ids.attendee],
    ]);
}

async function run() {
    console.log('--- Phase 07 organizer slice smoke ---');
    try {
        await applyMigrations();
        await seed();
        await configureTeams();
        await verifyPaymentProfile();
        await verifyAnalyticsAndOrders();
        await verifyDuplicateCheckIn();
        console.log('Phase 07 organizer slice smoke passed');
    } finally {
        try {
            await cleanup();
        } finally {
            await cacheProvider.disconnect();
            await getPool().end();
        }
    }
}

run().catch((error) => {
    console.error(`Phase 07 organizer slice smoke failed: ${error.stack || error.message}`);
    process.exit(1);
});
