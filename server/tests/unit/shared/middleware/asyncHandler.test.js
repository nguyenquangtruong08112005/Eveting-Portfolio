jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const asyncHandler = require('@/shared/middleware/asyncHandler');

describe('asyncHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it('sets __optedInToGlobalErrorHandling flag', () => {
    const fn = jest.fn();
    asyncHandler(fn)(req, res, next);
    expect(req.__optedInToGlobalErrorHandling).toBe(true);
  });

  it('calls wrapped fn with req, res, next', () => {
    const fn = jest.fn();
    asyncHandler(fn)(req, res, next);
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('calls next when fn does not throw', () => {
    asyncHandler(jest.fn())(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards async rejection to next', async () => {
    const error = new Error('async fail');
    asyncHandler(async () => { throw error; })(req, res, next);
    await new Promise(resolve => setImmediate(resolve));
    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards promise rejection to next', async () => {
    const error = new Error('promise fail');
    asyncHandler(() => Promise.reject(error))(req, res, next);
    await new Promise(resolve => setImmediate(resolve));
    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next on successful async fn', async () => {
    asyncHandler(async () => 'ok')(req, res, next);
    await new Promise(resolve => setImmediate(resolve));
    expect(next).not.toHaveBeenCalled();
  });
});
