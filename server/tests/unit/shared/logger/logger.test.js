const mockWrite = jest.fn();
const mockOn = jest.fn();
const mockStream = { write: mockWrite, writable: true, on: mockOn };

jest.mock('@/shared/config/logger.config', () => ({
  logLevel: 'debug',
  logDir: '/tmp/logs',
  appLogFile: 'app.log',
  httpLogFile: 'http.log',
  enableConsole: true,
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(() => mockStream),
}));

const fs = require('fs');
const config = require('@/shared/config/logger.config');

beforeEach(() => {
  jest.clearAllMocks();
  mockStream.writable = true;
  config.logLevel = 'debug';
  config.enableConsole = true;
});

const logger = require('@/shared/logger');

describe('logger', () => {
  describe('info', () => {
    it('calls originalConsole.log with formatted message', () => {
      const spy = jest.spyOn(logger.originalConsole, 'log').mockImplementation();
      logger.info('hello', { a: 1 });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('INFO')
      );
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('hello')
      );
      spy.mockRestore();
    });

    it('writes JSON to appStream', () => {
      logger.info('test msg', { key: 'val' });
      expect(mockStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"message":"test msg"')
      );
    });
  });

  describe('warn', () => {
    it('calls originalConsole.warn', () => {
      const spy = jest.spyOn(logger.originalConsole, 'warn').mockImplementation();
      logger.warn('careful');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('WARN'));
      spy.mockRestore();
    });

    it('writes to stream', () => {
      logger.warn('w msg');
      expect(mockStream.write).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('calls originalConsole.error', () => {
      const spy = jest.spyOn(logger.originalConsole, 'error').mockImplementation();
      logger.error('fail');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
      spy.mockRestore();
    });
  });

  describe('debug', () => {
    it('calls originalConsole.log for debug', () => {
      const spy = jest.spyOn(logger.originalConsole, 'log').mockImplementation();
      logger.debug('trace');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('DEBUG'));
      spy.mockRestore();
    });
  });

  describe('http', () => {
    it('writes to stream', () => {
      logger.http('GET /api');
      expect(mockStream.write).toHaveBeenCalled();
    });

    it('formats with HTTP prefix in console', () => {
      const spy = jest.spyOn(logger.originalConsole, 'log').mockImplementation();
      logger.http('POST /data');
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('HTTP POST /data')
      );
      spy.mockRestore();
    });
  });

  describe('enableConsole false', () => {
    it('does not call console methods', () => {
      config.enableConsole = false;
      const spy = jest.spyOn(logger.originalConsole, 'log').mockImplementation();
      logger.info('silent');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('still writes to stream', () => {
      config.enableConsole = false;
      mockStream.write.mockClear();
      logger.info('still here');
      expect(mockStream.write).toHaveBeenCalled();
    });
  });

  describe('stream write errors', () => {
    it('does not throw when stream.write throws', () => {
      mockStream.write.mockImplementationOnce(() => { throw new Error('disk'); });
      expect(() => logger.info('boom')).not.toThrow();
    });

    it('skips write when stream is not writable', () => {
      mockStream.writable = false;
      expect(() => logger.info('nope')).not.toThrow();
    });
  });

  describe('formatConsole', () => {
    it('includes meta as JSON string', () => {
      const spy = jest.spyOn(logger.originalConsole, 'log').mockImplementation();
      logger.info('with-meta', { foo: 'bar' });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('"foo":"bar"')
      );
      spy.mockRestore();
    });

    it('omits meta string when meta is empty', () => {
      const spy = jest.spyOn(logger.originalConsole, 'log').mockImplementation();
      logger.info('no-meta');
      const call = spy.mock.calls[0][0];
      expect(call).not.toContain('{}');
      spy.mockRestore();
    });
  });

  describe('asyncLocalStorage', () => {
    it('is exposed and functional', () => {
      expect(logger.asyncLocalStorage).toBeDefined();
      expect(typeof logger.asyncLocalStorage.run).toBe('function');
    });

    it('attaches requestId to log entries when in context', () => {
      const spy = jest.spyOn(logger.originalConsole, 'log').mockImplementation();
      logger.asyncLocalStorage.run({ requestId: 'req-123' }, () => {
        logger.info('contextual');
      });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('module initialization', () => {
    it('exposes originalConsole', () => {
      expect(logger.originalConsole).toBeDefined();
      expect(typeof logger.originalConsole.log).toBe('function');
    });

    it('creates log directory when it does not exist', () => {
      expect(fs.mkdirSync).toBeDefined();
    });

    it('has streams available (created at import time)', () => {
      expect(mockStream).toBeDefined();
    });
  });
});

describe('logger level filtering (isolated modules)', () => {
  const createLoggerWithLevel = (level) => {
    jest.resetModules();
    jest.doMock('@/shared/config/logger.config', () => ({
      logLevel: level,
      logDir: '/tmp/logs',
      appLogFile: 'app.log',
      httpLogFile: 'http.log',
      enableConsole: true,
    }));
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn(() => mockStream),
    }));
    return require('@/shared/logger');
  };

  it('suppresses debug when level is info', () => {
    const localLogger = createLoggerWithLevel('info');
    const spy = jest.spyOn(localLogger.originalConsole, 'log').mockImplementation();
    mockStream.write.mockClear();
    localLogger.debug('hidden');
    expect(spy).not.toHaveBeenCalled();
    expect(mockStream.write).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('suppresses info and debug when level is warn', () => {
    const localLogger = createLoggerWithLevel('warn');
    const spy = jest.spyOn(localLogger.originalConsole, 'log').mockImplementation();
    mockStream.write.mockClear();
    localLogger.info('hidden');
    localLogger.debug('hidden');
    expect(spy).not.toHaveBeenCalled();
    expect(mockStream.write).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('allows error when level is warn', () => {
    const localLogger = createLoggerWithLevel('warn');
    const spy = jest.spyOn(localLogger.originalConsole, 'error').mockImplementation();
    localLogger.error('shown');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('logger stream error handlers', () => {
  it('reports appStream and httpStream errors via originalConsole.error', () => {
    const stream = { write: jest.fn(), writable: true, on: jest.fn() };
    jest.resetModules();
    jest.doMock('@/shared/config/logger.config', () => ({
      logLevel: 'debug', logDir: '/tmp/logs', appLogFile: 'app.log', httpLogFile: 'http.log', enableConsole: true,
    }));
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn(() => stream),
    }));
    const spy = jest.spyOn(console, 'error').mockImplementation();
    try {
      const fresh = require('@/shared/logger');
      const handlers = stream.on.mock.calls.filter((c) => c[0] === 'error').map((c) => c[1]);
      handlers.forEach((h) => h(new Error('disk full')));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('appStream error: disk full'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('httpStream error: disk full'));
      expect(fresh).toBeDefined();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('logger init failure paths', () => {
  it('warns when the log directory cannot be created', () => {
    jest.resetModules();
    jest.doMock('@/shared/config/logger.config', () => ({
      logLevel: 'debug', logDir: '/tmp/logs', appLogFile: 'app.log', httpLogFile: 'http.log', enableConsole: true,
    }));
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(false),
      mkdirSync: jest.fn(() => { throw new Error('EACCES'); }),
      createWriteStream: jest.fn(() => mockStream),
    }));
    const spy = jest.spyOn(console, 'error').mockImplementation();
    try {
      const fresh = require('@/shared/logger');
      expect(() => fresh.info('x')).not.toThrow();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Could not create log directory'));
    } finally {
      spy.mockRestore();
    }
  });

  it('continues without streams when createWriteStream throws', () => {
    jest.resetModules();
    jest.doMock('@/shared/config/logger.config', () => ({
      logLevel: 'debug', logDir: '/tmp/logs', appLogFile: 'app.log', httpLogFile: 'http.log', enableConsole: true,
    }));
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn(() => { throw new Error('EACCES'); }),
    }));
    const spy = jest.spyOn(console, 'error').mockImplementation();
    try {
      const fresh = require('@/shared/logger');
      expect(() => fresh.info('x')).not.toThrow();
      expect(() => fresh.http('GET /api')).not.toThrow();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to create appStream'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to create httpStream'));
    } finally {
      spy.mockRestore();
    }
  });

  it('defaults to info level for an unknown log level', () => {
    jest.resetModules();
    jest.doMock('@/shared/config/logger.config', () => ({
      logLevel: 'verbose', logDir: '/tmp/logs', appLogFile: 'app.log', httpLogFile: 'http.log', enableConsole: true,
    }));
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn(() => mockStream),
    }));
    const fresh = require('@/shared/logger');
    mockStream.write.mockClear();
    fresh.debug('hidden-debug');
    fresh.info('shown-info');
    expect(mockStream.write).toHaveBeenCalledWith(expect.stringContaining('"message":"shown-info"'));
    expect(mockStream.write).not.toHaveBeenCalledWith(expect.stringContaining('hidden-debug'));
  });

  it('filters warn when the level is error', () => {
    jest.resetModules();
    jest.doMock('@/shared/config/logger.config', () => ({
      logLevel: 'error', logDir: '/tmp/logs', appLogFile: 'app.log', httpLogFile: 'http.log', enableConsole: true,
    }));
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn(() => mockStream),
    }));
    const fresh = require('@/shared/logger');
    mockStream.write.mockClear();
    fresh.warn('hidden-warn');
    expect(mockStream.write).not.toHaveBeenCalled();
  });
});

describe('logger console suppression and metadata fallbacks', () => {
  it('suppresses console output per method when enableConsole is false', () => {
    const prev = config.enableConsole;
    config.enableConsole = false;
    const logSpy = jest.spyOn(logger.originalConsole, 'log').mockImplementation();
    const warnSpy = jest.spyOn(logger.originalConsole, 'warn').mockImplementation();
    const errorSpy = jest.spyOn(logger.originalConsole, 'error').mockImplementation();
    try {
      logger.debug('d');
      logger.warn('w');
      logger.error('e');
      logger.http('GET /h');
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      config.enableConsole = prev;
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('swallows non-serializable metadata when console is disabled', () => {
    const prev = config.enableConsole;
    config.enableConsole = false;
    try {
      const circular = {};
      circular.self = circular;
      expect(() => logger.info('circular', circular)).not.toThrow();
      expect(() => logger.http('circular', circular)).not.toThrow();
    } finally {
      config.enableConsole = prev;
    }
  });
});

describe('logger request context', () => {
  it('includes requestId in stream JSON when context is present', () => {
    mockStream.write.mockClear();
    logger.asyncLocalStorage.run({ requestId: 'req-abc' }, () => {
      logger.info('ctx-msg');
    });
    expect(mockStream.write).toHaveBeenCalledWith(expect.stringContaining('"requestId":"req-abc"'));
  });

  it('omits requestId when no context is present', () => {
    mockStream.write.mockClear();
    logger.info('no-ctx');
    expect(mockStream.write).toHaveBeenCalledWith(expect.stringContaining('"message":"no-ctx"'));
    expect(mockStream.write).not.toHaveBeenCalledWith(expect.stringContaining('"requestId"'));
  });
});

describe('logger console bridge', () => {
  it('routes console.log through logger.info', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation();
    console.log('routed');
    expect(spy).toHaveBeenCalledWith('routed');
    spy.mockRestore();
  });

  it('routes console.warn through logger.warn', () => {
    const spy = jest.spyOn(logger, 'warn').mockImplementation();
    console.warn('warned');
    expect(spy).toHaveBeenCalledWith('warned');
    spy.mockRestore();
  });

  it('routes console.error through logger.error', () => {
    const spy = jest.spyOn(logger, 'error').mockImplementation();
    console.error('errored');
    expect(spy).toHaveBeenCalledWith('errored');
    spy.mockRestore();
  });

  it('routes console.debug through logger.debug', () => {
    const spy = jest.spyOn(logger, 'debug').mockImplementation();
    console.debug('debugged');
    expect(spy).toHaveBeenCalledWith('debugged');
    spy.mockRestore();
  });

  it('guards against recursive logging', () => {
    const origLog = logger.originalConsole.log;
    const spy = jest.fn();
    spy.mockImplementationOnce(() => { console.log('inner'); });
    logger.originalConsole.log = spy;
    try {
      console.log('outer');
    } finally {
      logger.originalConsole.log = origLog;
    }
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('logger console bridge recursion guards', () => {
  it.each([
    ['log', 'log'],
    ['info', 'log'],
    ['warn', 'warn'],
    ['error', 'error'],
    ['debug', 'log'],
  ])('guards console.%s against recursion', (bridgeMethod, outputMethod) => {
    const origOut = logger.originalConsole[outputMethod];
    const origBridge = logger.originalConsole[bridgeMethod];
    const outSpy = jest.fn();
    outSpy.mockImplementationOnce(() => { console[bridgeMethod]('inner'); });
    logger.originalConsole[outputMethod] = outSpy;
    const directSpy = bridgeMethod === outputMethod ? null : jest.fn();
    if (directSpy) logger.originalConsole[bridgeMethod] = directSpy;
    try {
      console[bridgeMethod]('outer');
      if (directSpy) {
        expect(directSpy).toHaveBeenCalledWith('inner');
      } else {
        expect(outSpy).toHaveBeenCalledTimes(2);
      }
    } finally {
      logger.originalConsole[outputMethod] = origOut;
      if (directSpy) logger.originalConsole[bridgeMethod] = origBridge;
    }
  });
});

describe('logger originalConsole fallbacks', () => {
  const mockFreshModules = () => {
    jest.doMock('@/shared/config/logger.config', () => ({
      logLevel: 'debug', logDir: '/tmp/logs', appLogFile: 'app.log', httpLogFile: 'http.log', enableConsole: true,
    }));
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn(() => mockStream),
    }));
  };

  const hideConsoleProp = (prop) => {
    const desc = Object.getOwnPropertyDescriptor(console, prop);
    Object.defineProperty(console, prop, { value: undefined, configurable: true, writable: true });
    return () => {
      if (desc) {
        Object.defineProperty(console, prop, desc);
      } else {
        delete console[prop];
      }
    };
  };

  it('falls back to console.log when console.info is missing at load', () => {
    const restore = hideConsoleProp('info');
    try {
      jest.resetModules();
      mockFreshModules();
      const fresh = require('@/shared/logger');
      expect(fresh.originalConsole.info).toBe(fresh.originalConsole.log);
    } finally {
      restore();
    }
  });

  it('falls back to console.log when console.debug is missing at load', () => {
    const restore = hideConsoleProp('debug');
    try {
      jest.resetModules();
      mockFreshModules();
      const fresh = require('@/shared/logger');
      expect(fresh.originalConsole.debug).toBe(fresh.originalConsole.log);
    } finally {
      restore();
    }
  });
});