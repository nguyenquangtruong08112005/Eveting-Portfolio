const { validateReviewCreation } = require('@/utils/validators/review.validator');

function mockReq(body) {
  return { body };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function runValidators(validators, req, res) {
  return new Promise((resolve) => {
    let idx = 0;
    let done = false;
    const next = () => {
      if (done) return;
      if (idx < validators.length) {
        validators[idx++](req, res, next);
      } else {
        done = true;
        resolve(res);
      }
    };
    next();
    process.nextTick(() => {
      if (!done) { done = true; resolve(res); }
    });
  });
}

describe('validateReviewCreation', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
  });

  it('calls next when rating is valid and comment is omitted', async () => {
    const req = mockReq({ rating: 4 });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when rating is valid and comment is a string', async () => {
    const req = mockReq({ rating: 5, comment: 'Great event!' });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when rating is at min boundary (1)', async () => {
    const req = mockReq({ rating: 1 });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when rating is at max boundary (5)', async () => {
    const req = mockReq({ rating: 5 });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when comment is an empty string (optional)', async () => {
    const req = mockReq({ rating: 3, comment: '' });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when rating is missing', async () => {
    const req = mockReq({});
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: expect.any(Array) })
    );
  });

  it('returns 400 when rating is below 1', async () => {
    const req = mockReq({ rating: 0 });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when rating is above 5', async () => {
    const req = mockReq({ rating: 6 });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when rating is not a number', async () => {
    const req = mockReq({ rating: 'bad' });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when comment is not a string', async () => {
    const req = mockReq({ rating: 3, comment: 123 });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when rating is null', async () => {
    const req = mockReq({ rating: null });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('includes error messages in the response', async () => {
    const req = mockReq({ rating: 'abc' });
    await runValidators(validateReviewCreation, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    const call = res.json.mock.calls[0][0];
    expect(call.errors.length).toBeGreaterThan(0);
    expect(call.errors[0]).toHaveProperty('msg');
  });
});
