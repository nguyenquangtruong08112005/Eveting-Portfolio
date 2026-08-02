'use strict';

const mockStorageService = { uploadFile: jest.fn() };
jest.mock('@/modules/storage/application/service', () => mockStorageService);

const { uploadFile } = require('@/modules/storage/api/controller');

const uid = 'user_001';

function mockReq(overrides = {}) {
  return {
    user: { uid },
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('uploadFile', () => {
  it('returns 401 when no user', async () => {
    const req = mockReq({ user: null });
    const res = mockRes();
    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: No user credentials found.' });
  });

  it('returns 400 when no file', async () => {
    const req = mockReq();
    const res = mockRes();
    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No file uploaded.' });
  });

  it('returns 400 for unsupported file type', async () => {
    const file = { mimetype: 'application/pdf', size: 1000, buffer: Buffer.from('x') };
    const req = mockReq({ file });
    const res = mockRes();
    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported file type. Only image/* and video/* are allowed.' });
  });

  it('returns 400 for file exceeding 10MB', async () => {
    const file = { mimetype: 'image/jpeg', size: 11 * 1024 * 1024, buffer: Buffer.alloc(11 * 1024 * 1024) };
    const req = mockReq({ file });
    const res = mockRes();
    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'File size limit exceeded. Max 10MB allowed.' });
  });

  it('returns 201 with upload result', async () => {
    const result = { key: 'profile/u1/123.jpg', url: 'https://cdn.example.com/123.jpg' };
    mockStorageService.uploadFile.mockResolvedValue(result);
    const file = { mimetype: 'image/jpeg', size: 1024, buffer: Buffer.from('img'), originalname: 'pic.jpg' };
    const req = mockReq({ file, body: { purpose: 'profile' } });
    const res = mockRes();
    await uploadFile(req, res);
    expect(mockStorageService.uploadFile).toHaveBeenCalledWith(uid, file, 'profile');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('returns 500 on service error', async () => {
    mockStorageService.uploadFile.mockRejectedValue(new Error('Upload failed'));
    const file = { mimetype: 'image/png', size: 1024, buffer: Buffer.from('img'), originalname: 'img.png' };
    const req = mockReq({ file });
    const res = mockRes();
    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Upload failed' });
  });

  it('handles missing mimetype gracefully', async () => {
    const file = { size: 1000, buffer: Buffer.from('x') };
    const req = mockReq({ file });
    const res = mockRes();
    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported file type. Only image/* and video/* are allowed.' });
  });

  it('handles user without uid property', async () => {
    const req = mockReq({ user: {} });
    const res = mockRes();
    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
