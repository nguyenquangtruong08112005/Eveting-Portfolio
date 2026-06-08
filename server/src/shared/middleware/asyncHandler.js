/**
 * Wraps an async Express route handler to automatically catch exceptions
 * and forward them to next(err). Opts in the request to the global
 * normalized JSON error handling.
 */
const asyncHandler = (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
