let mockProviderName = 'local';

jest.mock('@/shared/config/env.config', () => ({
  get storageProvider() { return mockProviderName; },
}));
jest.mock('@/providers/storage/local', () => ({ __mock: 'local' }));
jest.mock('@/providers/storage/s3', () => ({ __mock: 's3' }));

describe('StorageProviderIndex', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('exports local provider when storageProvider is local', () => {
    mockProviderName = 'local';
    const provider = require('@/providers/storage/index');
    expect(provider).toEqual({ __mock: 'local' });
  });

  it('exports s3 provider when storageProvider is s3', () => {
    mockProviderName = 's3';
    const provider = require('@/providers/storage/index');
    expect(provider).toEqual({ __mock: 's3' });
  });

  it('throws for unsupported provider', () => {
    mockProviderName = 'gcs';
    expect(() => require('@/providers/storage/index')).toThrow(
      'Storage provider "gcs" is not supported.'
    );
  });
});
