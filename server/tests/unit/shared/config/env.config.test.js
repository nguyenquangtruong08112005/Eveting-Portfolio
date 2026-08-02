const config = require('../../../../src/shared/config/env.config');

const ENV_KEYS = [
  'NODE_ENV', 'PORT', 'JWT_TICKET_SECRET', 'ACCESS_TOKEN_EXPIRES_IN',
  'ACCESS_TOKEN_SECRET', 'AUTH_PROVIDER', 'ZALOPAY_APP_ID', 'ZALOPAY_KEY1',
  'ZALOPAY_KEY2', 'ZALOPAY_ENDPOINT', 'BANK_ACCOUNT_ENCRYPTION_KEY',
  'PAYOUT_WORKERS_ENABLED', 'STORAGE_PROVIDER', 'S3_REGION', 'S3_ENDPOINT',
  'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_PUBLIC_URL_BASE',
  'NOTIFICATION_PROVIDER', 'ONESIGNAL_REST_API_KEY', 'ONESIGNAL_APP_ID',
  'ONESIGNAL_TARGET_MODE', 'DATABASE_URL', 'DATABASE_PROVIDER',
  'ADMIN_DATABASE_PROVIDER', 'ANALYTICS_DATABASE_PROVIDER',
  'EVENT_DATABASE_PROVIDER', 'FEATURED_PROFILE_DATABASE_PROVIDER',
  'MEDIA_DATABASE_PROVIDER', 'MEMBERSHIP_DATABASE_PROVIDER',
  'NOTIFICATION_DATABASE_PROVIDER', 'ORDER_DATABASE_PROVIDER',
  'ORGANIZER_DATABASE_PROVIDER', 'PROMOTION_DATABASE_PROVIDER',
  'REVIEW_DATABASE_PROVIDER', 'TICKET_DATABASE_PROVIDER',
  'USER_DATABASE_PROVIDER', 'VENUE_DATABASE_PROVIDER',
  'OPENWEATHER_API_KEY', 'ADMIN_UID', 'APP_PUBLIC_URL',
];

function snapshotEnv() {
  const snap = {};
  for (const k of ENV_KEYS) snap[k] = process.env[k];
  return snap;
}

function restoreEnv(snap) {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

function clearAll() {
  for (const k of ENV_KEYS) delete process.env[k];
}

let snap;
beforeEach(() => { snap = snapshotEnv(); });
afterEach(() => { restoreEnv(snap); });

describe('config — top-level getters', () => {
  test('nodeEnv defaults to development', () => {
    clearAll();
    expect(config.nodeEnv).toBe('development');
  });

  test('nodeEnv reads NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    expect(config.nodeEnv).toBe('production');
  });

  test('port defaults to 3000', () => {
    clearAll();
    expect(config.port).toBe(3000);
  });

  test('port reads PORT', () => {
    process.env.PORT = '8080';
    expect(config.port).toBe(8080);
  });

  test('port falls back to 3000 for invalid value', () => {
    process.env.PORT = 'not-a-number';
    expect(config.port).toBe(3000);
  });

  test('accessTokenExpiresIn defaults to 15m', () => {
    clearAll();
    expect(config.accessTokenExpiresIn).toBe('15m');
  });

  test('accessTokenExpiresIn reads env', () => {
    process.env.ACCESS_TOKEN_EXPIRES_IN = '30m';
    expect(config.accessTokenExpiresIn).toBe('30m');
  });

  test('authProvider defaults to backend', () => {
    clearAll();
    expect(config.authProvider).toBe('backend');
  });

  test('authProvider reads env', () => {
    process.env.AUTH_PROVIDER = 'sso';
    expect(config.authProvider).toBe('sso');
  });

  test('storageProvider defaults to local', () => {
    clearAll();
    expect(config.storageProvider).toBe('local');
  });

  test('storageProvider reads env', () => {
    process.env.STORAGE_PROVIDER = 's3';
    expect(config.storageProvider).toBe('s3');
  });

  test('notificationProvider defaults to onesignal', () => {
    clearAll();
    expect(config.notificationProvider).toBe('onesignal');
  });

  test('notificationProvider reads env', () => {
    process.env.NOTIFICATION_PROVIDER = 'fcm';
    expect(config.notificationProvider).toBe('fcm');
  });

  test('databaseProvider defaults to postgres', () => {
    clearAll();
    expect(config.databaseProvider).toBe('postgres');
  });

  test('databaseProvider reads env', () => {
    process.env.DATABASE_PROVIDER = 'mysql';
    expect(config.databaseProvider).toBe('mysql');
  });

  test('jwtTicketSecret reads env', () => {
    process.env.JWT_TICKET_SECRET = 'tick-secret';
    expect(config.jwtTicketSecret).toBe('tick-secret');
  });

  test('accessTokenSecret reads env', () => {
    process.env.ACCESS_TOKEN_SECRET = 'acc-secret';
    expect(config.accessTokenSecret).toBe('acc-secret');
  });

  test('databaseUrl reads env', () => {
    process.env.DATABASE_URL = 'postgres://localhost/db';
    expect(config.databaseUrl).toBe('postgres://localhost/db');
  });

  test('openweatherApiKey reads env', () => {
    process.env.OPENWEATHER_API_KEY = 'ow-key';
    expect(config.openweatherApiKey).toBe('ow-key');
  });

  test('adminUid reads env', () => {
    process.env.ADMIN_UID = 'uid-123';
    expect(config.adminUid).toBe('uid-123');
  });

  test('appPublicUrl reads env', () => {
    process.env.APP_PUBLIC_URL = 'https://example.com';
    expect(config.appPublicUrl).toBe('https://example.com');
  });
});

describe('config — nested getters', () => {
  test('zalopay reads env values', () => {
    process.env.ZALOPAY_APP_ID = 'zid';
    process.env.ZALOPAY_KEY1 = 'zk1';
    process.env.ZALOPAY_KEY2 = 'zk2';
    process.env.ZALOPAY_ENDPOINT = 'https://zalopay.vn';
    expect(config.zalopay.appId).toBe('zid');
    expect(config.zalopay.key1).toBe('zk1');
    expect(config.zalopay.key2).toBe('zk2');
    expect(config.zalopay.endpoint).toBe('https://zalopay.vn');
  });

  test('zalopay undefined when env unset', () => {
    clearAll();
    expect(config.zalopay.appId).toBeUndefined();
    expect(config.zalopay.key1).toBeUndefined();
    expect(config.zalopay.key2).toBeUndefined();
    expect(config.zalopay.endpoint).toBeUndefined();
  });

  test('payout.workersEnabled defaults to true', () => {
    clearAll();
    expect(config.payout.workersEnabled).toBe(true);
  });

  test('payout.workersEnabled is false only when explicitly "false"', () => {
    process.env.PAYOUT_WORKERS_ENABLED = 'false';
    expect(config.payout.workersEnabled).toBe(false);
  });

  test('payout.workersEnabled is true for "true" and any other string', () => {
    process.env.PAYOUT_WORKERS_ENABLED = 'true';
    expect(config.payout.workersEnabled).toBe(true);
    process.env.PAYOUT_WORKERS_ENABLED = 'yes';
    expect(config.payout.workersEnabled).toBe(true);
  });

  test('payout.bankAccountEncryptionKey reads env', () => {
    process.env.BANK_ACCOUNT_ENCRYPTION_KEY = 'enc-key';
    expect(config.payout.bankAccountEncryptionKey).toBe('enc-key');
  });

  test('s3.region defaults to us-east-1', () => {
    clearAll();
    expect(config.s3.region).toBe('us-east-1');
  });

  test('s3.region reads env', () => {
    process.env.S3_REGION = 'eu-west-1';
    expect(config.s3.region).toBe('eu-west-1');
  });

  test('s3 nested getters read env', () => {
    process.env.S3_ENDPOINT = 'https://s3.example.com';
    process.env.S3_ACCESS_KEY_ID = 'akid';
    process.env.S3_SECRET_ACCESS_KEY = 'sak';
    process.env.S3_BUCKET = 'my-bucket';
    process.env.S3_PUBLIC_URL_BASE = 'https://cdn.example.com';
    expect(config.s3.endpoint).toBe('https://s3.example.com');
    expect(config.s3.accessKeyId).toBe('akid');
    expect(config.s3.secretAccessKey).toBe('sak');
    expect(config.s3.bucket).toBe('my-bucket');
    expect(config.s3.publicUrlBase).toBe('https://cdn.example.com');
  });

  test('s3 nested getters undefined when env unset', () => {
    clearAll();
    expect(config.s3.endpoint).toBeUndefined();
    expect(config.s3.accessKeyId).toBeUndefined();
    expect(config.s3.secretAccessKey).toBeUndefined();
    expect(config.s3.bucket).toBeUndefined();
    expect(config.s3.publicUrlBase).toBeUndefined();
  });

  test('onesignal reads env values', () => {
    process.env.ONESIGNAL_REST_API_KEY = 'os-key';
    process.env.ONESIGNAL_APP_ID = 'os-app';
    expect(config.onesignal.restApiKey).toBe('os-key');
    expect(config.onesignal.appId).toBe('os-app');
  });

  test('onesignal.targetMode defaults to subscription', () => {
    clearAll();
    expect(config.onesignal.targetMode).toBe('subscription');
  });

  test('onesignal.targetMode reads env', () => {
    process.env.ONESIGNAL_TARGET_MODE = 'tags';
    expect(config.onesignal.targetMode).toBe('tags');
  });

  test('onesignal undefined when env unset', () => {
    clearAll();
    expect(config.onesignal.restApiKey).toBeUndefined();
    expect(config.onesignal.appId).toBeUndefined();
  });
});

describe('config — databaseProviders', () => {
  const providers = [
    'admin', 'analytics', 'event', 'featuredProfile', 'media',
    'membership', 'notification', 'order', 'organizer', 'promotion',
    'review', 'ticket', 'user', 'venue',
  ];

  test.each(providers)('databaseProviders.%s is undefined when unset', (name) => {
    clearAll();
    expect(config.databaseProviders[name]).toBeUndefined();
  });

  test.each(providers)('databaseProviders.%s reads env', (name) => {
    const envKey = `${name.replace(/([A-Z])/g, '_$1').toUpperCase()}_DATABASE_PROVIDER`.toUpperCase();
    process.env[envKey] = `${name}-provider`;
    expect(config.databaseProviders[name]).toBe(`${name}-provider`);
  });
});
