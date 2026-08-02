jest.mock('@/shared/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

jest.mock('@/shared/errors', () => {
  const actual = jest.requireActual('@/shared/errors');
  return actual;
});

const logger = require('@/shared/logger');
const { NotFoundError, AppError } = require('@/shared/errors');
const { notFoundHandler, globalErrorHandler } = require('@/shared/middleware/error.middleware');

function makeRes() {
  const r = { statusCode: 200 };
  r.status = jest.fn((code) => { r.statusCode = code; return r; });
  r.json = jest.fn().mockReturnValue(r);
  return r;
}

describe('notFoundHandler', () => {
  it('passes NotFoundError to next with method and url', () => {
    const req = { method: 'GET', originalUrl: '/api/test' };
    const next = jest.fn();
    notFoundHandler(req, null, next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(next.mock.calls[0][0].message).toBe('Cannot GET /api/test');
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });

  it('uses the correct method and url for POST', () => {
    const req = { method: 'POST', originalUrl: '/api/orders' };
    const next = jest.fn();
    notFoundHandler(req, null, next);
    expect(next.mock.calls[0][0].message).toBe('Cannot POST /api/orders');
  });
});

describe('globalErrorHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = { id: 'req-1', originalUrl: '/test', method: 'GET' };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('calls next(err) when not opted in (plain Error)', () => {
    const err = new Error('random error');
    globalErrorHandler(err, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('handles AppError and returns JSON error response', () => {
    const err = new AppError('Resource not found', 404, 'NOT_FOUND');
    globalErrorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Resource not found',
        status: 404,
        code: 'NOT_FOUND',
        requestId: 'req-1'
      }
    });
    expect(logger.error).toHaveBeenCalledWith('Resource not found', expect.objectContaining({
      statusCode: 404,
      code: 'NOT_FOUND'
    }));
  });

  it('handles opted-in error via __optedInToGlobalErrorHandling flag', () => {
    req.__optedInToGlobalErrorHandling = true;
    const err = new Error('validation failed');
    err.statusCode = 400;
    err.code = 'BAD_INPUT';
    globalErrorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'validation failed',
        status: 400,
        code: 'BAD_INPUT',
        requestId: 'req-1'
      }
    });
  });

  it('uses defaults when error has no statusCode', () => {
    const err = new AppError('Kaboom');
    delete err.code;
    globalErrorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Kaboom',
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        requestId: 'req-1'
      }
    });
  });

  it('uses defaults for empty AppError with no message', () => {
    const err = new AppError();
    globalErrorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Internal Server Error',
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        requestId: 'req-1'
      }
    });
  });

  it('uses Internal Server Error message when err.message is empty', () => {
    req.__optedInToGlobalErrorHandling = true;
    const err = { statusCode: 500, code: 'INTERNAL_SERVER_ERROR' };
    globalErrorHandler(err, req, res, next);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Internal Server Error',
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        requestId: 'req-1'
      }
    });
  });
});
