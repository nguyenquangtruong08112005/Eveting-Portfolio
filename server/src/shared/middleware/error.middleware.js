const logger = require('@/shared/logger');
const { AppError, NotFoundError } = require('@/shared/errors');

function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
}

function globalErrorHandler(err, req, res, next) {
  const isOptedIn = err instanceof AppError || req.__optedInToGlobalErrorHandling;

  if (!isOptedIn) {
    // Preserve old behavior by forwarding to the default Express error handler
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Log the error using the logger (AsyncLocalStorage automatically associates req.id)
  logger.error(err.message || 'Internal Server Error', {
    stack: err.stack,
    statusCode,
    code: errorCode,
    url: req.originalUrl,
    method: req.method
  });

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode,
      code: errorCode,
      requestId: req.id
    }
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
