'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockTicketService = {
  failOrderPayment: jest.fn(),
  cancelPendingTicket: jest.fn(),
  confirmPaymentForOrderInTransaction: jest.fn(),
  confirmTicketPayment: jest.fn(),
  failTicketPayment: jest.fn(),
  confirmPaymentForOrder: jest.fn(),
};
jest.mock('@/modules/tickets/application/service', () => mockTicketService);

const mockPaymentService = {
  createZaloPayOrder: jest.fn(),
  verifyZaloPayCallback: jest.fn(),
  queryZaloPayOrder: jest.fn(),
  createAggregateZaloPayOrder: jest.fn(),
};
jest.mock('@/modules/payments/application/service', () => mockPaymentService);

const mockTicketRepo = {
  getTicketById: jest.fn(),
  updateTicket: jest.fn(),
  getTicketInTransaction: jest.fn(),
  runTransaction: jest.fn(),
};
jest.mock('@/providers/database/ticket.repository', () => mockTicketRepo);

const mockOrderRepo = {
  getTicketOrderLink: jest.fn(),
  createOrder: jest.fn(),
  linkTicketToOrder: jest.fn(),
  createPaymentAttemptAndLinkTicketAtomic: jest.fn(),
  getOrderById: jest.fn(),
  getPaymentAttemptByProviderOrderId: jest.fn(),
  getOrderItemsInTransaction: jest.fn(),
  getLatestPaymentAttemptByTicketId: jest.fn(),
  getLatestPaymentAttemptByOrderId: jest.fn(),
  updatePaymentAttemptInTransaction: jest.fn(),
  getOrderInTransaction: jest.fn(),
  createPaymentAttemptInTransaction: jest.fn(),
  linkTicketsToOrderInTransaction: jest.fn(),
  updateOrderStatusInTransaction: jest.fn(),
  getTicketsByOrderId: jest.fn(),
};
jest.mock('@/providers/database/order.repository', () => mockOrderRepo);

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

jest.mock('@/shared/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const {
  createPaymentOrder, cancelPayment, createBulkPaymentOrder,
  handleZaloPayCallback, manualCheckPaymentStatus,
  checkOrderPaymentStatus, handleZaloPayRedirect,
} = require('@/modules/payments/api/controller');

const { ORDER_STATUS, PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');
const { NotFoundError, ForbiddenError, ConflictError, BadRequestError } = require('@/shared/errors');

const uid = 'user_001';
const ticketId = 'tkt_001';
const orderId = 'ord_001';
const eventId = 'evt_001';

function mockReq(overrides = {}) {
  return {
    user: { uid },
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
}

function makeTx(overrides = {}) {
  return { query: jest.fn().mockResolvedValue({ rows: [] }), ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTicketRepo.runTransaction.mockImplementation((fn) => fn(makeTx()));
});

const mockTicket = (status = 'pending', overrides = {}) => ({
  id: ticketId, userId: uid, eventId, status,
  price: 100000, type: 'vip', quantity: 1, unitPrice: 100000,
  organizerId: 'org_001',
  ...overrides,
});

const mockZaloResponse = {
  return_code: 1, return_message: 'success',
  order_url: 'https://zalopay.vn/order/abc', app_trans_id: '250731_abc_12345',
  zp_trans_id: 'zp_001',
};

// ─── createPaymentOrder ──────────────────────────────────────────────

describe('createPaymentOrder', () => {
  it('delegates to createBulkPaymentOrder when orderId provided', async () => {
    mockTicketRepo.runTransaction.mockImplementation((fn) => fn(makeTx({
      query: jest.fn().mockResolvedValue({ rows: [{ status: ORDER_STATUS.PENDING_PAYMENT }] }),
    })));
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({
      id: orderId, userId: uid, totalAmount: 200000,
    });
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue(null);
    mockOrderRepo.getOrderItemsInTransaction.mockResolvedValue([{ ticketId: 'tkt_1' }]);
    mockTicketRepo.getTicketInTransaction.mockResolvedValue(mockTicket());
    mockOrderRepo.createPaymentAttemptInTransaction.mockResolvedValue({});
    mockPaymentService.createAggregateZaloPayOrder.mockResolvedValue(mockZaloResponse);

    const req = mockReq({ body: { orderId, redirectUrl: 'http://example.com/callback' } });
    const res = mockRes();
    const next = jest.fn();
    await createPaymentOrder(req, res, next);
    expect(mockPaymentService.createAggregateZaloPayOrder).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ orderId }));
  });

  it('returns 404 when ticket not found', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(null);
    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await createPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns 403 when userId does not match', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending', { userId: 'other_user' }));
    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await createPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('returns 409 when ticket not payable', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('paid'));
    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await createPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });

  it('returns 200 with zalo response on success', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockPaymentService.createZaloPayOrder.mockResolvedValue(mockZaloResponse);
    mockTicketRepo.updateTicket.mockResolvedValue({});
    mockOrderRepo.getTicketOrderLink.mockResolvedValue({ orderId, orderItemId: 'oi_1', paymentAttemptId: null });
    mockOrderRepo.createPaymentAttemptAndLinkTicketAtomic.mockResolvedValue({});

    const req = mockReq({ body: { ticketId, redirectUrl: 'http://localhost:3000/callback' } });
    const res = mockRes();
    const next = jest.fn();
    await createPaymentOrder(req, res, next);
    expect(mockPaymentService.createZaloPayOrder).toHaveBeenCalledWith(mockTicket('pending'), 'http://localhost:3000/callback');
    expect(mockTicketRepo.updateTicket).toHaveBeenCalledWith(ticketId, expect.objectContaining({
      zaloAppTransId: mockZaloResponse.app_trans_id,
      paymentStatus: 'processing',
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockZaloResponse);
  });

  it('returns 400 when ZaloPay returns no app_trans_id', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockPaymentService.createZaloPayOrder.mockResolvedValue({ return_code: 1, order_url: 'url' });

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await createPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('propagates payment attempt creation error', async () => {
    const dbErr = new Error('FK constraint');
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockPaymentService.createZaloPayOrder.mockResolvedValue(mockZaloResponse);
    mockOrderRepo.getTicketOrderLink.mockResolvedValue({ orderId, orderItemId: 'oi_1' });
    mockOrderRepo.createPaymentAttemptAndLinkTicketAtomic.mockRejectedValue(dbErr);

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await createPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(dbErr);
  });

  it('creates shadow order when no order link exists', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockPaymentService.createZaloPayOrder.mockResolvedValue(mockZaloResponse);
    mockOrderRepo.getTicketOrderLink.mockResolvedValue(null);
    mockOrderRepo.createOrder.mockResolvedValue({});
    mockOrderRepo.linkTicketToOrder.mockResolvedValue({});
    mockOrderRepo.createPaymentAttemptAndLinkTicketAtomic.mockResolvedValue({});

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await createPaymentOrder(req, res, next);
    expect(mockOrderRepo.createOrder).toHaveBeenCalled();
    expect(mockOrderRepo.linkTicketToOrder).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── cancelPayment ───────────────────────────────────────────────────

describe('cancelPayment', () => {
  it('cancels by orderId', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, userId: uid });
    mockTicketService.failOrderPayment.mockResolvedValue({ status: 'cancelled' });

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelPayment(req, res, next);
    expect(mockOrderRepo.getOrderById).toHaveBeenCalledWith(orderId);
    expect(mockTicketService.failOrderPayment).toHaveBeenCalledWith(orderId, 'Cancelled by buyer');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ orderId, status: 'cancelled' });
  });

  it('cancels by ticketId', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockTicketService.cancelPendingTicket.mockResolvedValue({});

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelPayment(req, res, next);
    expect(mockTicketRepo.getTicketById).toHaveBeenCalledWith(ticketId);
    expect(mockTicketService.cancelPendingTicket).toHaveBeenCalledWith(ticketId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ticketId, status: 'cancelled' });
  });

  it('returns 404 when order not found', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue(null);

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelPayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns 403 when order userId does not match', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, userId: 'other_user' });

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelPayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('returns 404 when ticket not found', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(null);

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelPayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns 403 when ticket userId does not match', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending', { userId: 'other_user' }));

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await cancelPayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

// ─── createBulkPaymentOrder ──────────────────────────────────────────

describe('createBulkPaymentOrder', () => {
  const mockTx = {
    query: jest.fn().mockResolvedValue({ rows: [{ status: ORDER_STATUS.PENDING_PAYMENT }] }),
  };

  function setupTxResolve(overrides = {}) {
    mockTicketRepo.runTransaction.mockImplementation((fn) => fn({ ...mockTx, ...overrides }));
  }

  it('returns 200 with zalo response on success', async () => {
    setupTxResolve();
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({ id: orderId, userId: uid, totalAmount: 200000 });
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue(null);
    mockOrderRepo.getOrderItemsInTransaction.mockResolvedValue([{ ticketId: 'tkt_1' }]);
    mockTicketRepo.getTicketInTransaction.mockResolvedValue(mockTicket());
    mockOrderRepo.createPaymentAttemptInTransaction.mockResolvedValue({});
    mockPaymentService.createAggregateZaloPayOrder.mockResolvedValue(mockZaloResponse);

    const req = mockReq({ body: { orderId, redirectUrl: 'http://example.com/cb' } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(mockPaymentService.createAggregateZaloPayOrder).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ orderId }));
  });

  it('returns 400 when orderId missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('returns 404 when order not found', async () => {
    mockTicketRepo.runTransaction.mockImplementation((fn) => fn({
      query: jest.fn().mockResolvedValue({ rows: [] }),
    }));

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns 409 when order already paid', async () => {
    mockTicketRepo.runTransaction.mockImplementation((fn) => fn({
      query: jest.fn().mockResolvedValue({ rows: [{ status: ORDER_STATUS.PAID }] }),
    }));

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });

  it('returns 403 when userId does not match', async () => {
    setupTxResolve();
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({ id: orderId, userId: 'other_user', totalAmount: 100 });

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('returns existing response when attempt has responsePayload', async () => {
    setupTxResolve();
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({ id: orderId, userId: uid, totalAmount: 200000 });
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.PROCESSING,
      responsePayload: { order_url: 'https://zalopay.vn/abc', app_trans_id: 'existing_id' },
    });

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ orderId }));
  });

  it('returns 409 when conflict retry within stale age', async () => {
    setupTxResolve();
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({ id: orderId, userId: uid, totalAmount: 200000 });
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.PROCESSING,
      responsePayload: null, createdAt: Date.now(),
    });

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Payment is being processed. Please retry shortly.' }));
  });

  it('fails stale processing attempt', async () => {
    jest.useFakeTimers();
    const staleTime = Date.now() - 10 * 60 * 1000;
    setupTxResolve();
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({ id: orderId, userId: uid, totalAmount: 200000 });
    mockOrderRepo.getLatestPaymentAttemptByOrderId
      .mockResolvedValueOnce({
        id: 'pa_stale', status: PAYMENT_STATUS.PROCESSING,
        responsePayload: null, createdAt: staleTime,
      })
      .mockResolvedValue(null);
    mockOrderRepo.getOrderItemsInTransaction.mockResolvedValue([{ ticketId: 'tkt_1' }]);
    mockTicketRepo.getTicketInTransaction.mockResolvedValue(mockTicket());
    mockOrderRepo.createPaymentAttemptInTransaction.mockResolvedValue({});
    mockPaymentService.createAggregateZaloPayOrder.mockResolvedValue(mockZaloResponse);

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(mockOrderRepo.updatePaymentAttemptInTransaction).toHaveBeenCalledWith(
      expect.any(Object), 'pa_stale', expect.objectContaining({ status: PAYMENT_STATUS.FAILED })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    jest.useRealTimers();
  });

  it('returns 409 when succeeded attempt exists', async () => {
    setupTxResolve();
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({ id: orderId, userId: uid, totalAmount: 200000 });
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.SUCCEEDED,
    });

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });

  it('returns 400 when order has no ticket items', async () => {
    setupTxResolve();
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({ id: orderId, userId: uid, totalAmount: 200000 });
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue(null);
    mockOrderRepo.getOrderItemsInTransaction.mockResolvedValue([]);

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('catches ZaloPay creation error and fails attempt in transaction', async () => {
    setupTxResolve();
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({ id: orderId, userId: uid, totalAmount: 200000 });
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue(null);
    mockOrderRepo.getOrderItemsInTransaction.mockResolvedValue([{ ticketId: 'tkt_1' }]);
    mockTicketRepo.getTicketInTransaction.mockResolvedValue(mockTicket());
    mockOrderRepo.createPaymentAttemptInTransaction.mockResolvedValue({});
    const zpErr = new Error('ZaloPay timeout');
    mockPaymentService.createAggregateZaloPayOrder.mockRejectedValue(zpErr);

    const req = mockReq({ body: { orderId, redirectUrl: 'http://example.com/cb' } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(mockOrderRepo.updatePaymentAttemptInTransaction).toHaveBeenCalledWith(
      expect.any(Object), 'pa_fixed-uuid', expect.objectContaining({ status: PAYMENT_STATUS.FAILED })
    );
    expect(next).toHaveBeenCalledWith(zpErr);
  });

  it('adds orderId to redirectUrl if not present', async () => {
    setupTxResolve();
    mockOrderRepo.getOrderInTransaction.mockResolvedValue({ id: orderId, userId: uid, totalAmount: 200000 });
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue(null);
    mockOrderRepo.getOrderItemsInTransaction.mockResolvedValue([{ ticketId: 'tkt_1' }]);
    mockTicketRepo.getTicketInTransaction.mockResolvedValue(mockTicket());
    mockOrderRepo.createPaymentAttemptInTransaction.mockResolvedValue({});
    mockPaymentService.createAggregateZaloPayOrder.mockResolvedValue(mockZaloResponse);

    const req = mockReq({ body: { orderId, redirectUrl: 'http://example.com/cb' } });
    const res = mockRes();
    const next = jest.fn();
    await createBulkPaymentOrder(req, res, next);
    expect(mockPaymentService.createAggregateZaloPayOrder).toHaveBeenCalledWith(
      orderId, expect.any(Array), 200000, uid,
      'http://example.com/cb&orderId=' + encodeURIComponent(orderId),
      expect.any(String)
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── handleZaloPayCallback ───────────────────────────────────────────

describe('handleZaloPayCallback', () => {
  const callbackBody = {
    data: JSON.stringify({
      app_trans_id: '250731_abc_12345',
      zp_trans_id: 'zp_001',
      embed_data: JSON.stringify({ ticket_ids: ['tkt_1'], ticket_id: 'tkt_1' }),
    }),
    mac: 'valid-mac',
  };

  it('returns -1 when MAC invalid', async () => {
    mockPaymentService.verifyZaloPayCallback.mockReturnValue(false);
    const req = mockReq({ body: callbackBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(res.json).toHaveBeenCalledWith({ return_code: -1, return_message: 'mac not equal' });
  });

  it('returns 0 when payment attempt not found', async () => {
    mockPaymentService.verifyZaloPayCallback.mockReturnValue(true);
    mockOrderRepo.getPaymentAttemptByProviderOrderId.mockResolvedValue(null);

    const req = mockReq({ body: callbackBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(res.json).toHaveBeenCalledWith({ return_code: 0, return_message: 'payment attempt not found' });
  });

  it('returns 1 when already succeeded', async () => {
    mockPaymentService.verifyZaloPayCallback.mockReturnValue(true);
    mockOrderRepo.getPaymentAttemptByProviderOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.SUCCEEDED, ticketId,
    });

    const req = mockReq({ body: callbackBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(res.json).toHaveBeenCalledWith({ return_code: 1, return_message: 'success' });
  });

  it('returns 0 when in terminal failed state', async () => {
    mockPaymentService.verifyZaloPayCallback.mockReturnValue(true);
    mockOrderRepo.getPaymentAttemptByProviderOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.FAILED, ticketId,
    });

    const req = mockReq({ body: callbackBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ return_code: 0 }));
  });

  it('returns 0 when in terminal cancelled state', async () => {
    mockPaymentService.verifyZaloPayCallback.mockReturnValue(true);
    mockOrderRepo.getPaymentAttemptByProviderOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.CANCELLED, ticketId,
    });

    const req = mockReq({ body: callbackBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ return_code: 0 }));
  });

  it('processes aggregate order path with DB ticket IDs', async () => {
    mockPaymentService.verifyZaloPayCallback.mockReturnValue(true);
    mockOrderRepo.getPaymentAttemptByProviderOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.PROCESSING,
      orderId, ticketId,
    });
    mockOrderRepo.getOrderItemsInTransaction.mockResolvedValue([
      { ticketId: 'tkt_1' }, { ticketId: 'tkt_2' },
    ]);
    mockTicketService.confirmPaymentForOrderInTransaction.mockResolvedValue({});

    const req = mockReq({ body: callbackBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(mockOrderRepo.getOrderItemsInTransaction).toHaveBeenCalledWith(expect.any(Object), orderId);
    expect(mockTicketService.confirmPaymentForOrderInTransaction).toHaveBeenCalledWith(
      expect.any(Object), orderId, 'zp_001'
    );
    expect(res.json).toHaveBeenCalledWith({ return_code: 1, return_message: 'success' });
  });

  it('processes legacy single ticket path', async () => {
    mockPaymentService.verifyZaloPayCallback.mockReturnValue(true);
    const legacyBody = {
      data: JSON.stringify({
        app_trans_id: '250731_abc_12345',
        zp_trans_id: 'zp_001',
        embed_data: JSON.stringify({ ticket_id: 'tkt_legacy' }),
      }),
      mac: 'valid-mac',
    };
    mockOrderRepo.getPaymentAttemptByProviderOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.PROCESSING,
      orderId: null, ticketId: 'tkt_legacy',
    });
    mockTicketService.confirmTicketPayment.mockResolvedValue({});

    const req = mockReq({ body: legacyBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(mockTicketService.confirmTicketPayment).toHaveBeenCalledWith('tkt_legacy', 'zp_001', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ return_code: 1, return_message: 'success' });
  });

  it('returns 0 when no order or ticket reference', async () => {
    mockPaymentService.verifyZaloPayCallback.mockReturnValue(true);
    const noRefBody = {
      data: JSON.stringify({
        app_trans_id: '250731_abc_12345',
        zp_trans_id: 'zp_001',
        embed_data: JSON.stringify({}),
      }),
      mac: 'valid-mac',
    };
    mockOrderRepo.getPaymentAttemptByProviderOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.PROCESSING,
      orderId: null, ticketId: null,
    });

    const req = mockReq({ body: noRefBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(res.json).toHaveBeenCalledWith({ return_code: 0, return_message: 'no order or ticket reference' });
  });

  it('returns 0 when aggregate order has no ticket items', async () => {
    mockPaymentService.verifyZaloPayCallback.mockReturnValue(true);
    mockOrderRepo.getPaymentAttemptByProviderOrderId.mockResolvedValue({
      id: 'pa_1', status: PAYMENT_STATUS.PROCESSING,
      orderId, ticketId,
    });
    mockOrderRepo.getOrderItemsInTransaction.mockResolvedValue([]);

    const req = mockReq({ body: callbackBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(res.json).toHaveBeenCalledWith({ return_code: 0, return_message: 'order has no ticket items' });
  });

  it('catches exceptions and returns 0 with error message', async () => {
    mockPaymentService.verifyZaloPayCallback.mockImplementation(() => { throw new Error('unexpected crash'); });

    const req = mockReq({ body: callbackBody });
    const res = mockRes();
    await handleZaloPayCallback(req, res);
    expect(res.json).toHaveBeenCalledWith({ return_code: 0, return_message: 'unexpected crash' });
  });
});

// ─── manualCheckPaymentStatus ────────────────────────────────────────

describe('manualCheckPaymentStatus', () => {
  it('returns 404 when ticket not found', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(null);
    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns paid when ticket status is paid', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('paid'));
    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ status: 'paid', message: 'Paid confirmed' });
  });

  it('returns 400 when no provider order ID', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockOrderRepo.getLatestPaymentAttemptByTicketId.mockResolvedValue(null);

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('returns paid when ZaloPay query confirms', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockOrderRepo.getLatestPaymentAttemptByTicketId
      .mockResolvedValueOnce({ providerOrderId: 'zp_001' })
      .mockResolvedValue({ id: 'pa_1', status: PAYMENT_STATUS.PROCESSING, orderId: null, ticketId });
    mockPaymentService.queryZaloPayOrder.mockResolvedValue({ return_code: 1, zp_trans_id: 'zp_001' });
    mockTicketService.confirmTicketPayment.mockResolvedValue({});

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(mockTicketService.confirmTicketPayment).toHaveBeenCalledWith(ticketId, 'zp_001', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }));
  });

  it('returns failed when ZaloPay query reports failure', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockOrderRepo.getLatestPaymentAttemptByTicketId
      .mockResolvedValueOnce({ providerOrderId: 'zp_001' })
      .mockResolvedValue({ id: 'pa_1', status: PAYMENT_STATUS.PROCESSING, orderId: null, ticketId });
    mockPaymentService.queryZaloPayOrder.mockResolvedValue({ return_code: 2 });
    mockTicketService.failTicketPayment.mockResolvedValue({});

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(mockTicketService.failTicketPayment).toHaveBeenCalledWith(ticketId, 'ZaloPay reported failure', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('returns pending when ZaloPay query has other return_code', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockOrderRepo.getLatestPaymentAttemptByTicketId
      .mockResolvedValueOnce({ providerOrderId: 'zp_001' })
      .mockResolvedValue({ id: 'pa_1', status: PAYMENT_STATUS.PROCESSING, orderId: null, ticketId });
    mockPaymentService.queryZaloPayOrder.mockResolvedValue({ return_code: 3 });

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
  });

  it('returns already succeeded when latest attempt is succeeded', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockOrderRepo.getLatestPaymentAttemptByTicketId
      .mockResolvedValueOnce({ providerOrderId: 'zp_001' })
      .mockResolvedValue({ id: 'pa_1', status: PAYMENT_STATUS.SUCCEEDED, orderId: null, ticketId });
    mockPaymentService.queryZaloPayOrder.mockResolvedValue({ return_code: 1, zp_trans_id: 'zp_002' });

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid', message: 'Paid confirmed (already succeeded)' }));
  });

  it('returns already failed when latest attempt is failed', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockOrderRepo.getLatestPaymentAttemptByTicketId
      .mockResolvedValueOnce({ providerOrderId: 'zp_001' })
      .mockResolvedValue({ id: 'pa_1', status: PAYMENT_STATUS.FAILED, orderId: null, ticketId });
    mockPaymentService.queryZaloPayOrder.mockResolvedValue({ return_code: 2 });

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', message: 'Payment failed (already failed)' }));
  });

  it('returns paid with aggregate order path', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockOrderRepo.getLatestPaymentAttemptByTicketId
      .mockResolvedValueOnce({ providerOrderId: 'zp_001' })
      .mockResolvedValue({ id: 'pa_1', status: PAYMENT_STATUS.PROCESSING, orderId, ticketId });
    mockPaymentService.queryZaloPayOrder.mockResolvedValue({ return_code: 1, zp_trans_id: 'zp_001' });
    mockTicketService.confirmPaymentForOrderInTransaction.mockResolvedValue({});

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(mockTicketService.confirmPaymentForOrderInTransaction).toHaveBeenCalledWith(
      expect.any(Object), orderId, 'zp_001'
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }));
  });

  it('returns failed with aggregate order path', async () => {
    mockTicketRepo.getTicketById.mockResolvedValue(mockTicket('pending'));
    mockOrderRepo.getLatestPaymentAttemptByTicketId
      .mockResolvedValueOnce({ providerOrderId: 'zp_001' })
      .mockResolvedValue({ id: 'pa_1', status: PAYMENT_STATUS.PROCESSING, orderId, ticketId });
    mockPaymentService.queryZaloPayOrder.mockResolvedValue({ return_code: 2 });
    mockTicketService.failOrderPayment.mockResolvedValue({});

    const req = mockReq({ body: { ticketId } });
    const res = mockRes();
    const next = jest.fn();
    await manualCheckPaymentStatus(req, res, next);
    expect(mockTicketService.failOrderPayment).toHaveBeenCalledWith(orderId, 'ZaloPay reported failure', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });
});

// ─── checkOrderPaymentStatus ─────────────────────────────────────────

describe('checkOrderPaymentStatus', () => {
  it('returns 404 when order not found', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue(null);
    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await checkOrderPaymentStatus(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns paid when order is PAID', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: ORDER_STATUS.PAID, totalAmount: 200000 });
    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await checkOrderPaymentStatus(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ status: 'paid', orderId, totalAmount: 200000 });
  });

  it('returns 404 when no tickets for order', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: ORDER_STATUS.PENDING_PAYMENT, totalAmount: 200000 });
    mockOrderRepo.getTicketsByOrderId.mockResolvedValue([]);
    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await checkOrderPaymentStatus(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns paid when all tickets paid', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: ORDER_STATUS.PENDING_PAYMENT, totalAmount: 200000 });
    mockOrderRepo.getTicketsByOrderId.mockResolvedValue([
      { status: 'paid' }, { status: 'checkedIn' },
    ]);
    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await checkOrderPaymentStatus(req, res, next);
    expect(mockOrderRepo.updateOrderStatusInTransaction).toHaveBeenCalledWith(null, orderId, ORDER_STATUS.PAID, expect.any(Number));
    expect(res.json).toHaveBeenCalledWith({ status: 'paid', orderId, totalAmount: 200000 });
  });

  it('returns paid when ZaloPay query confirms', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: ORDER_STATUS.PENDING_PAYMENT, totalAmount: 200000 });
    mockOrderRepo.getTicketsByOrderId.mockResolvedValue([{ status: 'pending' }]);
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue({
      id: 'pa_1', providerOrderId: 'zp_001', status: PAYMENT_STATUS.PROCESSING,
    });
    mockPaymentService.queryZaloPayOrder.mockResolvedValue({ return_code: 1, zp_trans_id: 'zp_001' });
    mockTicketService.confirmPaymentForOrder.mockResolvedValue({});

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await checkOrderPaymentStatus(req, res, next);
    expect(mockTicketService.confirmPaymentForOrder).toHaveBeenCalledWith(orderId, [], 'zp_001');
    expect(res.json).toHaveBeenCalledWith({ status: 'paid', orderId, totalAmount: 200000 });
  });

  it('returns pending when tickets are pending', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: ORDER_STATUS.PENDING_PAYMENT, totalAmount: 200000 });
    mockOrderRepo.getTicketsByOrderId.mockResolvedValue([{ status: 'pending' }]);
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue(null);

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await checkOrderPaymentStatus(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ status: 'pending', orderId });
  });

  it('returns failed when any ticket cancelled', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: ORDER_STATUS.PENDING_PAYMENT, totalAmount: 200000 });
    mockOrderRepo.getTicketsByOrderId.mockResolvedValue([{ status: 'cancelled' }]);
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue(null);

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await checkOrderPaymentStatus(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ status: 'failed', orderId });
  });

  it('returns unknown when no matching status', async () => {
    mockOrderRepo.getOrderById.mockResolvedValue({ id: orderId, status: ORDER_STATUS.PENDING_PAYMENT, totalAmount: 200000 });
    mockOrderRepo.getTicketsByOrderId.mockResolvedValue([{ status: 'on_hold' }]);
    mockOrderRepo.getLatestPaymentAttemptByOrderId.mockResolvedValue(null);

    const req = mockReq({ body: { orderId } });
    const res = mockRes();
    const next = jest.fn();
    await checkOrderPaymentStatus(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ status: 'unknown', orderId });
  });
});

// ─── handleZaloPayRedirect ───────────────────────────────────────────

describe('handleZaloPayRedirect', () => {
  it('redirects to targetUrl with query params forwarded', async () => {
    const req = mockReq({ query: { targetUrl: 'https://example.com/callback', status: 'success', orderId } });
    const res = mockRes();
    const next = jest.fn();
    await handleZaloPayRedirect(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(
      'https://example.com/callback?status=success&orderId=' + orderId
    );
  });

  it('redirects to / when targetUrl missing', async () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    const next = jest.fn();
    await handleZaloPayRedirect(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('redirects to / when targetUrl is invalid', async () => {
    const req = mockReq({ query: { targetUrl: 'not-a-valid-url' } });
    const res = mockRes();
    const next = jest.fn();
    await handleZaloPayRedirect(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/');
  });
});
