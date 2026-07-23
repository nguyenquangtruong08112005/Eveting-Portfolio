const path = require('path');

module.exports = {
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',
  logDir: path.join(__dirname, '../../../logs'),
  appLogFile: 'app.log',
  httpLogFile: 'http.log',
  enableConsole: process.env.LOG_CONSOLE !== 'false',
};
