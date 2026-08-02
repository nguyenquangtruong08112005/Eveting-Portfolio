const mockSend = jest.fn();
const mockS3Client = jest.fn(() => ({ send: mockSend }));
const mockPutObjectCommand = jest.fn(cfg => cfg);
const mockDeleteObjectCommand = jest.fn(cfg => cfg);
const mockGetObjectCommand = jest.fn(cfg => cfg);
const mockHeadObjectCommand = jest.fn(cfg => cfg);
const mockGetSignedUrl = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: mockS3Client,
  PutObjectCommand: mockPutObjectCommand,
  DeleteObjectCommand: mockDeleteObjectCommand,
  GetObjectCommand: mockGetObjectCommand,
  HeadObjectCommand: mockHeadObjectCommand,
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

const mockS3Config = {
  region: 'us-east-1',
  endpoint: undefined,
  accessKeyId: undefined,
  secretAccessKey: undefined,
  bucket: 'test-bucket',
  publicUrlBase: undefined,
};

jest.mock('@/shared/config/env.config', () => ({ s3: mockS3Config }));

describe('S3StorageProvider', () => {
  let s3;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
    Object.assign(mockS3Config, {
      region: 'us-east-1',
      endpoint: undefined,
      accessKeyId: undefined,
      secretAccessKey: undefined,
      bucket: 'test-bucket',
      publicUrlBase: undefined,
    });
    s3 = require('@/providers/storage/s3');
  });

  describe('uploadBuffer', () => {
    it('sends PutObjectCommand with key, buffer, contentType', async () => {
      const key = 'test.jpg';
      const buffer = Buffer.from('data');
      await s3.uploadBuffer(key, buffer, 'image/jpeg');
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('throws if bucket not configured', async () => {
      mockS3Config.bucket = undefined;
      s3 = require('@/providers/storage/s3');
      await expect(
        s3.uploadBuffer('k', Buffer.from('a'), 'text/plain')
      ).rejects.toThrow('S3_BUCKET');
    });
  });

  describe('deleteObject', () => {
    it('sends DeleteObjectCommand with key', async () => {
      await s3.deleteObject('old.txt');
      expect(mockDeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'old.txt',
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('throws if bucket not configured', async () => {
      mockS3Config.bucket = undefined;
      s3 = require('@/providers/storage/s3');
      await expect(s3.deleteObject('k')).rejects.toThrow('S3_BUCKET');
    });
  });

  describe('getPublicUrl', () => {
    it('returns default S3 URL with bucket and region', async () => {
      const url = await s3.getPublicUrl('file.pdf');
      expect(url).toBe(
        'https://test-bucket.s3.us-east-1.amazonaws.com/file.pdf'
      );
    });

    it('uses publicUrlBase when configured', async () => {
      mockS3Config.publicUrlBase = 'https://cdn.example.com/files';
      s3 = require('@/providers/storage/s3');
      const url = await s3.getPublicUrl('file.pdf');
      expect(url).toBe('https://cdn.example.com/files/file.pdf');
    });

    it('strips trailing slash from publicUrlBase', async () => {
      mockS3Config.publicUrlBase = 'https://cdn.example.com/files/';
      s3 = require('@/providers/storage/s3');
      const url = await s3.getPublicUrl('file.pdf');
      expect(url).toBe('https://cdn.example.com/files/file.pdf');
    });

    it('throws if bucket not configured', async () => {
      mockS3Config.bucket = undefined;
      s3 = require('@/providers/storage/s3');
      await expect(s3.getPublicUrl('k')).rejects.toThrow('S3_BUCKET');
    });
  });

  describe('getSignedReadUrl', () => {
    it('generates presigned URL with GetObjectCommand and default expiry', async () => {
      mockGetSignedUrl.mockResolvedValue('https://presigned.url');
      const url = await s3.getSignedReadUrl('secret.pdf');
      expect(url).toBe('https://presigned.url');
      expect(mockGetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'secret.pdf',
      });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        { send: mockSend },
        { Bucket: 'test-bucket', Key: 'secret.pdf' },
        { expiresIn: 900 }
      );
    });

    it('passes custom expiresIn to getSignedUrl', async () => {
      mockGetSignedUrl.mockResolvedValue('https://presigned.url');
      await s3.getSignedReadUrl('secret.pdf', 3600);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 }
      );
    });

    it('throws if bucket not configured', async () => {
      mockS3Config.bucket = undefined;
      s3 = require('@/providers/storage/s3');
      await expect(s3.getSignedReadUrl('k')).rejects.toThrow('S3_BUCKET');
    });
  });

  describe('getObjectBuffer', () => {
    it('reads and concatenates stream chunks from response Body', async () => {
      async function* body() {
        yield Buffer.from('hello ');
        yield Buffer.from('world');
      }
      mockSend.mockResolvedValue({ Body: body() });
      const result = await s3.getObjectBuffer('file.txt');
      expect(result).toEqual(Buffer.from('hello world'));
      expect(mockGetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'file.txt',
      });
    });

    it('throws if bucket not configured', async () => {
      mockS3Config.bucket = undefined;
      s3 = require('@/providers/storage/s3');
      await expect(s3.getObjectBuffer('k')).rejects.toThrow('S3_BUCKET');
    });
  });

  describe('getObjectMetadata', () => {
    it('returns contentType from HeadObjectCommand response', async () => {
      mockSend.mockResolvedValue({ ContentType: 'application/json' });
      const meta = await s3.getObjectMetadata('data.json');
      expect(meta).toEqual({ contentType: 'application/json' });
      expect(mockHeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'data.json',
      });
    });

    it('throws if bucket not configured', async () => {
      mockS3Config.bucket = undefined;
      s3 = require('@/providers/storage/s3');
      await expect(s3.getObjectMetadata('k')).rejects.toThrow('S3_BUCKET');
    });
  });

  describe('client construction (getClient)', () => {
    it('creates S3Client with region only when no endpoint or credentials', async () => {
      await s3.uploadBuffer('k', Buffer.from('a'), 'text/plain');
      expect(mockS3Client).toHaveBeenCalledWith({ region: 'us-east-1' });
    });

    it('creates S3Client with endpoint and forcePathStyle for non-AWS', async () => {
      mockS3Config.endpoint = 'https://storage.example.com';
      s3 = require('@/providers/storage/s3');
      await s3.uploadBuffer('k', Buffer.from('a'), 'text/plain');
      expect(mockS3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        endpoint: 'https://storage.example.com',
        forcePathStyle: true,
      });
    });

    it('includes credentials when accessKeyId and secretAccessKey are set', async () => {
      mockS3Config.accessKeyId = 'AKID123';
      mockS3Config.secretAccessKey = 'SECRET456';
      s3 = require('@/providers/storage/s3');
      await s3.uploadBuffer('k', Buffer.from('a'), 'text/plain');
      expect(mockS3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'AKID123',
          secretAccessKey: 'SECRET456',
        },
      });
    });

    it('throws when accessKeyId set but secretAccessKey missing', async () => {
      mockS3Config.accessKeyId = 'AKID123';
      mockS3Config.secretAccessKey = undefined;
      s3 = require('@/providers/storage/s3');
      await expect(
        s3.uploadBuffer('k', Buffer.from('a'), 'text/plain')
      ).rejects.toThrow(
        'S3_ACCESS_KEY_ID is set but S3_SECRET_ACCESS_KEY is missing'
      );
    });

    it('caches and reuses the same client across operations', async () => {
      await s3.uploadBuffer('k1', Buffer.from('a'), 'text/plain');
      await s3.deleteObject('k2');
      expect(mockS3Client).toHaveBeenCalledTimes(1);
    });
  });
});
