const { validationResult } = require('express-validator');
const { BadRequestError } = require('@/shared/errors');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw new BadRequestError(messages.join('; '));
  }
  next();
};

module.exports = { validateRequest };
