class AppError extends Error {
  constructor(message, statusCode, code, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || getErrorCode(statusCode);
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

function getErrorCode(statusCode) {
  switch (statusCode) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    default: return 'INTERNAL_SERVER_ERROR';
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

class BadGatewayError extends AppError {
  constructor(message = 'Bad Gateway') {
    super(message, 502, 'BAD_GATEWAY');
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service Unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BadGatewayError,
  ServiceUnavailableError
};
