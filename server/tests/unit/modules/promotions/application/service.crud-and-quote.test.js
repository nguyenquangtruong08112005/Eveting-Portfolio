jest.mock('crypto', () => ({ randomUUID: jest.fn(() => 'fixed-uuid') }));

jest.mock('@/shared/errors', () => {
  class AppError extends Error {
    constructor(message, statusCode, code, isOperational = true) {
      super(message);
      this.name = this.constructor.name;
      this.statusCode = statusCode;
      this.code = code;
      this.isOperational = isOperational;
    }
  }
  return {
    AppError,
    BadRequestError: class extends AppError {
      constructor(m = 'Bad Request') { super(m, 400, 'BAD_REQUEST'); }
    },
    UnauthorizedError: class extends AppError {
      constructor(m = 'Unauthorized') { super(m, 401, 'UNAUTHORIZED'); }
    },
    ForbiddenError: class extends AppError {
      constructor(m = 'Forbidden') { super(m, 403, 'FORBIDDEN'); }
    },
    NotFoundError: class extends AppError {
      constructor(m = 'Not Found') { super(m, 404, 'NOT_FOUND'); }
    },
    ConflictError: class extends AppError {
      constructor(m = 'Conflict') { super(m, 409, 'CONFLICT'); }
    },
  };
});

jest.mock('@/providers/database/promotion.repository', () => ({
  getActivePromotions: jest.fn(),
  getPromotionsByOrganizer: jest.fn(),
  findByCode: jest.fn(),
  getEventById: jest.fn(),
  getPromotionById: jest.fn(),
  createPromotion: jest.fn(),
  updatePromotion: jest.fn(),
  deletePromotion: jest.fn(),
  withTransaction: jest.fn(),
  getEventScopeInTransaction: jest.fn(),
  findPromoByCodeInTransaction: jest.fn(),
  getUserActiveUsageCountInTransaction: jest.fn(),
}));

const { createPromotionService } = require('@/modules/promotions/application/service');

const ORGANIZER_ID = 'org_1';
const OTHER_ORG_ID = 'org_2';
const EVENT_ID = 'evt_1';
const FOREIGN_EVENT_ID = 'evt_2';
const USER_ID = 'usr_1';
const PROMO_ID = 'promo_fixed-uuid';
const NOW = 1700000000000;

const mockTx = { query: jest.fn() };

function mockRepo() {
  return {
    getActivePromotions: jest.fn(),
    getPromotionsByOrganizer: jest.fn(),
    findByCode: jest.fn(),
    getEventById: jest.fn(),
    getPromotionById: jest.fn(),
    createPromotion: jest.fn(),
    updatePromotion: jest.fn(),
    deletePromotion: jest.fn(),
    withTransaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    getEventScopeInTransaction: jest.fn(),
    findPromoByCodeInTransaction: jest.fn(),
    getUserActiveUsageCountInTransaction: jest.fn(),
  };
}

function basePromotion(overrides = {}) {
  return {
    id: PROMO_ID,
    organizerId: ORGANIZER_ID,
    code: 'ABC',
    name: 'Test Promo',
    description: '',
    imageUrl: null,
    discountType: 'amount',
    discountValue: 5000,
    maxDiscount: null,
    minOrder: 0,
    minTicketQuantity: 1,
    maxTicketQuantity: null,
    eventId: EVENT_ID,
    validFrom: NOW - 10000,
    validUntil: NOW + 10000,
    usageLimit: 100,
    usedCount: 0,
    ticketUsageLimit: null,
    usedTicketCount: 0,
    perUserLimit: null,
    isPublic: false,
    isEnabled: true,
    createdAt: NOW - 5000,
    ...overrides,
  };
}

let repo;
let service;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  repo = mockRepo();
  service = createPromotionService(repo);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getAllPromotions', () => {
  it('delegates to repository', async () => {
    const rows = [{ id: 'p1' }];
    repo.getActivePromotions.mockResolvedValue(rows);
    await expect(service.getAllPromotions()).resolves.toBe(rows);
  });
});

describe('getPromotionsByOrganizer', () => {
  it('delegates to repository with organizer id', async () => {
    const rows = [{ id: 'p1' }];
    repo.getPromotionsByOrganizer.mockResolvedValue(rows);
    await expect(service.getPromotionsByOrganizer(ORGANIZER_ID)).resolves.toBe(rows);
    expect(repo.getPromotionsByOrganizer).toHaveBeenCalledWith(ORGANIZER_ID);
  });
});

describe('createPromotion', () => {
  describe('code validation', () => {
    it('rejects empty code', async () => {
      await expect(service.createPromotion(ORGANIZER_ID, { code: '' }))
        .rejects.toThrow('Promotion code is required.');
    });

    it('rejects code with invalid characters', async () => {
      await expect(service.createPromotion(ORGANIZER_ID, { code: 'hello world' }))
        .rejects.toThrow(
          'Promotion code must contain only uppercase letters and numbers.'
        );
    });

    it('rejects code exceeding max length', async () => {
      await expect(
        service.createPromotion(ORGANIZER_ID, { code: 'A'.repeat(51) })
      ).rejects.toThrow(
        'Promotion code must contain only uppercase letters and numbers.'
      );
    });
  });

  describe('discount type validation', () => {
    it('rejects invalid discount type', async () => {
      await expect(
        service.createPromotion(ORGANIZER_ID, {
          code: 'ABC',
          discountType: 'invalid',
          discountValue: 1000,
        })
      ).rejects.toThrow('discountType must be percent or amount.');
    });

    it('defaults to amount when discountType omitted', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.createPromotion.mockResolvedValue(undefined);
      const result = await service.createPromotion(ORGANIZER_ID, {
        code: 'ABC',
        discountValue: 1000,
      });
      expect(result.discountType).toBe('amount');
    });
  });

  describe('discount value validation', () => {
    it('rejects missing discountValue', async () => {
      await expect(
        service.createPromotion(ORGANIZER_ID, { code: 'ABC', discountValue: '' })
      ).rejects.toThrow('discountValue is required.');
    });

    it('rejects zero percent value', async () => {
      await expect(
        service.createPromotion(ORGANIZER_ID, {
          code: 'ABC',
          discountType: 'percent',
          discountValue: 0,
        })
      ).rejects.toThrow('Percentage discountValue must be greater than zero.');
    });

    it('rejects percent over 100', async () => {
      await expect(
        service.createPromotion(ORGANIZER_ID, {
          code: 'ABC',
          discountType: 'percent',
          discountValue: 200,
        })
      ).rejects.toThrow('Percentage discountValue cannot exceed 100%.');
    });

    it('accepts percent as decimal (0.10 = 10%)', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.createPromotion.mockResolvedValue(undefined);
      const result = await service.createPromotion(ORGANIZER_ID, {
        code: 'ABC',
        discountType: 'percent',
        discountValue: 0.1,
      });
      expect(result.discountValue).toBe(0.1);
    });

    it('accepts percent as integer (10 = 10%)', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.createPromotion.mockResolvedValue(undefined);
      const result = await service.createPromotion(ORGANIZER_ID, {
        code: 'ABC',
        discountType: 'percent',
        discountValue: 10,
      });
      expect(result.discountValue).toBe(0.1);
    });

    it('rejects negative amount value', async () => {
      await expect(
        service.createPromotion(ORGANIZER_ID, {
          code: 'ABC',
          discountType: 'amount',
          discountValue: -100,
        })
      ).rejects.toThrow('discountValue must be a positive integer.');
    });

    it('rejects non-integer amount value', async () => {
      await expect(
        service.createPromotion(ORGANIZER_ID, {
          code: 'ABC',
          discountType: 'amount',
          discountValue: 10.5,
        })
      ).rejects.toThrow('discountValue must be a positive integer.');
    });
  });

  describe('date validation', () => {
    it('rejects validUntil before validFrom', async () => {
      await expect(
        service.createPromotion(ORGANIZER_ID, {
          code: 'ABC',
          discountValue: 1000,
          validFrom: NOW + 10000,
          validUntil: NOW,
        })
      ).rejects.toThrow('validUntil must be after validFrom.');
    });

    it('accepts valid date range', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.createPromotion.mockResolvedValue(undefined);
      const result = await service.createPromotion(ORGANIZER_ID, {
        code: 'ABC',
        discountValue: 1000,
        validFrom: NOW,
        validUntil: NOW + 86400000,
      });
      expect(result.validFrom).toBe(NOW);
      expect(result.validUntil).toBe(NOW + 86400000);
    });
  });

  describe('ticket quantity validation', () => {
    it('rejects maxTicketQuantity < minTicketQuantity', async () => {
      await expect(
        service.createPromotion(ORGANIZER_ID, {
          code: 'ABC',
          discountValue: 1000,
          minTicketQuantity: 5,
          maxTicketQuantity: 2,
        })
      ).rejects.toThrow('maxTicketQuantity must be at least minTicketQuantity.');
    });

    it('accepts valid ticket quantity range', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.createPromotion.mockResolvedValue(undefined);
      const result = await service.createPromotion(ORGANIZER_ID, {
        code: 'ABC',
        discountValue: 1000,
        minTicketQuantity: 2,
        maxTicketQuantity: 10,
      });
      expect(result.minTicketQuantity).toBe(2);
      expect(result.maxTicketQuantity).toBe(10);
    });
  });

  describe('duplicate code', () => {
    it('rejects code already in use', async () => {
      repo.findByCode.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createPromotion(ORGANIZER_ID, { code: 'ABC', discountValue: 1000 })
      ).rejects.toThrow("Promotion code 'ABC' already exists.");
      expect(repo.findByCode).toHaveBeenCalledWith('ABC');
    });
  });

  describe('event ownership', () => {
    it('accepts event owned by organizer', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.getEventById.mockResolvedValue({
        id: EVENT_ID,
        organizerId: ORGANIZER_ID,
      });
      repo.createPromotion.mockResolvedValue(undefined);
      const result = await service.createPromotion(ORGANIZER_ID, {
        code: 'ABC',
        discountValue: 1000,
        eventId: EVENT_ID,
      });
      expect(result.eventId).toBe(EVENT_ID);
    });

    it('rejects missing event', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.getEventById.mockResolvedValue(null);
      await expect(
        service.createPromotion(ORGANIZER_ID, {
          code: 'ABC',
          discountValue: 1000,
          eventId: 'nonexistent',
        })
      ).rejects.toThrow('Event not found.');
    });

    it('rejects event owned by another organizer', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.getEventById.mockResolvedValue({
        id: FOREIGN_EVENT_ID,
        organizerId: OTHER_ORG_ID,
      });
      await expect(
        service.createPromotion(ORGANIZER_ID, {
          code: 'ABC',
          discountValue: 1000,
          eventId: FOREIGN_EVENT_ID,
        })
      ).rejects.toThrow('You do not own this event.');
    });

    it('skips ownership check when eventId is empty', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.createPromotion.mockResolvedValue(undefined);
      const result = await service.createPromotion(ORGANIZER_ID, {
        code: 'ABC',
        discountValue: 1000,
        eventId: '',
      });
      expect(result.eventId).toBeNull();
      expect(repo.getEventById).not.toHaveBeenCalled();
    });
  });

  describe('normalized persisted defaults', () => {
    it('persists with all computed defaults', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.createPromotion.mockResolvedValue(undefined);
      const result = await service.createPromotion(ORGANIZER_ID, {
        code: 'ABC',
        discountValue: 1000,
      });
      expect(result).toMatchObject({
        id: PROMO_ID,
        organizerId: ORGANIZER_ID,
        code: 'ABC',
        name: 'Discount Code',
        description: '',
        imageUrl: null,
        discountType: 'amount',
        discountValue: 1000,
        maxDiscount: null,
        minOrder: 0,
        minTicketQuantity: 1,
        maxTicketQuantity: null,
        eventId: null,
        usageLimit: 100,
        usedCount: 0,
        ticketUsageLimit: null,
        usedTicketCount: 0,
        perUserLimit: 1,
        isPublic: false,
        isEnabled: true,
        validFrom: NOW,
        validUntil: NOW + 30 * 24 * 60 * 60 * 1000,
        createdAt: NOW,
      });
      expect(repo.createPromotion).toHaveBeenCalledWith(result.id, result);
    });

    it('uses promoImage as fallback for imageUrl', async () => {
      repo.findByCode.mockResolvedValue(null);
      repo.createPromotion.mockResolvedValue(undefined);
      const result = await service.createPromotion(ORGANIZER_ID, {
        code: 'ABC',
        discountValue: 1000,
        promoImage: 'https://example.com/img.png',
      });
      expect(result.imageUrl).toBe('https://example.com/img.png');
    });
  });
});

describe('updatePromotion', () => {
  it('throws NotFoundError when promotion does not exist', async () => {
    repo.getPromotionById.mockResolvedValue(null);
    await expect(
      service.updatePromotion(PROMO_ID, ORGANIZER_ID, { code: 'NEW' })
    ).rejects.toThrow('Promotion not found.');
  });

  it('throws ForbiddenError when organizer does not own promotion', async () => {
    repo.getPromotionById.mockResolvedValue(
      basePromotion({ organizerId: OTHER_ORG_ID })
    );
    await expect(
      service.updatePromotion(PROMO_ID, ORGANIZER_ID, { code: 'NEW' })
    ).rejects.toThrow('Forbidden');
  });

  describe('code', () => {
    it('rejects code already used by another promotion', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ code: 'OLD' })
      );
      repo.findByCode.mockResolvedValue({ id: 'other', code: 'NEW' });
      await expect(
        service.updatePromotion(PROMO_ID, ORGANIZER_ID, { code: 'NEW' })
      ).rejects.toThrow("Promotion code 'NEW' already exists.");
    });

    it('allows keeping unchanged code', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ code: 'SAME' })
      );
      repo.findByCode.mockResolvedValue(null);
      repo.updatePromotion.mockResolvedValue(undefined);
      const result = await service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
        code: 'SAME',
      });
      expect(result.code).toBe('SAME');
    });

    it('allows updating to a free code', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ code: 'OLD' })
      );
      repo.findByCode.mockResolvedValue(null);
      repo.updatePromotion.mockResolvedValue(undefined);
      const result = await service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
        code: 'NEW',
      });
      expect(result.code).toBe('NEW');
    });
  });

  describe('event scope', () => {
    it('validates event ownership on update', async () => {
      repo.getPromotionById.mockResolvedValue(basePromotion());
      repo.getEventById.mockResolvedValue({
        id: EVENT_ID,
        organizerId: ORGANIZER_ID,
      });
      repo.updatePromotion.mockResolvedValue(undefined);
      await service.updatePromotion(PROMO_ID, ORGANIZER_ID, { eventId: EVENT_ID });
      expect(repo.getEventById).toHaveBeenCalledWith(EVENT_ID);
    });

    it('clears eventId when set to null', async () => {
      repo.getPromotionById.mockResolvedValue(basePromotion());
      repo.updatePromotion.mockResolvedValue(undefined);
      const result = await service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
        eventId: null,
      });
      expect(result.eventId).toBeNull();
    });
  });

  describe('discount fields', () => {
    it('updates discount type and value for percent', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ discountType: 'amount', discountValue: 1000 })
      );
      repo.updatePromotion.mockResolvedValue(undefined);
      await service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
        discountType: 'percent',
        discountValue: 20,
      });
      expect(repo.updatePromotion).toHaveBeenCalledWith(
        PROMO_ID,
        expect.objectContaining({
          discountType: 'percent',
          discountValue: 0.2,
        })
      );
    });

    it('updates discount value for amount type', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ discountType: 'amount', discountValue: 1000 })
      );
      repo.updatePromotion.mockResolvedValue(undefined);
      await service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
        discountValue: 2000,
      });
      expect(repo.updatePromotion).toHaveBeenCalledWith(
        PROMO_ID,
        expect.objectContaining({ discountValue: 2000 })
      );
    });

    it('re-validates current discountValue when only type changes', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ discountType: 'percent', discountValue: 0.1 })
      );
      repo.updatePromotion.mockResolvedValue(undefined);
      await expect(
        service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
          discountType: 'amount',
        })
      ).rejects.toThrow('discountValue must be a positive integer.');
    });

    it('allows setting maxDiscount to null', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ maxDiscount: 5000 })
      );
      repo.updatePromotion.mockResolvedValue(undefined);
      await service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
        maxDiscount: null,
      });
      expect(repo.updatePromotion).toHaveBeenCalledWith(
        PROMO_ID,
        expect.objectContaining({ maxDiscount: null })
      );
    });

    it('allows setting minOrder to null', async () => {
      repo.getPromotionById.mockResolvedValue(basePromotion({ minOrder: 5000 }));
      repo.updatePromotion.mockResolvedValue(undefined);
      await service.updatePromotion(PROMO_ID, ORGANIZER_ID, { minOrder: null });
      expect(repo.updatePromotion).toHaveBeenCalledWith(
        PROMO_ID,
        expect.objectContaining({ minOrder: null })
      );
    });
  });

  describe('date bounds', () => {
    it('validates date order when both dates are updated', async () => {
      repo.getPromotionById.mockResolvedValue(basePromotion());
      await expect(
        service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
          validFrom: NOW + 10000,
          validUntil: NOW,
        })
      ).rejects.toThrow('validUntil must be after validFrom.');
    });

    it('validates date order when only validFrom is updated', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ validFrom: NOW, validUntil: NOW })
      );
      await expect(
        service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
          validFrom: NOW + 10000,
        })
      ).rejects.toThrow('validUntil must be after validFrom.');
    });

    it('validates date order when only validUntil is updated', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ validFrom: NOW + 10000, validUntil: NOW + 20000 })
      );
      await expect(
        service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
          validUntil: NOW,
        })
      ).rejects.toThrow('validUntil must be after validFrom.');
    });

    it('rejects invalid date string for validFrom', async () => {
      repo.getPromotionById.mockResolvedValue(basePromotion());
      await expect(
        service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
          validFrom: 'not-a-date',
        })
      ).rejects.toThrow('validFrom must be a valid date or timestamp.');
    });
  });

  describe('ticket bounds', () => {
    it('validates maxTicketQuantity >= minTicketQuantity after update', async () => {
      repo.getPromotionById.mockResolvedValue(
        basePromotion({ minTicketQuantity: 5 })
      );
      await expect(
        service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
          maxTicketQuantity: 3,
        })
      ).rejects.toThrow('maxTicketQuantity must be at least minTicketQuantity.');
    });

    it('validates when both min and max are updated', async () => {
      repo.getPromotionById.mockResolvedValue(basePromotion());
      await expect(
        service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
          minTicketQuantity: 10,
          maxTicketQuantity: 5,
        })
      ).rejects.toThrow('maxTicketQuantity must be at least minTicketQuantity.');
    });
  });

  describe('returned merge', () => {
    it('merges updated fields with current promotion data', async () => {
      const current = basePromotion({
        code: 'OLD',
        name: 'Old Name',
        discountType: 'amount',
        discountValue: 1000,
        minTicketQuantity: 1,
        maxTicketQuantity: null,
        isEnabled: true,
      });
      repo.getPromotionById.mockResolvedValue(current);
      repo.updatePromotion.mockResolvedValue(undefined);
      const result = await service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
        name: 'New Name',
        discountValue: 2000,
      });
      expect(result).toMatchObject({
        id: PROMO_ID,
        code: 'OLD',
        name: 'New Name',
        discountValue: 2000,
        discountType: 'amount',
        isEnabled: true,
      });
    });

    it('preserves isEnabled=true when isEnabled not in update', async () => {
      const current = basePromotion({ isEnabled: true });
      repo.getPromotionById.mockResolvedValue(current);
      repo.updatePromotion.mockResolvedValue(undefined);
      const result = await service.updatePromotion(PROMO_ID, ORGANIZER_ID, {
        name: 'New Name',
      });
      expect(result.isEnabled).toBe(true);
    });
  });
});

describe('deletePromotion', () => {
  it('throws NotFoundError when promotion does not exist', async () => {
    repo.getPromotionById.mockResolvedValue(null);
    await expect(
      service.deletePromotion(PROMO_ID, ORGANIZER_ID)
    ).rejects.toThrow('Promotion not found.');
  });

  it('throws ForbiddenError when organizer does not own promotion', async () => {
    repo.getPromotionById.mockResolvedValue(
      basePromotion({ organizerId: OTHER_ORG_ID })
    );
    await expect(
      service.deletePromotion(PROMO_ID, ORGANIZER_ID)
    ).rejects.toThrow('Forbidden');
  });

  it('deletes and returns success', async () => {
    repo.getPromotionById.mockResolvedValue(basePromotion());
    repo.deletePromotion.mockResolvedValue(undefined);
    const result = await service.deletePromotion(PROMO_ID, ORGANIZER_ID);
    expect(result).toEqual({ success: true });
    expect(repo.deletePromotion).toHaveBeenCalledWith(PROMO_ID);
  });
});

describe('quoteDiscount', () => {
  it('requires a user', async () => {
    await expect(
      service.quoteDiscountInTransaction(mockTx, { code: 'ABC' })
    ).rejects.toThrow('Unauthorized');
  });

  describe('event organizer scope', () => {
    it('resolves organizer from event scope', async () => {
      repo.getEventScopeInTransaction.mockResolvedValue({
        eventId: EVENT_ID,
        organizerId: ORGANIZER_ID,
      });
      repo.findPromoByCodeInTransaction.mockResolvedValue(
        basePromotion({ eventId: EVENT_ID })
      );
      repo.getUserActiveUsageCountInTransaction.mockResolvedValue(0);
      const result = await service.quoteDiscountInTransaction(mockTx, {
        userId: USER_ID,
        code: 'ABC',
        eventId: EVENT_ID,
      });
      expect(result.valid).toBe(true);
      expect(result.code).toBe('ABC');
      expect(repo.getEventScopeInTransaction).toHaveBeenCalledWith(
        mockTx,
        EVENT_ID
      );
    });

    it('throws organizer scope mismatch', async () => {
      repo.getEventScopeInTransaction.mockResolvedValue({
        eventId: EVENT_ID,
        organizerId: OTHER_ORG_ID,
      });
      await expect(
        service.quoteDiscountInTransaction(mockTx, {
          userId: USER_ID,
          code: 'ABC',
          eventId: EVENT_ID,
          organizerId: ORGANIZER_ID,
        })
      ).rejects.toThrow('Promotion is not valid for this organizer.');
    });

    it('throws when event is not found', async () => {
      repo.getEventScopeInTransaction.mockResolvedValue(null);
      await expect(
        service.quoteDiscountInTransaction(mockTx, {
          userId: USER_ID,
          code: 'ABC',
          eventId: EVENT_ID,
        })
      ).rejects.toThrow('Event not found.');
    });
  });

  it('throws PROMOTION_NOT_FOUND when promotion does not exist', async () => {
    repo.getEventScopeInTransaction.mockResolvedValue({
      eventId: EVENT_ID,
      organizerId: ORGANIZER_ID,
    });
    repo.findPromoByCodeInTransaction.mockResolvedValue(null);
    await expect(
      service.quoteDiscountInTransaction(mockTx, {
        userId: USER_ID,
        code: 'NONEXIST',
        eventId: EVENT_ID,
      })
    ).rejects.toThrow('Promotion not found.');
  });

  it('passes user usage count to eligibility', async () => {
    repo.getEventScopeInTransaction.mockResolvedValue({
      eventId: EVENT_ID,
      organizerId: ORGANIZER_ID,
    });
    repo.findPromoByCodeInTransaction.mockResolvedValue(
      basePromotion({ perUserLimit: 1 })
    );
    repo.getUserActiveUsageCountInTransaction.mockResolvedValue(1);
    await expect(
      service.quoteDiscountInTransaction(mockTx, {
        userId: USER_ID,
        code: 'ABC',
        eventId: EVENT_ID,
      })
    ).rejects.toThrow('Promotion per-user limit reached.');
    expect(
      repo.getUserActiveUsageCountInTransaction
    ).toHaveBeenCalledWith(mockTx, PROMO_ID, USER_ID);
  });

  it('returns calculation mapping when eligible', async () => {
    repo.getEventScopeInTransaction.mockResolvedValue({
      eventId: EVENT_ID,
      organizerId: ORGANIZER_ID,
    });
    repo.findPromoByCodeInTransaction.mockResolvedValue(
      basePromotion({
        discountType: 'amount',
        discountValue: 5000,
      })
    );
    repo.getUserActiveUsageCountInTransaction.mockResolvedValue(0);
    const result = await service.quoteDiscountInTransaction(mockTx, {
      userId: USER_ID,
      code: 'ABC',
      eventId: EVENT_ID,
      subtotalVnd: 50000,
    });
    expect(result.valid).toBe(true);
    expect(result.message).toBe('Promotion ABC applied.');
    expect(result.subtotalAmount).toBe(50000);
    expect(result.discountAmount).toBe(5000);
    expect(result.totalAmount).toBe(45000);
    expect(result.currency).toBe('VND');
    expect(result.discountType).toBe('amount');
    expect(result.code).toBe('ABC');
  });

  it('returns null calculation when subtotalVnd not provided', async () => {
    repo.getEventScopeInTransaction.mockResolvedValue({
      eventId: EVENT_ID,
      organizerId: ORGANIZER_ID,
    });
    repo.findPromoByCodeInTransaction.mockResolvedValue(
      basePromotion({
        discountType: 'amount',
        discountValue: 5000,
      })
    );
    repo.getUserActiveUsageCountInTransaction.mockResolvedValue(0);
    const result = await service.quoteDiscountInTransaction(mockTx, {
      userId: USER_ID,
      code: 'ABC',
      eventId: EVENT_ID,
    });
    expect(result.valid).toBe(true);
    expect(result.subtotalAmount).toBeUndefined();
    expect(result.discountAmount).toBeUndefined();
  });
});

describe('tryQuoteDiscount', () => {
  it('converts AppError under 500 to valid:false response', async () => {
    repo.withTransaction.mockImplementation(async () => {
      const { BadRequestError } = require('@/shared/errors');
      throw new BadRequestError('Invalid code.');
    });
    const result = await service.tryQuoteDiscount({
      userId: USER_ID,
      code: 'ABC',
    });
    expect(result).toMatchObject({
      valid: false,
      code: 'BAD_REQUEST',
      message: 'Invalid code.',
    });
  });

  it('rethrows AppError with status 500+', async () => {
    const { AppError: AE } = require('@/shared/errors');
    repo.withTransaction.mockImplementation(async () => {
      throw new AE('Internal error', 500, 'INTERNAL_ERROR');
    });
    await expect(
      service.tryQuoteDiscount({ userId: USER_ID, code: 'ABC' })
    ).rejects.toThrow('Internal error');
  });

  it('rethrows non-AppError unexpected errors', async () => {
    repo.withTransaction.mockImplementation(async () => {
      throw new Error('Unexpected crash');
    });
    await expect(
      service.tryQuoteDiscount({ userId: USER_ID, code: 'ABC' })
    ).rejects.toThrow('Unexpected crash');
  });
});

describe('validatePromotionCode', () => {
  it('delegates to tryQuoteDiscount with mapped context', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(
      basePromotion({ code: 'ABC' })
    );
    repo.getEventScopeInTransaction.mockResolvedValue({
      eventId: EVENT_ID,
      organizerId: ORGANIZER_ID,
    });
    repo.getUserActiveUsageCountInTransaction.mockResolvedValue(0);
    const result = await service.validatePromotionCode('ABC', EVENT_ID, 2, {
      subtotalVnd: 50000,
      userId: USER_ID,
    });
    expect(result.valid).toBe(true);
    expect(result.code).toBe('ABC');
  });

  it('maps code, eventId, ticketQuantity, subtotalVnd, organizerId, userId', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(
      basePromotion({ code: 'TEST' })
    );
    repo.getEventScopeInTransaction.mockResolvedValue({
      eventId: EVENT_ID,
      organizerId: ORGANIZER_ID,
    });
    repo.getUserActiveUsageCountInTransaction.mockResolvedValue(0);
    const result = await service.validatePromotionCode('TEST', EVENT_ID, 3, {
      subtotalVnd: 100000,
      organizerId: ORGANIZER_ID,
      userId: USER_ID,
    });
    expect(result.valid).toBe(true);
    expect(result.code).toBe('TEST');
    expect(repo.findPromoByCodeInTransaction).toHaveBeenCalledWith(
      mockTx,
      'TEST',
      false,
      { organizerId: ORGANIZER_ID, eventId: EVENT_ID }
    );
  });

  it('returns valid:false for non-500 errors via tryQuoteDiscount', async () => {
    repo.withTransaction.mockImplementation(async () => {
      const { BadRequestError } = require('@/shared/errors');
      throw new BadRequestError('Invalid.');
    });
    const result = await service.validatePromotionCode('BAD', EVENT_ID, 1, {
      userId: USER_ID,
    });
    expect(result).toMatchObject({ valid: false, code: 'BAD_REQUEST' });
  });
});
