const logger = require('@/shared/logger');

const metricsStore = {
  httpRequestsTotal: new Map(),
  httpRequestDurationSum: new Map(),
};

function recordMetric(method, route, status, durationSec) {
  const key = JSON.stringify({ method, route, status });
  metricsStore.httpRequestsTotal.set(key, (metricsStore.httpRequestsTotal.get(key) || 0) + 1);
  metricsStore.httpRequestDurationSum.set(key, (metricsStore.httpRequestDurationSum.get(key) || 0) + durationSec);
}

function observabilityMiddleware(req, res, next) {
  if (req.path === '/metrics') {
    return next();
  }

  const startTime = process.hrtime();

  res.on('finish', () => {
    const durationDiff = process.hrtime(startTime);
    const durationMs = (durationDiff[0] * 1e3) + (durationDiff[1] * 1e-6);
    const durationSec = durationMs / 1000;

    const method = req.method;
    let route = 'unknown';
    if (req.route) {
      route = req.baseUrl ? `${req.baseUrl}${req.route.path}` : req.route.path;
    } else {
      route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    }

    const status = res.statusCode;

    logger.http(`${method} ${req.originalUrl} - ${status} - ${durationMs.toFixed(2)}ms`, {
      method,
      url: req.originalUrl,
      route,
      status,
      durationMs,
      ip: req.ip || req.headers['x-forwarded-for'] || (req.socket ? req.socket.remoteAddress : ''),
      userAgent: req.headers['user-agent']
    });

    recordMetric(method, route, status, durationSec);
  });

  next();
}

function escapeLabelValue(val) {
  if (val === undefined || val === null) {
    return '';
  }
  return String(val)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

function metricsHandler(req, res) {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');

  const lines = [];

  const addMetric = (name, type, help, values) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    if (values.length === 0) {
      return;
    }
    for (const { labels, val } of values) {
      if (labels && Object.keys(labels).length > 0) {
        const labelStr = Object.entries(labels)
          .map(([k, v]) => `${k}="${escapeLabelValue(v)}"`)
          .join(',');
        lines.push(`${name}{${labelStr}} ${val}`);
      } else {
        lines.push(`${name} ${val}`);
      }
    }
  };

  const uptime = process.uptime();
  addMetric('process_uptime_seconds', 'gauge', 'Uptime of the process in seconds', [{ val: uptime }]);

  const mem = process.memoryUsage();
  addMetric('process_memory_rss_bytes', 'gauge', 'Resident set size in bytes', [{ val: mem.rss }]);
  addMetric('process_memory_heap_total_bytes', 'gauge', 'Total heap size in bytes', [{ val: mem.heapTotal }]);
  addMetric('process_memory_heap_used_bytes', 'gauge', 'Used heap size in bytes', [{ val: mem.heapUsed }]);
  addMetric('process_memory_external_bytes', 'gauge', 'External memory size in bytes', [{ val: mem.external }]);

  const cpu = process.cpuUsage();
  const cpuUserSec = cpu.user / 1e6;
  const cpuSystemSec = cpu.system / 1e6;
  addMetric('process_cpu_user_seconds_total', 'counter', 'Total user CPU time spent in seconds', [{ val: cpuUserSec }]);
  addMetric('process_cpu_system_seconds_total', 'counter', 'Total system CPU time spent in seconds', [{ val: cpuSystemSec }]);

  const requestCountValues = [];
  const requestDurationValues = [];

  for (const [key, count] of metricsStore.httpRequestsTotal.entries()) {
    try {
      const { method, route, status } = JSON.parse(key);
      requestCountValues.push({
        labels: { method, route, status },
        val: count
      });

      const sumDuration = metricsStore.httpRequestDurationSum.get(key) || 0;
      requestDurationValues.push({
        labels: { method, route, status },
        val: sumDuration
      });
    } catch (e) {
    }
  }

  addMetric('http_requests_total', 'counter', 'Total number of HTTP requests', requestCountValues);
  addMetric('http_request_duration_seconds_sum', 'counter', 'Total duration of HTTP requests in seconds', requestDurationValues);
  addMetric('http_request_duration_seconds_count', 'counter', 'Total number of HTTP requests for duration calculation', requestCountValues);

  res.send(lines.join('\n') + '\n');
}

module.exports = {
  observabilityMiddleware,
  metricsHandler
};
