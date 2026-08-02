'use strict';

const mockMediaRepo = {
  getEventMediaPage: jest.fn(),
  hasEligibleTicket: jest.fn(),
  getEventOrganizerId: jest.fn(),
  createEventMediaBatch: jest.fn(),
};

const mockStorage = {
  uploadBuffer: jest.fn(),
  getPublicUrl: jest.fn(),
};

jest.mock('@/providers/database/media.repository', () => mockMediaRepo);
jest.mock('@/providers/storage', () => mockStorage);

let mockUuidValue = 'uuid-0000';
jest.mock('uuid', () => {
  const v4 = jest.fn(() => mockUuidValue);
  return { v4 };
});

const service = require('@/modules/media/application/service');

beforeEach(() => {
  jest.clearAllMocks();
  mockUuidValue = 'uuid-0000';
  const { v4 } = require('uuid');
  v4.mockReset();
  v4.mockImplementation(() => mockUuidValue);
});

describe('getEventMedia', () => {
  it('delegates to repository with page and limit', async () => {
    const expected = { media: [], pagination: { currentPage: 1, limit: 10, totalPages: 0, totalItems: 0 } };
    mockMediaRepo.getEventMediaPage.mockResolvedValue(expected);

    const result = await service.getEventMedia('evt_1', 1, 10);

    expect(result).toEqual(expected);
    expect(mockMediaRepo.getEventMediaPage).toHaveBeenCalledWith('evt_1', 1, 10);
  });

  it('passes default page and limit when called with defaults', async () => {
    mockMediaRepo.getEventMediaPage.mockResolvedValue({ media: [] });

    await service.getEventMedia('evt_1', 1, 20);

    expect(mockMediaRepo.getEventMediaPage).toHaveBeenCalledWith('evt_1', 1, 20);
  });

  it('returns paginated media items', async () => {
    const mediaItem = { id: 'media_1', url: 'https://example.com/img.jpg', type: 'image' };
    mockMediaRepo.getEventMediaPage.mockResolvedValue({
      media: [mediaItem],
      pagination: { currentPage: 1, limit: 20, totalPages: 1, totalItems: 1 },
    });

    const result = await service.getEventMedia('evt_1', 1, 20);

    expect(result.media).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
  });
});

describe('canUploadEventMedia', () => {
  it('returns true when user has eligible ticket', async () => {
    mockMediaRepo.hasEligibleTicket.mockResolvedValue(true);

    const result = await service.canUploadEventMedia('user_1', 'evt_1');

    expect(result).toBe(true);
    expect(mockMediaRepo.hasEligibleTicket).toHaveBeenCalledWith('user_1', 'evt_1');
    expect(mockMediaRepo.getEventOrganizerId).not.toHaveBeenCalled();
  });

  it('returns true when user is the organizer', async () => {
    mockMediaRepo.hasEligibleTicket.mockResolvedValue(false);
    mockMediaRepo.getEventOrganizerId.mockResolvedValue('user_1');

    const result = await service.canUploadEventMedia('user_1', 'evt_1');

    expect(result).toBe(true);
    expect(mockMediaRepo.getEventOrganizerId).toHaveBeenCalledWith('evt_1');
  });

  it('returns false when user has no ticket and is not organizer', async () => {
    mockMediaRepo.hasEligibleTicket.mockResolvedValue(false);
    mockMediaRepo.getEventOrganizerId.mockResolvedValue('other_user');

    const result = await service.canUploadEventMedia('user_1', 'evt_1');

    expect(result).toBe(false);
  });

  it('returns false when getEventOrganizerId returns null', async () => {
    mockMediaRepo.hasEligibleTicket.mockResolvedValue(false);
    mockMediaRepo.getEventOrganizerId.mockResolvedValue(null);

    const result = await service.canUploadEventMedia('user_1', 'evt_1');

    expect(result).toBe(false);
  });

  it('short-circuits without calling getEventOrganizerId when ticket exists', async () => {
    mockMediaRepo.hasEligibleTicket.mockResolvedValue(true);

    await service.canUploadEventMedia('user_1', 'evt_1');

    expect(mockMediaRepo.getEventOrganizerId).not.toHaveBeenCalled();
  });
});

describe('addEventMedia', () => {
  it('creates media items from URLs and persists batch', async () => {
    mockMediaRepo.createEventMediaBatch.mockResolvedValue();
    const items = [
      { url: 'https://example.com/1.jpg', type: 'image', caption: 'Photo 1' },
      { url: 'https://example.com/2.mp4', type: 'video', caption: 'Video 1' },
    ];

    const result = await service.addEventMedia('user_1', 'evt_1', items);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      userId: 'user_1',
      eventId: 'evt_1',
      url: 'https://example.com/1.jpg',
      type: 'image',
      caption: 'Photo 1',
    });
    expect(result[0].id).toBe('media_uuid-0000');
    expect(result[0].createdAt).toBeGreaterThan(0);
    expect(mockMediaRepo.createEventMediaBatch).toHaveBeenCalledTimes(1);
  });

  it('assigns default type to image when type is omitted', async () => {
    mockMediaRepo.createEventMediaBatch.mockResolvedValue();
    const items = [{ url: 'https://example.com/1.jpg' }];

    const result = await service.addEventMedia('user_1', 'evt_1', items);

    expect(result[0].type).toBe('image');
    expect(result[0].caption).toBe('');
  });

  it('generates unique IDs for each item', async () => {
    mockMediaRepo.createEventMediaBatch.mockResolvedValue();
    const { v4 } = require('uuid');
    v4.mockReturnValueOnce('id-a').mockReturnValueOnce('id-b').mockReturnValueOnce('id-c');

    const items = [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }];

    const result = await service.addEventMedia('user_1', 'evt_1', items);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('media_id-a');
    expect(result[1].id).toBe('media_id-b');
    expect(result[2].id).toBe('media_id-c');
  });

  it('passes batch array with { id, media } shape to repository', async () => {
    mockMediaRepo.createEventMediaBatch.mockResolvedValue();
    const items = [{ url: 'https://example.com/1.jpg', type: 'image' }];

    await service.addEventMedia('user_1', 'evt_1', items);

    const batchArg = mockMediaRepo.createEventMediaBatch.mock.calls[0][0];
    expect(batchArg).toHaveLength(1);
    expect(batchArg[0]).toHaveProperty('id');
    expect(batchArg[0]).toHaveProperty('media');
    expect(batchArg[0].media.userId).toBe('user_1');
  });

  it('propagates repository batch creation failure', async () => {
    mockMediaRepo.createEventMediaBatch.mockRejectedValue(new Error('DB write failed'));

    await expect(
      service.addEventMedia('user_1', 'evt_1', [{ url: 'a.jpg' }])
    ).rejects.toThrow('DB write failed');
  });
});

describe('addEventMediaFiles', () => {
  beforeEach(() => {
    mockStorage.uploadBuffer.mockResolvedValue();
    mockStorage.getPublicUrl.mockResolvedValue('https://cdn.example.com/event-media/evt_1/uuid-0000.jpg');
    mockMediaRepo.createEventMediaBatch.mockResolvedValue();
  });

  it('uploads file to storage and persists media with public URL', async () => {
    const files = [{
      buffer: Buffer.from('data'),
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      caption: 'My photo',
    }];

    const result = await service.addEventMediaFiles('user_1', 'evt_1', files);

    expect(mockStorage.uploadBuffer).toHaveBeenCalledTimes(1);
    expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
      expect.stringMatching(/^event-media\/evt_1\//),
      Buffer.from('data'),
      'image/jpeg'
    );
    expect(mockStorage.getPublicUrl).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('image');
    expect(result[0].caption).toBe('My photo');
    expect(result[0].url).toContain('https://cdn.example.com/');
  });

  it('detects video type from mimetype', async () => {
    const files = [{
      buffer: Buffer.from('vid'),
      originalname: 'clip.mp4',
      mimetype: 'video/mp4',
      caption: '',
    }];

    const result = await service.addEventMediaFiles('user_1', 'evt_1', files);

    expect(result[0].type).toBe('video');
  });

  it('generates storage key with file extension', async () => {
    const files = [{
      buffer: Buffer.from('d'),
      originalname: 'image.png',
      mimetype: 'image/png',
      caption: '',
    }];

    await service.addEventMediaFiles('user_1', 'evt_1', files);

    const key = mockStorage.uploadBuffer.mock.calls[0][0];
    expect(key).toMatch(/^event-media\/evt_1\/uuid-0000\.png$/);
  });

  it('defaults caption to empty string when not provided', async () => {
    const files = [{
      buffer: Buffer.from('d'),
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
    }];

    const result = await service.addEventMediaFiles('user_1', 'evt_1', files);

    expect(result[0].caption).toBe('');
  });

  it('throws when storage provider returns null URL', async () => {
    mockStorage.getPublicUrl.mockResolvedValue(null);
    const files = [{
      buffer: Buffer.from('d'),
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
    }];

    await expect(
      service.addEventMediaFiles('user_1', 'evt_1', files)
    ).rejects.toThrow('Storage provider could not generate public URL');
  });

  it('processes multiple files sequentially', async () => {
    const files = [
      { buffer: Buffer.from('a'), originalname: 'a.jpg', mimetype: 'image/jpeg', caption: 'A' },
      { buffer: Buffer.from('b'), originalname: 'b.jpg', mimetype: 'image/jpeg', caption: 'B' },
    ];
    mockStorage.getPublicUrl
      .mockResolvedValueOnce('https://cdn.example.com/a.jpg')
      .mockResolvedValueOnce('https://cdn.example.com/b.jpg');

    const result = await service.addEventMediaFiles('user_1', 'evt_1', files);

    expect(mockStorage.uploadBuffer).toHaveBeenCalledTimes(2);
    expect(mockStorage.getPublicUrl).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(mockMediaRepo.createEventMediaBatch).toHaveBeenCalledTimes(1);
  });

  it('propagates storage upload failure', async () => {
    mockStorage.uploadBuffer.mockRejectedValue(new Error('S3 error'));

    await expect(
      service.addEventMediaFiles('user_1', 'evt_1', [
        { buffer: Buffer.from('d'), originalname: 'a.jpg', mimetype: 'image/jpeg' },
      ])
    ).rejects.toThrow('S3 error');
  });

  it('builds correct batch payload for repository', async () => {
    const files = [{
      buffer: Buffer.from('d'),
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      caption: 'Test',
    }];

    await service.addEventMediaFiles('user_1', 'evt_1', files);

    const batchArg = mockMediaRepo.createEventMediaBatch.mock.calls[0][0];
    expect(batchArg[0]).toHaveProperty('id', 'media_uuid-0000');
    expect(batchArg[0].media).toMatchObject({
      userId: 'user_1',
      eventId: 'evt_1',
      type: 'image',
      caption: 'Test',
    });
  });

  it('generates unique storage key per file', async () => {
    const { v4 } = require('uuid');
    v4.mockReturnValueOnce('key-1').mockReturnValueOnce('media-1')
      .mockReturnValueOnce('key-2').mockReturnValueOnce('media-2');

    const files = [
      { buffer: Buffer.from('a'), originalname: 'a.jpg', mimetype: 'image/jpeg' },
      { buffer: Buffer.from('b'), originalname: 'b.jpg', mimetype: 'image/jpeg' },
    ];

    await service.addEventMediaFiles('user_1', 'evt_1', files);

    const key1 = mockStorage.uploadBuffer.mock.calls[0][0];
    const key2 = mockStorage.uploadBuffer.mock.calls[1][0];
    expect(key1).toContain('key-1');
    expect(key2).toContain('key-2');
    expect(key1).not.toBe(key2);
  });

  it('generates media IDs independently from storage keys', async () => {
    const { v4 } = require('uuid');
    v4.mockReturnValueOnce('storage-key-uuid').mockReturnValueOnce('media-id-uuid');

    const files = [{
      buffer: Buffer.from('d'),
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
    }];

    const result = await service.addEventMediaFiles('user_1', 'evt_1', files);

    expect(mockStorage.uploadBuffer.mock.calls[0][0]).toContain('storage-key-uuid');
    expect(result[0].id).toBe('media_media-id-uuid');
  });
});
