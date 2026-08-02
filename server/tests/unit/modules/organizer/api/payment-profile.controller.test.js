'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockPaymentProfileService = {
  getPaymentProfile: jest.fn(),
  savePaymentProfile: jest.fn(),
  requestTaxInvoice: jest.fn(),
};
jest.mock('@/modules/payments/application/organizer-payment-profile.service', () => mockPaymentProfileService);

const {
  getPaymentProfile,
  savePaymentProfile,
  requestTaxInvoice,
} = require('@/modules/organizer/api/payment-profile.controller');

const uid = 'user_001';
const orderId = 'ord_001';

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
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getPaymentProfile', () => {
  it('returns registered: false when no profile', async () => {
    mockPaymentProfileService.getPaymentProfile.mockResolvedValue(null);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getPaymentProfile(req, res, next);
    expect(mockPaymentProfileService.getPaymentProfile).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ registered: false, profile: null });
  });

  it('returns profile when registered', async () => {
    const profile = { fullName: 'John', bankName: 'VCB' };
    mockPaymentProfileService.getPaymentProfile.mockResolvedValue(profile);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getPaymentProfile(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ registered: true, profile });
  });

  it('propagates error via next', async () => {
    mockPaymentProfileService.getPaymentProfile.mockRejectedValue(new Error('fail'));
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getPaymentProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'fail' }));
  });
});

describe('savePaymentProfile', () => {
  it('saves and returns profile with 200', async () => {
    const profile = { fullName: 'John' };
    mockPaymentProfileService.savePaymentProfile.mockResolvedValue(profile);
    const body = { fullName: 'John', bankName: 'VCB' };
    const req = mockReq({ body });
    const res = mockRes();
    const next = jest.fn();
    await savePaymentProfile(req, res, next);
    expect(mockPaymentProfileService.savePaymentProfile).toHaveBeenCalledWith(uid, body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ profile });
  });
});

describe('requestTaxInvoice', () => {
  it('returns 201 with request', async () => {
    const request = { id: 'req_1' };
    mockPaymentProfileService.requestTaxInvoice.mockResolvedValue(request);
    const body = { companyName: 'ACME' };
    const req = mockReq({ params: { orderId }, body });
    const res = mockRes();
    const next = jest.fn();
    await requestTaxInvoice(req, res, next);
    expect(mockPaymentProfileService.requestTaxInvoice).toHaveBeenCalledWith(uid, orderId, body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ request });
  });
});
