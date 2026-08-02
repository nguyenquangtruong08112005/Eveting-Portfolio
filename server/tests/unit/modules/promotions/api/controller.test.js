'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockPromoService = {
  getAllPromotions: jest.fn(),
  validatePromotionCode: jest.fn(),
  getPromotionsByOrganizer: jest.fn(),
  createPromotion: jest.fn(),
  updatePromotion: jest.fn(),
  deletePromotion: jest.fn(),
};

jest.mock('@/modules/promotions/application/service', () => mockPromoService);

jest.mock('@/shared/logger', () => ({ info: jest.fn() }));

const {
  getAllPromotions, applyPromotion, getOrganizerPromotions,
  createPromotion, updatePromotion, deletePromotion,
} = require('@/modules/promotions/api/controller');

const uid = 'user_001';
const promoId = 'promo_001';

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

describe('getAllPromotions', () => {
  it('returns all promotions with 200', async () => {
    const promotions = [{ id: promoId, code: 'SAVE10' }];
    mockPromoService.getAllPromotions.mockResolvedValue(promotions);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getAllPromotions(req, res, next);
    expect(mockPromoService.getAllPromotions).toHaveBeenCalledWith();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(promotions);
    expect(next).not.toHaveBeenCalled();
  });

  it('propagates service error', async () => {
    const err = new Error('db fail');
    mockPromoService.getAllPromotions.mockRejectedValue(err);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getAllPromotions(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('applyPromotion', () => {
  it('returns 200 with valid result', async () => {
    const result = { valid: true, discountAmount: 10000, code: 'SAVE10' };
    mockPromoService.validatePromotionCode.mockResolvedValue(result);
    const req = mockReq({ body: { code: 'SAVE10', eventId: 'evt_001', quantity: 2, subtotalVnd: 200000 } });
    const res = mockRes();
    const next = jest.fn();
    await applyPromotion(req, res, next);
    expect(mockPromoService.validatePromotionCode).toHaveBeenCalledWith(
      'SAVE10', 'evt_001', 2, { subtotalVnd: 200000, userId: uid }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('defaults quantity to 1 when not provided', async () => {
    mockPromoService.validatePromotionCode.mockResolvedValue({ valid: true });
    const req = mockReq({ body: { code: 'SAVE10', eventId: 'evt_001' } });
    const res = mockRes();
    const next = jest.fn();
    await applyPromotion(req, res, next);
    expect(mockPromoService.validatePromotionCode).toHaveBeenCalledWith(
      'SAVE10', 'evt_001', 1, { subtotalVnd: undefined, userId: uid }
    );
  });

  it('uses req.user.id as fallback when uid missing', async () => {
    mockPromoService.validatePromotionCode.mockResolvedValue({ valid: true });
    const req = mockReq({ user: { id: 'user_by_id' }, body: { code: 'SAVE', eventId: 'evt_001' } });
    const res = mockRes();
    const next = jest.fn();
    await applyPromotion(req, res, next);
    expect(mockPromoService.validatePromotionCode).toHaveBeenCalledWith(
      'SAVE', 'evt_001', 1, { subtotalVnd: undefined, userId: 'user_by_id' }
    );
  });

  it('returns 404 when promotion not found', async () => {
    mockPromoService.validatePromotionCode.mockResolvedValue({
      valid: false, code: 'PROMOTION_NOT_FOUND', message: 'Not found',
    });
    const req = mockReq({ body: { code: 'MISSING', eventId: 'evt_001' } });
    const res = mockRes();
    const next = jest.fn();
    await applyPromotion(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found', code: 'PROMOTION_NOT_FOUND' });
  });

  it('returns 409 for other promotion errors', async () => {
    mockPromoService.validatePromotionCode.mockResolvedValue({
      valid: false, code: 'PROMOTION_EXPIRED', message: 'Expired',
    });
    const req = mockReq({ body: { code: 'EXPIRED', eventId: 'evt_001' } });
    const res = mockRes();
    const next = jest.fn();
    await applyPromotion(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Expired', code: 'PROMOTION_EXPIRED' });
  });
});

describe('getOrganizerPromotions', () => {
  it('returns organizer promotions with 200', async () => {
    const promotions = [{ id: promoId, organizerId: uid }];
    mockPromoService.getPromotionsByOrganizer.mockResolvedValue(promotions);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getOrganizerPromotions(req, res, next);
    expect(mockPromoService.getPromotionsByOrganizer).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(promotions);
  });
});

describe('createPromotion', () => {
  it('creates promotion and returns 201', async () => {
    const promo = { id: promoId, organizerId: uid, code: 'NEW10' };
    mockPromoService.createPromotion.mockResolvedValue(promo);
    const req = mockReq({ body: { code: 'NEW10', discountType: 'percent', discountValue: 10 } });
    const res = mockRes();
    const next = jest.fn();
    await createPromotion(req, res, next);
    expect(mockPromoService.createPromotion).toHaveBeenCalledWith(uid, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(promo);
  });

  it('uses req.user.id as fallback', async () => {
    mockPromoService.createPromotion.mockResolvedValue({ id: promoId });
    const req = mockReq({ user: { id: 'by_id' }, body: { code: 'X' } });
    const res = mockRes();
    const next = jest.fn();
    await createPromotion(req, res, next);
    expect(mockPromoService.createPromotion).toHaveBeenCalledWith('by_id', req.body);
  });
});

describe('updatePromotion', () => {
  it('updates promotion and returns 200', async () => {
    const updated = { id: promoId, code: 'UPDATED' };
    mockPromoService.updatePromotion.mockResolvedValue(updated);
    const req = mockReq({ params: { id: promoId }, body: { code: 'UPDATED' } });
    const res = mockRes();
    const next = jest.fn();
    await updatePromotion(req, res, next);
    expect(mockPromoService.updatePromotion).toHaveBeenCalledWith(promoId, uid, { code: 'UPDATED' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('uses req.user.id as fallback', async () => {
    mockPromoService.updatePromotion.mockResolvedValue({ id: promoId });
    const req = mockReq({ params: { id: promoId }, user: { id: 'by_id' }, body: {} });
    const res = mockRes();
    const next = jest.fn();
    await updatePromotion(req, res, next);
    expect(mockPromoService.updatePromotion).toHaveBeenCalledWith(promoId, 'by_id', {});
  });

  it('propagates service error', async () => {
    const err = new Error('not found');
    mockPromoService.updatePromotion.mockRejectedValue(err);
    const req = mockReq({ params: { id: promoId }, body: {} });
    const res = mockRes();
    const next = jest.fn();
    await updatePromotion(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('deletePromotion', () => {
  it('deletes promotion and returns 204', async () => {
    mockPromoService.deletePromotion.mockResolvedValue({ success: true });
    const req = mockReq({ params: { id: promoId } });
    const res = mockRes();
    const next = jest.fn();
    await deletePromotion(req, res, next);
    expect(mockPromoService.deletePromotion).toHaveBeenCalledWith(promoId, uid);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });

  it('uses req.user.id as fallback', async () => {
    mockPromoService.deletePromotion.mockResolvedValue({ success: true });
    const req = mockReq({ params: { id: promoId }, user: { id: 'by_id' } });
    const res = mockRes();
    const next = jest.fn();
    await deletePromotion(req, res, next);
    expect(mockPromoService.deletePromotion).toHaveBeenCalledWith(promoId, 'by_id');
  });
});
