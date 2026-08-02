'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockOrderOpsService = {
  listOrders: jest.fn(),
  exportOrders: jest.fn(),
  sendCustomerEmail: jest.fn(),
  listTaxInvoiceRequests: jest.fn(),
};
jest.mock('@/modules/organizer/application/order-operations.service', () => mockOrderOpsService);

const {
  listOrders,
  exportOrders,
  sendCustomerEmail,
  listTaxInvoiceRequests,
} = require('@/modules/organizer/api/order-operations.controller');

const eventId = 'evt_001';

function mockReq(overrides = {}) {
  return {
    user: { uid: 'user_001' },
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
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listOrders', () => {
  it('returns orders with 200', async () => {
    const result = { orders: [{ id: 'ord_1' }], total: 1 };
    mockOrderOpsService.listOrders.mockResolvedValue(result);
    const req = mockReq({ params: { eventId }, query: { page: '1', limit: '20' } });
    const res = mockRes();
    const next = jest.fn();
    await listOrders(req, res, next);
    expect(mockOrderOpsService.listOrders).toHaveBeenCalledWith(eventId, { page: '1', limit: '20' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('propagates error via next', async () => {
    mockOrderOpsService.listOrders.mockRejectedValue(new Error('fail'));
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await listOrders(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'fail' }));
  });
});

describe('exportOrders', () => {
  it('returns CSV buffer with correct headers', async () => {
    const buffer = Buffer.from('csv-data');
    mockOrderOpsService.exportOrders.mockResolvedValue(buffer);
    const req = mockReq({ params: { eventId }, query: { status: 'paid' } });
    const res = mockRes();
    const next = jest.fn();
    await exportOrders(req, res, next);
    expect(mockOrderOpsService.exportOrders).toHaveBeenCalledWith(eventId, { status: 'paid' });
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', `attachment; filename=orders_${eventId}.csv`);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });
});

describe('sendCustomerEmail', () => {
  it('returns 202 with result', async () => {
    const result = { sent: 3 };
    mockOrderOpsService.sendCustomerEmail.mockResolvedValue(result);
    const body = { subject: 'Hello', message: 'World' };
    const req = mockReq({ params: { eventId }, body });
    const res = mockRes();
    const next = jest.fn();
    await sendCustomerEmail(req, res, next);
    expect(mockOrderOpsService.sendCustomerEmail).toHaveBeenCalledWith(eventId, body);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('listTaxInvoiceRequests', () => {
  it('returns tax invoice requests with 200', async () => {
    const result = { requests: [] };
    mockOrderOpsService.listTaxInvoiceRequests.mockResolvedValue(result);
    const req = mockReq({ params: { eventId }, query: { status: 'REQUESTED' } });
    const res = mockRes();
    const next = jest.fn();
    await listTaxInvoiceRequests(req, res, next);
    expect(mockOrderOpsService.listTaxInvoiceRequests).toHaveBeenCalledWith(eventId, { status: 'REQUESTED' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});
