'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockService = {
  getEventMedia: jest.fn(),
  canUploadEventMedia: jest.fn(),
  addEventMedia: jest.fn(),
  addEventMediaFiles: jest.fn(),
};

jest.mock('@/modules/media/application/service', () => mockService);

const { getGallery, uploadMedia } = require('@/modules/media/api/controller');

const uid = 'user_001';
const eventId = 'event_001';

function mockReq(o = {}) {
  return { user: { uid }, params: {}, body: {}, query: {}, files: undefined, file: undefined, ...o };
}
function mockRes() {
  const json = jest.fn();
  const send = jest.fn();
  const status = jest.fn(() => ({ json, send }));
  return { status, json, send };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getGallery', () => {
  it('returns gallery with default pagination', async () => {
    mockService.getEventMedia.mockResolvedValue({ items: [], total: 0 });
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getGallery(req, res, next);
    expect(mockService.getEventMedia).toHaveBeenCalledWith(eventId, 1, 20);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [], total: 0 });
    expect(next).not.toHaveBeenCalled();
  });

  it('parses page and limit from query', async () => {
    mockService.getEventMedia.mockResolvedValue({ items: [] });
    const req = mockReq({ params: { eventId }, query: { page: '2', limit: '10' } });
    const res = mockRes();
    const next = jest.fn();
    await getGallery(req, res, next);
    expect(mockService.getEventMedia).toHaveBeenCalledWith(eventId, 2, 10);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('falls back to defaults when query params are NaN', async () => {
    mockService.getEventMedia.mockResolvedValue({ items: [] });
    const req = mockReq({ params: { eventId }, query: { page: 'abc', limit: 'xyz' } });
    const res = mockRes();
    const next = jest.fn();
    await getGallery(req, res, next);
    expect(mockService.getEventMedia).toHaveBeenCalledWith(eventId, 1, 20);
  });

  it('propagates service error via next', async () => {
    const error = new Error('DB error');
    mockService.getEventMedia.mockRejectedValue(error);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await getGallery(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('uploadMedia', () => {
  it('uploads files and returns 201', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    mockService.addEventMediaFiles.mockResolvedValue([{ id: 'm1' }]);
    const files = [{ buffer: Buffer.from('img'), originalname: 'pic.jpg', mimetype: 'image/jpeg', caption: '' }];
    const req = mockReq({ params: { eventId }, files });
    const res = mockRes();
    const next = jest.fn();

    let caught;
    try { await uploadMedia(req, res, next); } catch (e) { caught = e; }

    expect(caught).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
    expect(mockService.canUploadEventMedia).toHaveBeenCalled();
    expect(mockService.addEventMediaFiles).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalled();
  });

  it('uploads single file via req.file', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    mockService.addEventMediaFiles.mockResolvedValue([{ id: 'm1' }]);
    const file = { buffer: Buffer.from('vid'), originalname: 'clip.mp4', mimetype: 'video/mp4' };
    const req = mockReq({ params: { eventId }, files: [], file });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(mockService.addEventMediaFiles).toHaveBeenCalledWith(uid, eventId, [
      { buffer: file.buffer, originalname: 'clip.mp4', mimetype: 'video/mp4', caption: '' },
    ]);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 for unsupported file type', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    const req = mockReq({
      params: { eventId },
      files: [{ buffer: Buffer.from('x'), originalname: 'doc.pdf', mimetype: 'application/pdf' }],
    });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Unsupported file type. Only image/* and video/* are allowed.' });
    expect(mockService.addEventMediaFiles).not.toHaveBeenCalled();
  });

  it('returns 400 when no files and no mediaItems', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    const req = mockReq({ params: { eventId }, body: {} });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'No media items provided.' });
    expect(mockService.addEventMedia).not.toHaveBeenCalled();
  });

  it('returns 400 when mediaItems is not an array', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    const req = mockReq({ params: { eventId }, body: { mediaItems: 'not-array' } });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'No media items provided.' });
  });

  it('throws ForbiddenError when user cannot upload', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(false);
    const req = mockReq({ params: { eventId } });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(mockService.addEventMediaFiles).not.toHaveBeenCalled();
    expect(mockService.addEventMedia).not.toHaveBeenCalled();
  });

  it('adds mediaItems from body', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    mockService.addEventMedia.mockResolvedValue([{ id: 'm1' }]);
    const mediaItems = [{ url: 'https://img.com/1.jpg', type: 'image', caption: 'Cap 1' }];
    const req = mockReq({ params: { eventId }, body: { mediaItems } });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(mockService.addEventMedia).toHaveBeenCalledWith(uid, eventId, mediaItems);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith([{ id: 'm1' }]);
  });

  it('uses body captions array for file caption', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    mockService.addEventMediaFiles.mockResolvedValue([{ id: 'm1' }]);
    const files = [{ buffer: Buffer.from('img'), originalname: 'pic.jpg', mimetype: 'image/jpeg' }];
    const req = mockReq({ params: { eventId }, files, body: { captions: ['My caption'] } });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(mockService.addEventMediaFiles).toHaveBeenCalledWith(uid, eventId, [
      { buffer: files[0].buffer, originalname: 'pic.jpg', mimetype: 'image/jpeg', caption: 'My caption' },
    ]);
  });

  it('uses body caption string for file caption', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    mockService.addEventMediaFiles.mockResolvedValue([{ id: 'm1' }]);
    const files = [{ buffer: Buffer.from('img'), originalname: 'pic.jpg', mimetype: 'image/jpeg' }];
    const req = mockReq({ params: { eventId }, files, body: { caption: 'Single cap' } });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(mockService.addEventMediaFiles).toHaveBeenCalledWith(uid, eventId, [
      { buffer: files[0].buffer, originalname: 'pic.jpg', mimetype: 'image/jpeg', caption: 'Single cap' },
    ]);
  });

  it('parses JSON string captions', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    mockService.addEventMediaFiles.mockResolvedValue([{ id: 'm1' }]);
    const files = [{ buffer: Buffer.from('img'), originalname: 'pic.jpg', mimetype: 'image/jpeg' }];
    const req = mockReq({ params: { eventId }, files, body: { captions: '["Parsed cap"]' } });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(mockService.addEventMediaFiles).toHaveBeenCalledWith(uid, eventId, [
      { buffer: files[0].buffer, originalname: 'pic.jpg', mimetype: 'image/jpeg', caption: 'Parsed cap' },
    ]);
  });

  it('uses body mediaItems caption over captions array', async () => {
    mockService.canUploadEventMedia.mockResolvedValue(true);
    mockService.addEventMediaFiles.mockResolvedValue([{ id: 'm1' }]);
    const files = [{ buffer: Buffer.from('img'), originalname: 'pic.jpg', mimetype: 'image/jpeg' }];
    const mediaItems = [{ caption: 'From item' }];
    const req = mockReq({ params: { eventId }, files, body: { captions: ['From captions'], mediaItems } });
    const res = mockRes();
    const next = jest.fn();
    await uploadMedia(req, res, next);
    expect(mockService.addEventMediaFiles).toHaveBeenCalledWith(uid, eventId, [
      { buffer: files[0].buffer, originalname: 'pic.jpg', mimetype: 'image/jpeg', caption: 'From item' },
    ]);
  });
});