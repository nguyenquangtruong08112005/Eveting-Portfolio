const mockConfig = { appPublicUrl: 'http://example.com' };
jest.mock('@/shared/config/env.config', () => mockConfig);

describe('LocalStorageProvider', () => {
  let local;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConfig.appPublicUrl = 'http://example.com';
    local = require('@/providers/storage/local');
  });

  describe('uploadBuffer / getObjectBuffer', () => {
    it('stores buffer and retrieves it by key', async () => {
      const key = 'photos/abc.jpg';
      const buffer = Buffer.from('fake-image-data');
      await local.uploadBuffer(key, buffer, 'image/jpeg');
      const result = await local.getObjectBuffer(key);
      expect(result).toEqual(buffer);
    });

    it('overwrites existing key with new buffer', async () => {
      await local.uploadBuffer('key', Buffer.from('old'), 'text/plain');
      await local.uploadBuffer('key', Buffer.from('new'), 'text/plain');
      const result = await local.getObjectBuffer('key');
      expect(result).toEqual(Buffer.from('new'));
    });

    it('getObjectBuffer throws when key does not exist', async () => {
      await expect(local.getObjectBuffer('nonexistent')).rejects.toThrow(
        'Object with key "nonexistent" not found in local storage'
      );
    });
  });

  describe('getObjectMetadata', () => {
    it('returns contentType for stored object', async () => {
      await local.uploadBuffer('doc.pdf', Buffer.from('pdf'), 'application/pdf');
      const meta = await local.getObjectMetadata('doc.pdf');
      expect(meta).toEqual({ contentType: 'application/pdf' });
    });

    it('throws when key does not exist', async () => {
      await expect(local.getObjectMetadata('ghost')).rejects.toThrow(
        'Object with key "ghost" not found in local storage'
      );
    });
  });

  describe('deleteObject', () => {
    it('removes stored object so getObjectBuffer throws', async () => {
      await local.uploadBuffer('tmp', Buffer.from('data'), 'text/plain');
      await local.deleteObject('tmp');
      await expect(local.getObjectBuffer('tmp')).rejects.toThrow();
    });

    it('succeeds silently for non-existent key', async () => {
      await expect(local.deleteObject('never-existed')).resolves.toBeUndefined();
    });
  });

  describe('getPublicUrl', () => {
    it('returns URL using appPublicUrl from config', async () => {
      const url = await local.getPublicUrl('img.png');
      expect(url).toBe('http://example.com/public/img.png');
    });

    it('strips trailing slash from appPublicUrl', async () => {
      mockConfig.appPublicUrl = 'http://example.com/';
      local = require('@/providers/storage/local');
      const url = await local.getPublicUrl('img.png');
      expect(url).toBe('http://example.com/public/img.png');
    });

    it('falls back to localhost:3000 when appPublicUrl not set', async () => {
      delete mockConfig.appPublicUrl;
      local = require('@/providers/storage/local');
      const url = await local.getPublicUrl('test');
      expect(url).toBe('http://localhost:3000/public/test');
    });
  });

  describe('getSignedReadUrl', () => {
    it('returns null', async () => {
      const url = await local.getSignedReadUrl('any-key', 3600);
      expect(url).toBeNull();
    });
  });
});
