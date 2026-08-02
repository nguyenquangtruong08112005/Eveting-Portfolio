jest.mock('@elastic/elasticsearch', () => ({ Client: jest.fn() }));

const MODULE = '@/shared/config/elasticsearch.config';

const mockInfo = jest.fn();

let warnSpy, logSpy, errorSpy;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  delete process.env.ELASTIC_NODE_URL;
  warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  logSpy = jest.spyOn(console, 'log').mockImplementation();
  errorSpy = jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  warnSpy.mockRestore();
  logSpy.mockRestore();
  errorSpy.mockRestore();
  delete process.env.ELASTIC_NODE_URL;
});

describe('elasticsearch.config', () => {
  it('exports null and warns when ELASTIC_NODE_URL is unset', () => {
    const mod = require(MODULE);

    expect(mod).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('ELASTIC_NODE_URL'),
    );
  });

  it('creates a Client with the configured node URL when ELASTIC_NODE_URL is set', () => {
    process.env.ELASTIC_NODE_URL = 'http://localhost:9200';
    const { Client } = require('@elastic/elasticsearch');
    Client.mockImplementation(() => ({ info: mockInfo }));
    mockInfo.mockResolvedValue({});

    const mod = require(MODULE);

    expect(Client).toHaveBeenCalledWith({ node: 'http://localhost:9200' });
    expect(mod.info).toBe(mockInfo);
  });

  it('logs success when the info health check resolves', async () => {
    process.env.ELASTIC_NODE_URL = 'http://localhost:9200';
    const { Client } = require('@elastic/elasticsearch');
    Client.mockImplementation(() => ({ info: mockInfo }));
    mockInfo.mockResolvedValue({});

    require(MODULE);
    await new Promise((resolve) => setImmediate(resolve));

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Kết nối thành công'),
    );
  });

  it('logs an error when the info health check rejects', async () => {
    process.env.ELASTIC_NODE_URL = 'http://localhost:9200';
    const { Client } = require('@elastic/elasticsearch');
    Client.mockImplementation(() => ({ info: mockInfo }));
    mockInfo.mockRejectedValue(new Error('ECONNREFUSED'));

    require(MODULE);
    await new Promise((resolve) => setImmediate(resolve));

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Lỗi kết nối Elasticsearch'),
      expect.any(Error),
    );
  });
});
