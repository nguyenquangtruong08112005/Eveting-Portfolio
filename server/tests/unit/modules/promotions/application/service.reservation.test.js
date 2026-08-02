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
    ConflictError: class extends AppError {
      constructor(m = 'Conflict') { super(m, 409, 'CONFLICT'); }
    },
  };
});

const { createPromotionService } = require('@/modules/promotions/application/service');

const ORGANIZER_ID = 'org_1';
const EVENT_ID = 'evt_1';
const USER_ID = 'usr_1';
const PROMO_ID = 'promo_fixed-uuid';
const ORDER_ID = 'ord_1';
const NOW = 1700000000000;

const mockTx = { query: jest.fn() };

function mockRepo() {
  return {
    getEventScopeInTransaction: jest.fn(),
    findPromoByCodeInTransaction: jest.fn(),
    findUsageByOrderInTransaction: jest.fn(),
    getUserActiveUsageCountInTransaction: jest.fn(),
    createUsageInTransaction: jest.fn(),
    markUsageRedeemedInTransaction: jest.fn(),
    releaseUsageInTransaction: jest.fn(),
    withTransaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
  };
}

function basePromotion(overrides = {}) {
  return {
    id: PROMO_ID,
    organizerId: ORGANIZER_ID,
    code: 'ABC',
    name: 'Test Promo',
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

function baseUsage(overrides = {}) {
  return {
    id: 'vuse_fixed-uuid',
    promotion_id: PROMO_ID,
    user_id: USER_ID,
    order_id: ORDER_ID,
    event_id: EVENT_ID,
    organizer_id: ORGANIZER_ID,
    ticket_quantity: 1,
    subtotal_amount: 50000,
    discount_amount: 5000,
    total_amount: 45000,
    status: 'reserved',
    created_at: new Date(NOW),
    updated_at: new Date(NOW),
    ...overrides,
  };
}

const BASE_RAW_CONTEXT = {
  userId: USER_ID,
  orderId: ORDER_ID,
  subtotalVnd: 50000,
  code: 'ABC',
  eventId: EVENT_ID,
  ticketQuantity: 1,
};

let repo;
let service;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  repo = mockRepo();
  service = createPromotionService(repo);
  repo.getEventScopeInTransaction.mockResolvedValue({
    eventId: EVENT_ID,
    organizerId: ORGANIZER_ID,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

function setupSuccessMocks() {
  repo.findPromoByCodeInTransaction.mockResolvedValue(basePromotion());
  repo.findUsageByOrderInTransaction.mockResolvedValue(null);
  repo.getUserActiveUsageCountInTransaction.mockResolvedValue(0);
  repo.createUsageInTransaction.mockResolvedValue(baseUsage());
}

describe('reserveDiscountInTransaction', () => {
  it('rejects null transaction', async () => {
    await expect(
      service.reserveDiscountInTransaction(null, BASE_RAW_CONTEXT)
    ).rejects.toThrow('A checkout transaction is required.');
  });

  it('rejects transaction without query method', async () => {
    await expect(
      service.reserveDiscountInTransaction({}, BASE_RAW_CONTEXT)
    ).rejects.toThrow('A checkout transaction is required.');
  });

  it('requires userId', async () => {
    await expect(
      service.reserveDiscountInTransaction(mockTx, {
        orderId: ORDER_ID,
        subtotalVnd: 50000,
        code: 'ABC',
      })
    ).rejects.toThrow('Unauthorized');
  });

  it('requires orderId', async () => {
    await expect(
      service.reserveDiscountInTransaction(mockTx, {
        userId: USER_ID,
        subtotalVnd: 50000,
        code: 'ABC',
      })
    ).rejects.toThrow('orderId is required.');
  });

  it('requires subtotalVnd', async () => {
    await expect(
      service.reserveDiscountInTransaction(mockTx, {
        userId: USER_ID,
        orderId: ORDER_ID,
        code: 'ABC',
      })
    ).rejects.toThrow('subtotalVnd is required.');
  });

  it('throws PROMOTION_NOT_FOUND when promo does not exist', async () => {
    repo.getEventScopeInTransaction.mockResolvedValue({
      eventId: EVENT_ID,
      organizerId: ORGANIZER_ID,
    });
    repo.findPromoByCodeInTransaction.mockResolvedValue(null);
    await expect(
      service.reserveDiscountInTransaction(mockTx, BASE_RAW_CONTEXT)
    ).rejects.toMatchObject({
      message: 'Promotion not found.',
      statusCode: 404,
      code: 'PROMOTION_NOT_FOUND',
    });
  });

  it('throws PROMOTION_NOT_STACKABLE when existing usage has different promotion', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(basePromotion());
    repo.findUsageByOrderInTransaction.mockResolvedValue(
      baseUsage({ promotion_id: 'other_promo' })
    );
    await expect(
      service.reserveDiscountInTransaction(mockTx, BASE_RAW_CONTEXT)
    ).rejects.toMatchObject({
      message: 'Only one promotion or voucher code can be applied per order.',
      statusCode: 409,
      code: 'PROMOTION_NOT_STACKABLE',
    });
  });

  it('throws PROMOTION_NOT_STACKABLE when existing usage has different user', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(basePromotion());
    repo.findUsageByOrderInTransaction.mockResolvedValue(
      baseUsage({ user_id: 'other_user' })
    );
    await expect(
      service.reserveDiscountInTransaction(mockTx, BASE_RAW_CONTEXT)
    ).rejects.toMatchObject({
      message: 'Only one promotion or voucher code can be applied per order.',
      statusCode: 409,
      code: 'PROMOTION_NOT_STACKABLE',
    });
  });

  it('returns idempotent result for matching non-released usage', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(basePromotion());
    repo.findUsageByOrderInTransaction.mockResolvedValue(baseUsage());
    const result = await service.reserveDiscountInTransaction(
      mockTx,
      BASE_RAW_CONTEXT
    );
    expect(result).toMatchObject({
      valid: true,
      idempotent: true,
      usageId: 'vuse_fixed-uuid',
      status: 'reserved',
      code: 'ABC',
      currency: 'VND',
      subtotalAmount: 50000,
      discountAmount: 5000,
      totalAmount: 45000,
      discountType: 'amount',
      discountValue: 5000,
    });
  });

  it('throws PROMOTION_RESERVATION_MISMATCH on subtotal mismatch', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(basePromotion());
    repo.findUsageByOrderInTransaction.mockResolvedValue(
      baseUsage({ subtotal_amount: 99999 })
    );
    await expect(
      service.reserveDiscountInTransaction(mockTx, BASE_RAW_CONTEXT)
    ).rejects.toMatchObject({
      message: 'Promotion reservation retry does not match the original order.',
      statusCode: 422,
      code: 'PROMOTION_RESERVATION_MISMATCH',
    });
  });

  it('throws PROMOTION_RESERVATION_MISMATCH on ticket quantity mismatch', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(basePromotion());
    repo.findUsageByOrderInTransaction.mockResolvedValue(
      baseUsage({ ticket_quantity: 5 })
    );
    await expect(
      service.reserveDiscountInTransaction(mockTx, BASE_RAW_CONTEXT)
    ).rejects.toMatchObject({
      message: 'Promotion reservation retry does not match the original order.',
      statusCode: 422,
      code: 'PROMOTION_RESERVATION_MISMATCH',
    });
  });

  it('throws PROMOTION_RESERVATION_MISMATCH on event mismatch', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(basePromotion());
    repo.findUsageByOrderInTransaction.mockResolvedValue(
      baseUsage({ event_id: 'other_event' })
    );
    await expect(
      service.reserveDiscountInTransaction(mockTx, BASE_RAW_CONTEXT)
    ).rejects.toMatchObject({
      message: 'Promotion reservation retry does not match the original order.',
      statusCode: 422,
      code: 'PROMOTION_RESERVATION_MISMATCH',
    });
  });

  it('throws ConflictError for released usage', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(basePromotion());
    repo.findUsageByOrderInTransaction.mockResolvedValue(
      baseUsage({ status: 'released' })
    );
    await expect(
      service.reserveDiscountInTransaction(mockTx, BASE_RAW_CONTEXT)
    ).rejects.toThrow('A released promotion reservation cannot be reused.');
  });

  it('throws eligibility error on user usage limit', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(
      basePromotion({ perUserLimit: 1 })
    );
    repo.findUsageByOrderInTransaction.mockResolvedValue(null);
    repo.getUserActiveUsageCountInTransaction.mockResolvedValue(1);
    await expect(
      service.reserveDiscountInTransaction(mockTx, BASE_RAW_CONTEXT)
    ).rejects.toMatchObject({
      message: 'Promotion per-user limit reached.',
      statusCode: 409,
      code: 'PROMOTION_USER_LIMIT_REACHED',
    });
  });

  it('throws PROMOTION_USAGE_LIMIT_REACHED when createUsage returns null', async () => {
    repo.findPromoByCodeInTransaction.mockResolvedValue(basePromotion());
    repo.findUsageByOrderInTransaction.mockResolvedValue(null);
    repo.getUserActiveUsageCountInTransaction.mockResolvedValue(0);
    repo.createUsageInTransaction.mockResolvedValue(null);
    await expect(
      service.reserveDiscountInTransaction(mockTx, BASE_RAW_CONTEXT)
    ).rejects.toMatchObject({
      message: 'Promotion usage limit reached.',
      statusCode: 409,
      code: 'PROMOTION_USAGE_LIMIT_REACHED',
    });
  });

  it('persists new usage with calculated amounts and UUID', async () => {
    setupSuccessMocks();
    const result = await service.reserveDiscountInTransaction(
      mockTx,
      BASE_RAW_CONTEXT
    );
    expect(repo.createUsageInTransaction).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        id: 'vuse_fixed-uuid',
        promotionId: PROMO_ID,
        userId: USER_ID,
        orderId: ORDER_ID,
        eventId: EVENT_ID,
        organizerId: ORGANIZER_ID,
        ticketQuantity: 1,
        subtotalAmount: 50000,
        discountAmount: 5000,
        totalAmount: 45000,
      })
    );
    expect(result).toMatchObject({
      valid: true,
      idempotent: false,
      usageId: 'vuse_fixed-uuid',
      status: 'reserved',
      code: 'ABC',
      subtotalAmount: 50000,
      discountAmount: 5000,
      totalAmount: 45000,
    });
  });
});

describe('reserveDiscount', () => {
  it('runs reserveDiscountInTransaction via repository transaction', async () => {
    setupSuccessMocks();
    const result = await service.reserveDiscount(BASE_RAW_CONTEXT);
    expect(repo.withTransaction).toHaveBeenCalled();
    expect(result.valid).toBe(true);
    expect(result.usageId).toBe('vuse_fixed-uuid');
  });
});

describe('redeemReservedDiscountInTransaction', () => {
  it('rejects null transaction', async () => {
    await expect(
      service.redeemReservedDiscountInTransaction(null, ORDER_ID)
    ).rejects.toThrow('A checkout transaction is required.');
  });

  it('rejects transaction without query method', async () => {
    await expect(
      service.redeemReservedDiscountInTransaction({}, ORDER_ID)
    ).rejects.toThrow('A checkout transaction is required.');
  });

  it('requires orderId', async () => {
    await expect(
      service.redeemReservedDiscountInTransaction(mockTx, null)
    ).rejects.toThrow('orderId is required.');
  });

  it('delegates to markUsageRedeemedInTransaction', async () => {
    const usage = baseUsage();
    repo.markUsageRedeemedInTransaction.mockResolvedValue(usage);
    const result = await service.redeemReservedDiscountInTransaction(
      mockTx,
      ORDER_ID
    );
    expect(repo.markUsageRedeemedInTransaction).toHaveBeenCalledWith(
      mockTx,
      ORDER_ID
    );
    expect(result).toBe(usage);
  });
});

describe('releaseReservedDiscountInTransaction', () => {
  it('rejects null transaction', async () => {
    await expect(
      service.releaseReservedDiscountInTransaction(null, ORDER_ID)
    ).rejects.toThrow('A checkout transaction is required.');
  });

  it('rejects transaction without query method', async () => {
    await expect(
      service.releaseReservedDiscountInTransaction({}, ORDER_ID)
    ).rejects.toThrow('A checkout transaction is required.');
  });

  it('requires orderId', async () => {
    await expect(
      service.releaseReservedDiscountInTransaction(mockTx, null)
    ).rejects.toThrow('orderId is required.');
  });

  it('delegates to releaseUsageInTransaction', async () => {
    const usage = baseUsage({ status: 'released' });
    repo.releaseUsageInTransaction.mockResolvedValue(usage);
    const result = await service.releaseReservedDiscountInTransaction(
      mockTx,
      ORDER_ID
    );
    expect(repo.releaseUsageInTransaction).toHaveBeenCalledWith(mockTx, ORDER_ID);
    expect(result).toBe(usage);
  });
});
