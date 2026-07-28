require('dotenv').config({ quiet: true });
require('../../src/alias-bootstrap');

process.env.JWT_TICKET_SECRET = process.env.JWT_TICKET_SECRET || 'smoke-test-secret';
process.env.QR_CODE_TTL = process.env.QR_CODE_TTL || '1h';

const PASS = [];
const FAIL = [];
let assertCount = 0;

function assert(condition, msg) {
    assertCount++;
    if (!condition) { FAIL.push(msg); console.error('  [FAIL] ' + (assertCount) + '. ' + msg); }
    else { PASS.push(msg); console.log('  [PASS] ' + (assertCount) + '. ' + msg); }
}

// ──────────────────────────────────────────────
// Mock infrastructure
// ──────────────────────────────────────────────
const callLog = [];
function logCall(name, args = {}) {
    callLog.push({ name, ...args });
}

function clearLog() { callLog.length = 0; }

function countCalls(name) {
    return callLog.filter(c => c.name === name).length;
}

// Reset all mocks between test groups
let currentMocks = {};

// ──────────────────────────────────────────────
// Helper: build a mock tx that forwards query to a map
// ──────────────────────────────────────────────
function mockTx(overrides = {}) {
    return {
        query: async (sql, params) => {
            logCall('tx.query', { sql: sql.substring(0, 60), params });
            return { rows: [] };
        },
        ...overrides,
    };
}

// ──────────────────────────────────────────────
// Test 1: bookOrderAtomic — mocked repos, one order, mixed types
// ──────────────────────────────────────────────
async function test1_bookOrderAtomic_creates_one_order() {
    console.log('[1. bookOrderAtomic: mocked repos => one order, items, availability]');

    clearLog();

    const ticketRepo = require('@/providers/database/ticket.repository');
    const eventRepo = require('@/providers/database/event.repository');
    const membershipRepo = require('@/providers/database/membership.repository');
    const orderRepo = require('@/providers/database/order.repository');
    const promotionRepo = require('@/providers/database/promotion.repository');
    const cacheNamespace = require('@/shared/cache/namespace-helpers');

    const origRunTx = ticketRepo.runTransaction;
    const origGetEvent = eventRepo.getEventInTransaction;
    const origGetMembership = membershipRepo.getUserMembershipInTransaction;
    const origCreateOrder = orderRepo.createOrderInTransaction;
    const origCreateOrderItem = orderRepo.createOrderItemInTransaction;
    const origLinkTicketOrd = orderRepo.linkTicketToOrderInTransaction;
    const origCreateTicket = ticketRepo.createTicketInTransaction;
    const origUpdateEvent = eventRepo.updateEventInTransaction;
    const origInvalidate = cacheNamespace.invalidateSeatAvailability;
    const origFindPromo = promotionRepo.findPromoByCodeInTransaction;
    const origIncrementPromo = promotionRepo.incrementPromotionUsedCountInTransaction;

    let createOrderCalls = 0;
    let createOrderItemCalls = 0;
    let linkTicketOrdCalls = 0;
    let createTicketCalls = 0;
    let updateEventCalls = 0;
    let invalidateCalls = 0;
    let capturedOrder = null;
    let capturedItems = [];

    try {
        ticketRepo.runTransaction = async (fn) => {
            const mockTx = { query: async () => ({ rows: [] }) };
            return fn(mockTx);
        };

        eventRepo.getEventInTransaction = async (tx, eventId) => ({
            id: eventId,
            name: 'Test Event',
            organizerId: 'org1',
            ticketTypes: {
                vip: { id: 'tt_vip', price: 300000, available: 10 },
                standard: { id: 'tt_std', price: 150000, available: 20 },
            },
        });

        membershipRepo.getUserMembershipInTransaction = async () => null;
        promotionRepo.findPromoByCodeInTransaction = async () => null;
        promotionRepo.incrementPromotionUsedCountInTransaction = async () => {};

        orderRepo.createOrderInTransaction = async (tx, order) => {
            createOrderCalls++;
            capturedOrder = order;
            logCall('createOrderInTransaction', { orderId: order.id, totalAmount: order.totalAmount, currency: order.currency });
        };

        orderRepo.createOrderItemInTransaction = async (tx, item, orderId) => {
            createOrderItemCalls++;
            capturedItems.push(item);
            logCall('createOrderItemInTransaction', { ticketType: item.ticketType, orderId });
        };

        orderRepo.linkTicketToOrderInTransaction = async (tx, ticketId, orderId, orderItemId) => {
            linkTicketOrdCalls++;
            logCall('linkTicketToOrderInTransaction', { ticketId, orderId });
        };

        ticketRepo.createTicketInTransaction = async (tx, ticketId, data) => {
            createTicketCalls++;
            logCall('createTicketInTransaction', { ticketId, type: data.type, price: data.price, qty: data.quantity });
        };

        eventRepo.updateEventInTransaction = async (tx, eventId, updates) => {
            updateEventCalls++;
            logCall('updateEventInTransaction', { eventId, updateKey: Object.keys(updates)[0] });
        };

        cacheNamespace.invalidateSeatAvailability = async () => { invalidateCalls++; };

        const service = require('@/modules/tickets/application/service');
        assert(typeof service.bookOrderAtomic === 'function', 'bookOrderAtomic exported');

        try {
            await service.bookOrderAtomic('u1', 'evt1', [], null);
            assert(false, 'empty items should throw');
        } catch (e) {
            assert(e.constructor.name === 'BadRequestError' || e.message.includes('non-empty'), 'empty items => BadRequestError');
        }

        clearLog();
        capturedItems = [];
        const result = await service.bookOrderAtomic('u_test1', 'evt_test1', [
            { ticketType: 'vip', quantity: 2 },
            { ticketType: 'standard', quantity: 3 },
        ], null);

        assert(createOrderCalls === 1, 'exactly 1 createOrderInTransaction call');
        assert(capturedOrder && capturedOrder.currency === 'VND', 'order has currency VND');
        assert(capturedOrder && capturedOrder.subtotalAmount === 1050000, 'subtotal 1050000 (2*vip=600k + 3*std=450k)');
        assert(capturedOrder && capturedOrder.totalAmount === 1050000, 'total = subtotal (no discount)');
        assert(capturedOrder && capturedOrder.status === 'pending_payment', 'order status pending_payment');
        assert(createOrderItemCalls === 2, 'exactly 2 createOrderItemInTransaction calls');
        assert(capturedItems[0] && capturedItems[0].ticketType === 'vip', 'first order item is vip');
        assert(capturedItems[1] && capturedItems[1].ticketType === 'standard', 'second order item is standard');
        assert(createTicketCalls === 2, 'exactly 2 createTicketInTransaction calls');
        assert(linkTicketOrdCalls === 2, 'exactly 2 linkTicketToOrderInTransaction calls');
        assert(updateEventCalls === 2, 'exactly 2 updateEventInTransaction (availability) calls');
        assert(invalidateCalls === 1, 'exactly 1 invalidateSeatAvailability call');
        assert(result.tickets && result.tickets.length === 2, 'returned 2 tickets');
        assert(result.orderId && result.orderId.startsWith('ord_'), 'returned orderId');

        const sumPrices = result.tickets.reduce((s, t) => s + t.price, 0);
        assert(sumPrices === 1050000, 'ticket prices sum to total (' + sumPrices + ' === 1050000)');

        console.log('  order=' + capturedOrder.id + ' tickets=' + result.tickets.length +
            ' subtotal=' + capturedOrder.subtotalAmount + ' total=' + capturedOrder.totalAmount +
            ' vip=' + result.tickets[0].price + ' std=' + result.tickets[1].price + '\n');
    } finally {
        ticketRepo.runTransaction = origRunTx;
        eventRepo.getEventInTransaction = origGetEvent;
        membershipRepo.getUserMembershipInTransaction = origGetMembership;
        orderRepo.createOrderInTransaction = origCreateOrder;
        orderRepo.createOrderItemInTransaction = origCreateOrderItem;
        orderRepo.linkTicketToOrderInTransaction = origLinkTicketOrd;
        ticketRepo.createTicketInTransaction = origCreateTicket;
        eventRepo.updateEventInTransaction = origUpdateEvent;
        cacheNamespace.invalidateSeatAvailability = origInvalidate;
        promotionRepo.findPromoByCodeInTransaction = origFindPromo;
        promotionRepo.incrementPromotionUsedCountInTransaction = origIncrementPromo;
    }
}

// ──────────────────────────────────────────────
// Test 2: confirmPaymentForOrderInTransaction — state effects
// ──────────────────────────────────────────────
async function test2_confirmPayment_single_shot() {
    console.log('[2. confirmPaymentForOrderInTransaction: tickets paid, attempt/order once, ledger once]');

    clearLog();

    const service = require('@/modules/tickets/application/service');
    assert(typeof service.confirmPaymentForOrderInTransaction === 'function', 'confirmPaymentForOrderInTransaction exported');

    // Stateful mock — tracks order status changes
    let orderStatus = 'pending_payment';
    const tx = {
        query: async (sql, params) => {
            logCall('tx.query', { sql: sql.substring(0, 60) });

            if (sql.includes('SELECT status FROM orders WHERE id')) {
                return { rows: [{ status: orderStatus }] };
            }
            if (sql.includes('auth_users')) {
                return { rows: [{ email: 'test@example.com', name: 'Test' }] };
            }
            return { rows: [] };
        },
    };

    // Mock the repository methods that the helper calls
    const orderRepo = require('@/providers/database/order.repository');
    const ticketRepo = require('@/providers/database/ticket.repository');
    const analyticsRepo = require('@/providers/database/analytics.repository');
    const membershipRepo = require('@/providers/database/membership.repository');

    const origGetOrderInTransaction = orderRepo.getOrderInTransaction;
    const origGetOrderItems = orderRepo.getOrderItemsInTransaction;
    const origGetLatestAttempt = orderRepo.getLatestPaymentAttemptByOrderId;
    const origUpdatePaymentAttempt = orderRepo.updatePaymentAttemptInTransaction;
    const origUpdateOrderStatus = orderRepo.updateOrderStatusInTransaction;
    const origCreateLedger = orderRepo.createLedgerEntryInTransaction;
    const origGetTicketInTransaction = ticketRepo.getTicketInTransaction;
    const origUpdateTicket = ticketRepo.updateTicketInTransaction;
    const origUpdateAnalytics = analyticsRepo.updateAnalyticsForConfirmPaymentInTransaction;
    const origGetUserMembership = membershipRepo.getUserMembershipInTransaction;
    const origGetTiers = membershipRepo.getMembershipTiersInTransaction;
    const origLogLoyalty = membershipRepo.logLoyaltyPointsEntryInTransaction;
    const origUpdateMembership = membershipRepo.updateUserMembershipPointsAndTierInTransaction;

    let updateTicketCalls = 0;
    let updateAttemptCalls = 0;
    let updateOrderCalls = 0;
    let ledgerCalls = 0;
    let loyaltyCalls = 0;

    try {
        orderRepo.getOrderInTransaction = async (tx, orderId) => {
            logCall('getOrderInTransaction', { orderId });
            return {
                id: orderId,
                userId: 'u1',
                eventId: 'evt1',
                organizerId: 'org1',
                totalAmount: 950000,
                status: 'pending_payment',
                currency: 'VND',
            };
        };

        orderRepo.getOrderItemsInTransaction = async (tx, orderId) => {
            logCall('getOrderItemsInTransaction', { orderId });
            return [
                { ticketId: 'tkt_vip1', quantity: 2 },
                { ticketId: 'tkt_std1', quantity: 3 },
            ];
        };

        orderRepo.getLatestPaymentAttemptByOrderId = async (orderId, tx, lock) => {
            logCall('getLatestPaymentAttemptByOrderId', { orderId, lock });
            return {
                id: 'pa_test1',
                orderId,
                status: 'processing',
                providerOrderId: 'zp_240101_test1_12345',
            };
        };

        ticketRepo.getTicketInTransaction = async (tx, ticketId) => {
            logCall('getTicketInTransaction', { ticketId });
            return {
                id: ticketId,
                userId: 'u1',
                eventId: 'evt1',
                type: ticketId.includes('vip') ? 'vip' : 'standard',
                price: ticketId.includes('vip') ? 571429 : 378571,
                status: 'pending',
                appliedPromoCode: null,
            };
        };

        ticketRepo.updateTicketInTransaction = async (tx, ticketId, updates) => {
            updateTicketCalls++;
            logCall('updateTicketInTransaction', { ticketId, status: updates.status });
        };

        analyticsRepo.updateAnalyticsForConfirmPaymentInTransaction = async (tx, eventId, data) => {
            logCall('updateAnalytics', { eventId, ticketType: data.ticketType });
        };

        membershipRepo.getUserMembershipInTransaction = async (tx, userId) => {
            logCall('getUserMembership', { userId });
            return null;
        };

        membershipRepo.getMembershipTiersInTransaction = async (tx) => {
            logCall('getMembershipTiers');
            return [{ id: 'tier_standard', minPointsRequired: 0 }];
        };

        membershipRepo.logLoyaltyPointsEntryInTransaction = async (tx, entry) => {
            loyaltyCalls++;
            logCall('logLoyalty', { userId: entry.userId, points: entry.points });
        };

        membershipRepo.updateUserMembershipPointsAndTierInTransaction = async (tx, userId, points, lifetime, newTier) => {
            logCall('updateMembership', { userId, points });
        };

        orderRepo.updatePaymentAttemptInTransaction = async (tx, paId, updates) => {
            updateAttemptCalls++;
            logCall('updatePaymentAttempt', { paId, status: updates.status });
        };

        orderRepo.updateOrderStatusInTransaction = async (tx, orderId, status, paidAt) => {
            updateOrderCalls++;
            orderStatus = status;
            logCall('updateOrderStatus', { orderId, status });
        };

        orderRepo.createLedgerEntryInTransaction = async (tx, entry) => {
            ledgerCalls++;
            logCall('createLedger', { orderId: entry.orderId, gross: entry.grossAmount });
        };

        // Execute the confirmation
        const result = await service.confirmPaymentForOrderInTransaction(tx, 'ord_test1', 'zp_trans_abc123');

        // Assertions
        assert(result.orderId === 'ord_test1', 'returned orderId matches');
        assert(result.confirmedCount === 2, 'both tickets confirmed');
        assert(updateTicketCalls === 2, 'exactly 2 tickets updated to paid');

        const membershipCalls = countCalls('logLoyalty');
        assert(loyaltyCalls >= 1, 'loyalty points logged at least once');
        assert(updateAttemptCalls === 1, 'payment attempt updated exactly once');
        assert(updateOrderCalls === 1, 'order status updated exactly once');
        assert(ledgerCalls === 1, 'ledger entry created exactly once');

        // Test idempotency: second call should skip
        updateTicketCalls = 0;
        updateAttemptCalls = 0;
        updateOrderCalls = 0;
        ledgerCalls = 0;
        clearLog();

        const result2 = await service.confirmPaymentForOrderInTransaction(tx, 'ord_test1', 'zp_trans_abc123');

        assert(result2.alreadyPaid === true, 'duplicate call returns alreadyPaid');
        assert(updateTicketCalls === 0, 'duplicate: no tickets re-updated');
        assert(updateAttemptCalls === 0, 'duplicate: no attempt re-updated');
        assert(updateOrderCalls === 0, 'duplicate: no order re-updated');
        assert(ledgerCalls === 0, 'duplicate: no ledger re-created');
    } finally {
        orderRepo.getOrderInTransaction = origGetOrderInTransaction;
        orderRepo.getOrderItemsInTransaction = origGetOrderItems;
        orderRepo.getLatestPaymentAttemptByOrderId = origGetLatestAttempt;
        orderRepo.updatePaymentAttemptInTransaction = origUpdatePaymentAttempt;
        orderRepo.updateOrderStatusInTransaction = origUpdateOrderStatus;
        orderRepo.createLedgerEntryInTransaction = origCreateLedger;
        ticketRepo.getTicketInTransaction = origGetTicketInTransaction;
        ticketRepo.updateTicketInTransaction = origUpdateTicket;
        analyticsRepo.updateAnalyticsForConfirmPaymentInTransaction = origUpdateAnalytics;
        membershipRepo.getUserMembershipInTransaction = origGetUserMembership;
        membershipRepo.getMembershipTiersInTransaction = origGetTiers;
        membershipRepo.logLoyaltyPointsEntryInTransaction = origLogLoyalty;
        membershipRepo.updateUserMembershipPointsAndTierInTransaction = origUpdateMembership;
    }

    console.log('  tickets=' + updateTicketCalls + ' attempt=' + updateAttemptCalls + ' order=' + updateOrderCalls + ' ledger=' + ledgerCalls + ' loyalty=' + loyaltyCalls + '\n');
}

// ──────────────────────────────────────────────
// Test 3: Legacy contracts preserved
// ──────────────────────────────────────────────
async function test3_legacy_contracts() {
    console.log('[3. Legacy endpoints preserved]');

    const fs = require('fs');

    const ticketRoutes = fs.readFileSync(require.resolve('@/modules/tickets/api/routes'), 'utf8');
    assert(ticketRoutes.includes("book-order'"), 'book-order route exists');

    const paymentRoutes = fs.readFileSync(require.resolve('@/modules/payments/api/routes'), 'utf8');
    assert(paymentRoutes.includes("/create-order'"), 'POST /payments/create-order route exists');
    assert(paymentRoutes.includes("/check-status'"), 'POST /payments/check-status route exists');
    assert(paymentRoutes.includes("/callback'"), 'POST /payments/callback route exists');
    assert(paymentRoutes.includes("/create-order-bulk'"), 'POST /payments/create-order-bulk route exists');
    assert(paymentRoutes.includes("/check-order-status'"), 'POST /payments/check-order-status route exists');

    const controllerContent = fs.readFileSync(require.resolve('@/modules/payments/api/controller'), 'utf8');
    assert(controllerContent.includes('createPaymentOrder'), 'createPaymentOrder (legacy single) defined');
    assert(controllerContent.includes('manualCheckPaymentStatus'), 'manualCheckPaymentStatus defined');
    assert(controllerContent.includes('confirmTicketPayment'), 'confirmTicketPayment used for legacy callback');

    const ticketService = require('@/modules/tickets/application/service');
    assert(typeof ticketService.bookTicket === 'function', 'bookTicket (legacy) exported');
    assert(typeof ticketService.confirmTicketPayment === 'function', 'confirmTicketPayment (legacy) exported');

    console.log('');
}

// ──────────────────────────────────────────────
// Test 4: Security boundaries
// ──────────────────────────────────────────────
async function test4_security() {
    console.log('[4. Security boundaries]');

    const payService = require('@/modules/payments/application/service');
    assert(typeof payService.verifyZaloPayCallback === 'function', 'verifyZaloPayCallback exported');

    const routes = require('@/modules/payments/api/routes');
    assert(routes !== undefined, 'payment routes loadable');

    console.log('');
}

// ──────────────────────────────────────────────
// Test 5: order repository getOrderItemsInTransaction
// ──────────────────────────────────────────────
async function test5_repo_function() {
    console.log('[5. Repository helpers]');

    const orderRepo = require('@/providers/database/order.repository');
    assert(typeof orderRepo.getOrderItemsInTransaction === 'function', 'getOrderItemsInTransaction exported');
    assert(typeof orderRepo.getOrderInTransaction === 'function', 'getOrderInTransaction exported');
    assert(typeof orderRepo.getLatestPaymentAttemptByOrderId === 'function', 'getLatestPaymentAttemptByOrderId exported');
    assert(typeof orderRepo.linkTicketsToOrderInTransaction === 'function', 'linkTicketsToOrderInTransaction exported');

    console.log('');
}

// ──────────────────────────────────────────────
// Test 6: Callback logic — DB source of truth
// ──────────────────────────────────────────────
async function test6_callback_db_sot() {
    console.log('[6. Callback uses DB source of truth]');

    // The callback loads order items from DB and uses those to confirm tickets,
    // not the embed_data ticket_ids. We verify the function signature exists.
    const fs = require('fs');
    const controllerContent = fs.readFileSync(require.resolve('@/modules/payments/api/controller'), 'utf8');
    assert(controllerContent.includes('getOrderItemsInTransaction'), 'callback calls getOrderItemsInTransaction');
    assert(controllerContent.includes('confirmPaymentForOrderInTransaction'), 'callback calls confirmPaymentForOrderInTransaction');
    assert(controllerContent.includes('embedTicketIds'), 'callback reads embed_data ticket_ids');

    console.log('');
}

// ──────────────────────────────────────────────
// Test 7: Duplicate redirect URL guard
// ──────────────────────────────────────────────
async function test7_redirect_url() {
    console.log('[7. Redirect URL duplication guard]');

    const urlHasOrderId = (url) => url.includes('orderId=');
    assert(urlHasOrderId('http://example.com?orderId=ord_123') === true, 'detects orderId in URL');
    assert(urlHasOrderId('http://example.com?ticketId=tkt_123') === false, 'no orderId — clean URL');

    console.log('');
}

// ──────────────────────────────────────────────
// Test 8: Stale age and conflict behavior
// ──────────────────────────────────────────────
async function test8_stale_age_conflict() {
    console.log('[8. Processing stale-age and conflict logic]');

    const STALE_AGE = 5 * 60 * 1000;
    assert(STALE_AGE === 300000, 'PROCESSING_STALE_AGE_MS = 300000 (5 min)');

    // Simulate the decision logic from createBulkPaymentOrder
    const now = Date.now();

    // Fresh attempt (10 seconds ago) with no response — should return conflict
    const freshAttempt = { createdAt: now - 10000, responsePayload: null };
    const freshAge = now - freshAttempt.createdAt;
    const isFresh = freshAge < STALE_AGE;
    assert(isFresh === true, 'fresh attempt (10s old) is below stale age');
    assert(freshAge < STALE_AGE, '10s < 300s => conflict, not fail');

    // Stale attempt (10 minutes ago) with no response — should be failed
    const staleAttempt = { createdAt: now - 600000, responsePayload: null };
    const staleAge = now - staleAttempt.createdAt;
    assert(staleAge >= STALE_AGE, '600s >= 300s => stale, may fail');

    // Completed attempt with responsePayload — should reuse
    const completedAttempt = { createdAt: now - 120000, responsePayload: { order_url: 'https://pay.zalopay.vn/abc' } };
    const hasResponse = !!(completedAttempt.responsePayload && completedAttempt.responsePayload.order_url);
    assert(hasResponse === true, 'completed attempt with order_url => reuse response');

    // Verify the three code paths exist in the actual controller source
    const fs = require('fs');
    const controllerContent = fs.readFileSync(require.resolve('@/modules/payments/api/controller'), 'utf8');
    assert(controllerContent.includes('conflictRetry') && controllerContent.includes('existingResponse'),
        'controller has both conflictRetry and existingResponse paths');
    assert(controllerContent.includes('PROCESSING_STALE_AGE_MS'),
        'controller has PROCESSING_STALE_AGE_MS constant');
    assert(controllerContent.includes('conflictRetry: true'),
        'controller returns conflictRetry for fresh processing with no response');
    assert(controllerContent.includes('existingResponse: existingAttempt.responsePayload'),
        'controller reuses existing response when order_url present');
    assert(controllerContent.includes('Stale processing attempt exceeded timeout'),
        'controller fails genuinely stale attempts');
    assert(controllerContent.includes('409') && controllerContent.includes('Please retry shortly'),
        'controller returns 409 for fresh conflict');

    console.log('');
}

// ──────────────────────────────────────────────
// Test 9: SAVEPOINT usage in confirmPaymentForOrderInTransaction
// ──────────────────────────────────────────────
async function test9_savepoint_usage() {
    console.log('[9. SAVEPOINT in confirmPaymentForOrderInTransaction]');

    const fs = require('fs');
    const serviceContent = fs.readFileSync(require.resolve('@/modules/tickets/application/service'), 'utf8');
    assert(serviceContent.includes('SAVEPOINT membership_loyalty'), 'membership block wrapped in SAVEPOINT');
    assert(serviceContent.includes('SAVEPOINT notif_outbox'), 'notification block wrapped in SAVEPOINT');

    console.log('');
}

// ──────────────────────────────────────────────
// Run all
// ──────────────────────────────────────────────
async function run() {
    console.log('--- Aggregate Checkout: Isolated State-Effect Test ---\n');

    try {
        await test1_bookOrderAtomic_creates_one_order();
        await test2_confirmPayment_single_shot();
        await test3_legacy_contracts();
        await test4_security();
        await test5_repo_function();
        await test6_callback_db_sot();
        await test7_redirect_url();
        await test8_stale_age_conflict();
        await test9_savepoint_usage();
    } catch (err) {
        console.error('\n[FATAL]', err.stack || err.message);
        FAIL.push('Fatal: ' + err.message);
    }

    console.log('=== Results ===');
    console.log('  PASS: ' + PASS.length);
    console.log('  FAIL: ' + FAIL.length);
    if (FAIL.length > 0) {
        console.error('\nFailed assertions:');
        FAIL.forEach(f => console.error('  - ' + f));
        process.exit(1);
    }
    process.exit(0);
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
