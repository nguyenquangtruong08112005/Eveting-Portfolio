describe('middleware/csrf — compatibility export', () => {
  it('re-exports the shared csrf middleware module unchanged', () => {
    const compat = require('@/middleware/csrf');
    const shared = require('@/shared/middleware/csrf.middleware');

    expect(compat).toBe(shared);
  });

  it('exposes csrfProtection and getCookieOptions', () => {
    const compat = require('@/middleware/csrf');

    expect(typeof compat.csrfProtection).toBe('function');
    expect(typeof compat.getCookieOptions).toBe('function');
  });
});
