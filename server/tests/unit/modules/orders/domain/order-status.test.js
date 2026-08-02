const { ORDER_STATUS, PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');

describe('ORDER_STATUS', () => {
  it('defines all expected statuses', () => {
    expect(ORDER_STATUS.PENDING_PAYMENT).toBe('pending_payment');
    expect(ORDER_STATUS.PAID).toBe('paid');
    expect(ORDER_STATUS.CANCELLED).toBe('cancelled');
    expect(ORDER_STATUS.EXPIRED).toBe('expired');
    expect(ORDER_STATUS.FAILED).toBe('failed');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ORDER_STATUS)).toBe(true);
  });
});

describe('PAYMENT_STATUS', () => {
  it('defines all expected statuses', () => {
    expect(PAYMENT_STATUS.PENDING).toBe('pending');
    expect(PAYMENT_STATUS.PROCESSING).toBe('processing');
    expect(PAYMENT_STATUS.SUCCEEDED).toBe('succeeded');
    expect(PAYMENT_STATUS.FAILED).toBe('failed');
    expect(PAYMENT_STATUS.CANCELLED).toBe('cancelled');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(PAYMENT_STATUS)).toBe(true);
  });
});
