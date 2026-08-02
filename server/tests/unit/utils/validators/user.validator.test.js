const { validateProfileUpdate } = require('@/utils/validators/user.validator');

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

describe('validateProfileUpdate', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
  });

  it('calls next when all optional fields are valid', async () => {
    const req = mockReq({
      name: 'John',
      aboutMe: 'Hello',
      coverPhotoUrl: 'https://example.com/cover.jpg',
      profilePicUrl: 'https://example.com/pic.jpg',
      interests: ['music', 'sports'],
      address: '123 Main St',
    });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when body is empty (all optional)', async () => {
    const req = mockReq({});
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when only name is provided', async () => {
    const req = mockReq({ name: 'Jane' });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when name is not a string', async () => {
    const req = mockReq({ name: 123 });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when aboutMe is not a string', async () => {
    const req = mockReq({ aboutMe: false });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when coverPhotoUrl is not a valid URL', async () => {
    const req = mockReq({ coverPhotoUrl: 'not-a-url' });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when profilePicUrl is not a valid URL', async () => {
    const req = mockReq({ profilePicUrl: 'invalid' });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when interests is not an array', async () => {
    const req = mockReq({ interests: 'music' });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when address is not a string', async () => {
    const req = mockReq({ address: [] });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts valid URLs with query parameters', async () => {
    const req = mockReq({ coverPhotoUrl: 'https://example.com/path?q=1&r=2' });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('includes error messages in 400 response', async () => {
    const req = mockReq({ name: true });
    await runValidators(validateProfileUpdate, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    const call = res.json.mock.calls[0][0];
    expect(call.errors.length).toBeGreaterThan(0);
    expect(call.errors[0]).toHaveProperty('msg');
  });
});
