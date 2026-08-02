const { applyPromotion } = require('@/modules/tickets/application/helpers/promotion-validator.helper');

describe('applyPromotion', () => {
  const mockTx = {};
  const eventId = 'evt_1';

  it('returns null promotion when promo is not found', async () => {
    const repo = { findPromoByCodeInTransaction: async () => null };
    const result = await applyPromotion(repo, mockTx, 'NONEXIST', eventId, 2, 1000);
    expect(result.appliedPromotion).toBeNull();
    expect(result.totalPrice).toBe(1000);
  });

  it('applies percent discount', async () => {
    const promo = {
      _id: 'promo_1', discountType: 'percent', discountValue: 0.1,
      validUntil: Date.now() + 86400000, usedCount: 0, usageLimit: 100,
      eventId: null, minTicketQuantity: null,
    };
    const repo = { findPromoByCodeInTransaction: async () => promo };
    const result = await applyPromotion(repo, mockTx, 'PCT10', eventId, 2, 1000);
    expect(result.appliedPromotion).toBe(promo);
    expect(result.totalPrice).toBe(900);
  });

  it('applies amount discount', async () => {
    const promo = {
      _id: 'promo_2', discountType: 'amount', discountValue: 50000,
      validUntil: Date.now() + 86400000, usedCount: 0, usageLimit: 100,
      eventId: null, minTicketQuantity: null,
    };
    const repo = { findPromoByCodeInTransaction: async () => promo };
    const result = await applyPromotion(repo, mockTx, 'AMT50', eventId, 2, 100000);
    expect(result.totalPrice).toBe(50000);
  });

  it('floors amount discount to zero', async () => {
    const promo = {
      _id: 'promo_3', discountType: 'amount', discountValue: 999999,
      validUntil: Date.now() + 86400000, usedCount: 0, usageLimit: 100,
      eventId: null, minTicketQuantity: null,
    };
    const repo = { findPromoByCodeInTransaction: async () => promo };
    const result = await applyPromotion(repo, mockTx, 'BIG', eventId, 2, 100);
    expect(result.totalPrice).toBe(0);
  });

  it('throws on expired promotion', async () => {
    const promo = {
      _id: 'promo_4', discountType: 'percent', discountValue: 0.1,
      validUntil: Date.now() - 1000, usedCount: 0, usageLimit: 100,
      eventId: null, minTicketQuantity: null,
    };
    const repo = { findPromoByCodeInTransaction: async () => promo };
    await expect(applyPromotion(repo, mockTx, 'EXP', eventId, 2, 1000))
      .rejects.toThrow('Promotion has expired');
  });

  it('throws on exceeded usage limit', async () => {
    const promo = {
      _id: 'promo_5', discountType: 'percent', discountValue: 0.1,
      validUntil: Date.now() + 86400000, usedCount: 100, usageLimit: 100,
      eventId: null, minTicketQuantity: null,
    };
    const repo = { findPromoByCodeInTransaction: async () => promo };
    await expect(applyPromotion(repo, mockTx, 'FULL', eventId, 2, 1000))
      .rejects.toThrow('Promotion usage limit reached');
  });

  it('throws on event mismatch', async () => {
    const promo = {
      _id: 'promo_6', discountType: 'percent', discountValue: 0.1,
      validUntil: Date.now() + 86400000, usedCount: 0, usageLimit: 100,
      eventId: 'evt_other', minTicketQuantity: null,
    };
    const repo = { findPromoByCodeInTransaction: async () => promo };
    await expect(applyPromotion(repo, mockTx, 'WRONG_EVT', eventId, 2, 1000))
      .rejects.toThrow('Promotion not valid for this event');
  });

  it('throws on insufficient ticket quantity', async () => {
    const promo = {
      _id: 'promo_7', discountType: 'percent', discountValue: 0.1,
      validUntil: Date.now() + 86400000, usedCount: 0, usageLimit: 100,
      eventId: null, minTicketQuantity: 5,
    };
    const repo = { findPromoByCodeInTransaction: async () => promo };
    await expect(applyPromotion(repo, mockTx, 'MIN', eventId, 2, 1000))
      .rejects.toThrow('Promotion requires minimum');
  });
});
