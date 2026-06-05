const fs = require('fs');
const path = require('path');
const config = require('@/shared/config/logger.config');

if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

const appLogPath = path.join(config.logDir, config.appLogFile);
const httpLogPath = path.join(config.logDir, config.httpLogFile);

const appStream = fs.createWriteStream(appLogPath, { flags: 'a', encoding: 'utf8' });
const httpStream = fs.createWriteStream(httpLogPath, { flags: 'a', encoding: 'utf8' });

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

function formatConsole(level, message, meta) {
  const ts = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
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
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  stream.write(JSON.stringify(logEntry) + '\n');
}

const logger = {
  debug(message, meta) {
    if (shouldLog('debug')) {
      if (config.enableConsole && config.env === 'development') {
        console.log(formatConsole('debug', message, meta));
      }
      logToStream(appStream, 'debug', message, meta);
    }
  },
  info(message, meta) {
    if (shouldLog('info')) {
      if (config.enableConsole && config.env === 'development') {
        console.log(formatConsole('info', message, meta));
      }
      logToStream(appStream, 'info', message, meta);
    }
  },
  warn(message, meta) {
    if (shouldLog('warn')) {
      if (config.enableConsole && config.env === 'development') {
        console.warn(formatConsole('warn', message, meta));
      }
      logToStream(appStream, 'warn', message, meta);
    }
  },
  error(message, meta) {
    if (shouldLog('error')) {
      if (config.enableConsole && config.env === 'development') {
        console.error(formatConsole('error', message, meta));
      }
      logToStream(appStream, 'error', message, meta);
    }
  },
  http(message, meta) {
    logToStream(httpStream, 'info', message, meta);

    if (config.enableConsole && config.env === 'development') {
      console.log(formatConsole('info', `HTTP ${message}`, meta));
    }
  }
};

module.exports = logger;
