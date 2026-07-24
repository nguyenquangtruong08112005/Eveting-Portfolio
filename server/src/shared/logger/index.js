const fs = require('fs');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');
const util = require('util');
const config = require('@/shared/config/logger.config');

// Keep original console methods to prevent recursive logging loops
const originalConsole = {
  log: console.log,
  info: console.info || console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug || console.log
};

const asyncLocalStorage = new AsyncLocalStorage();

try {
  if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
  }
} catch (err) {
  originalConsole.error(`[Logger] Warning: Could not create log directory ${config.logDir}: ${err.message}`);
}

const appLogPath = path.join(config.logDir, config.appLogFile);
const httpLogPath = path.join(config.logDir, config.httpLogFile);

let appStream = null;
let httpStream = null;

try {
  appStream = fs.createWriteStream(appLogPath, { flags: 'a', encoding: 'utf8' });
  appStream.on('error', (err) => {
    originalConsole.error(`[Logger] appStream error: ${err.message}`);
  });
} catch (err) {
  originalConsole.error(`[Logger] Failed to create appStream: ${err.message}`);
}

try {
  httpStream = fs.createWriteStream(httpLogPath, { flags: 'a', encoding: 'utf8' });
  httpStream.on('error', (err) => {
    originalConsole.error(`[Logger] httpStream error: ${err.message}`);
  });
} catch (err) {
  originalConsole.error(`[Logger] Failed to create httpStream: ${err.message}`);
}

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevelVal = levels[config.logLevel.toLowerCase()] !== undefined
  ? levels[config.logLevel.toLowerCase()]
  : 1;

function shouldLog(level) {
  const levelVal = levels[level.toLowerCase()];
  return levelVal !== undefined && levelVal >= currentLevelVal;
}

function getContextMeta() {
  const store = asyncLocalStorage.getStore();
  return store ? { requestId: store.requestId } : {};
}

function formatConsole(level, message, meta) {
  const ts = new Date().toISOString();
  const contextMeta = getContextMeta();
  const combinedMeta = { ...contextMeta, ...meta };
  const metaStr = combinedMeta && Object.keys(combinedMeta).length > 0 ? ` ${JSON.stringify(combinedMeta)}` : '';
  const levelUpper = level.toUpperCase();

  let colorStart = '';
  const colorEnd = '\x1b[0m';
  switch (levelUpper) {
    case 'DEBUG': colorStart = '\x1b[36m'; break;
    case 'INFO':  colorStart = '\x1b[32m'; break;
    case 'WARN':  colorStart = '\x1b[33m'; break;
    case 'ERROR': colorStart = '\x1b[31m'; break;
  }

  return `${colorStart}[${ts}] ${levelUpper}:${colorEnd} ${message}${metaStr}`;
}

function logToStream(stream, level, message, meta = {}) {
  if (!stream || !stream.writable) return;
  try {
    const contextMeta = getContextMeta();
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...contextMeta,
      ...meta
    };
    stream.write(JSON.stringify(logEntry) + '\n');
  } catch (err) {
    // Ignore stream write errors to prevent process crash
  }
}

const logger = {
  asyncLocalStorage,
  originalConsole,
  debug(message, meta) {
    if (shouldLog('debug')) {
      if (config.enableConsole) {
        originalConsole.log(formatConsole('debug', message, meta));
      }
      logToStream(appStream, 'debug', message, meta);
    }
  },
  info(message, meta) {
    if (shouldLog('info')) {
      if (config.enableConsole) {
        originalConsole.log(formatConsole('info', message, meta));
      }
      logToStream(appStream, 'info', message, meta);
    }
  },
  warn(message, meta) {
    if (shouldLog('warn')) {
      if (config.enableConsole) {
        originalConsole.warn(formatConsole('warn', message, meta));
      }
      logToStream(appStream, 'warn', message, meta);
    }
  },
  error(message, meta) {
    if (shouldLog('error')) {
      if (config.enableConsole) {
        originalConsole.error(formatConsole('error', message, meta));
      }
      logToStream(appStream, 'error', message, meta);
    }
  },
  http(message, meta) {
    logToStream(httpStream, 'info', message, meta);

    if (config.enableConsole) {
      originalConsole.log(formatConsole('info', `HTTP ${message}`, meta));
    }
  }
};

// Console bridge bootstrapper
let isLogging = false;

function bootstrapConsoleBridge() {
  if (console.__opencodeBridgeInstalled) return;
  console.__opencodeBridgeInstalled = true;

  console.log = function(...args) {
    if (isLogging) {
      originalConsole.log(...args);
      return;
    }
    isLogging = true;
    try {
      const msg = util.format(...args);
      logger.info(msg);
    } finally {
      isLogging = false;
    }
  };

  console.info = function(...args) {
    if (isLogging) {
      originalConsole.info(...args);
      return;
    }
    isLogging = true;
    try {
      const msg = util.format(...args);
      logger.info(msg);
    } finally {
      isLogging = false;
    }
  };

  console.warn = function(...args) {
    if (isLogging) {
      originalConsole.warn(...args);
      return;
    }
    isLogging = true;
    try {
      const msg = util.format(...args);
      logger.warn(msg);
    } finally {
      isLogging = false;
    }
  };

  console.error = function(...args) {
    if (isLogging) {
      originalConsole.error(...args);
      return;
    }
    isLogging = true;
    try {
      const msg = util.format(...args);
      logger.error(msg);
    } finally {
      isLogging = false;
    }
  };

  console.debug = function(...args) {
    if (isLogging) {
      originalConsole.debug(...args);
      return;
    }
    isLogging = true;
    try {
      const msg = util.format(...args);
      logger.debug(msg);
    } finally {
      isLogging = false;
    }
  };
}

bootstrapConsoleBridge();

module.exports = logger;
