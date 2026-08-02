const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BadGatewayError,
  ServiceUnavailableError,
} = require('@/shared/errors');

describe('AppError', () => {
  it('sets name, statusCode, code, isOperational, and captures stack', () => {
    const err = new AppError('test msg', 400, 'BAD_REQUEST');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.isOperational).toBe(true);
    expect(err.stack).toBeDefined();
  });

  it('derives code from statusCode when code omitted', () => {
    expect(new AppError('msg', 400).code).toBe('BAD_REQUEST');
    expect(new AppError('msg', 401).code).toBe('UNAUTHORIZED');
    expect(new AppError('msg', 403).code).toBe('FORBIDDEN');
    expect(new AppError('msg', 404).code).toBe('NOT_FOUND');
    expect(new AppError('msg', 409).code).toBe('CONFLICT');
    expect(new AppError('msg', 500).code).toBe('INTERNAL_SERVER_ERROR');
    expect(new AppError('msg', 999).code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('sets isOperational = false when passed', () => {
    const err = new AppError('msg', 500, 'ERR', false);
    expect(err.isOperational).toBe(false);
  });
});

describe('BadRequestError', () => {
  it('has status 400 and code BAD_REQUEST', () => {
    const err = new BadRequestError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Bad Request');
  });

  it('accepts custom message', () => {
    const err = new BadRequestError('custom');
    expect(err.message).toBe('custom');
  });
});

describe('UnauthorizedError', () => {
  it('has status 401 and code UNAUTHORIZED', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });
});

describe('ForbiddenError', () => {
  it('has status 403 and code FORBIDDEN', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });
});

describe('NotFoundError', () => {
  it('has status 404 and code NOT_FOUND', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});

describe('ConflictError', () => {
  it('has status 409 and code CONFLICT', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });
});

describe('InternalServerError', () => {
  it('has status 500 and code INTERNAL_SERVER_ERROR', () => {
    const err = new InternalServerError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('BadGatewayError', () => {
  it('has status 502 and code BAD_GATEWAY', () => {
    const err = new BadGatewayError();
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('BAD_GATEWAY');
  });
});

describe('ServiceUnavailableError', () => {
  it('has status 503 and code SERVICE_UNAVAILABLE', () => {
    const err = new ServiceUnavailableError();
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
  });
});
