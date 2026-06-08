const config = {
  get nodeEnv() { return process.env.NODE_ENV || 'development'; },
  get port() { return parseInt(process.env.PORT, 10) || 3000; },

  // Auth
  get jwtTicketSecret() { return process.env.JWT_TICKET_SECRET; },
  get accessTokenExpiresIn() { return process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'; },
  get accessTokenSecret() { return process.env.ACCESS_TOKEN_SECRET; },
  get authProvider() { return process.env.AUTH_PROVIDER || 'backend'; },

  // ZaloPay
  zalopay: {
    get appId() { return process.env.ZALOPAY_APP_ID; },
    get key1() { return process.env.ZALOPAY_KEY1; },
    get key2() { return process.env.ZALOPAY_KEY2; },
    get endpoint() { return process.env.ZALOPAY_ENDPOINT; },
  },

  // Storage
  get storageProvider() { return process.env.STORAGE_PROVIDER || 'local'; },
  s3: {
    get region() { return process.env.S3_REGION || 'us-east-1'; },
    get endpoint() { return process.env.S3_ENDPOINT; },
    get accessKeyId() { return process.env.S3_ACCESS_KEY_ID; },
    get secretAccessKey() { return process.env.S3_SECRET_ACCESS_KEY; },
    get bucket() { return process.env.S3_BUCKET; },
    get publicUrlBase() { return process.env.S3_PUBLIC_URL_BASE; },
  },

  // Notification
  get notificationProvider() { return process.env.NOTIFICATION_PROVIDER || 'onesignal'; },
  onesignal: {
    get restApiKey() { return process.env.ONESIGNAL_REST_API_KEY; },
    get appId() { return process.env.ONESIGNAL_APP_ID; },
    get targetMode() { return process.env.ONESIGNAL_TARGET_MODE || 'subscription'; },
  },

  // Database
  get databaseUrl() { return process.env.DATABASE_URL; },
  get databaseProvider() { return process.env.DATABASE_PROVIDER || 'postgres'; },
  databaseProviders: {
    get admin() { return process.env.ADMIN_DATABASE_PROVIDER; },
    get analytics() { return process.env.ANALYTICS_DATABASE_PROVIDER; },
    get event() { return process.env.EVENT_DATABASE_PROVIDER; },
    get featuredProfile() { return process.env.FEATURED_PROFILE_DATABASE_PROVIDER; },
    get media() { return process.env.MEDIA_DATABASE_PROVIDER; },
    get notification() { return process.env.NOTIFICATION_DATABASE_PROVIDER; },
    get organizer() { return process.env.ORGANIZER_DATABASE_PROVIDER; },
    get promotion() { return process.env.PROMOTION_DATABASE_PROVIDER; },
    get review() { return process.env.REVIEW_DATABASE_PROVIDER; },
    get ticket() { return process.env.TICKET_DATABASE_PROVIDER; },
    get user() { return process.env.USER_DATABASE_PROVIDER; },
    get venue() { return process.env.VENUE_DATABASE_PROVIDER; },
  },

  // Weather
  get openweatherApiKey() { return process.env.OPENWEATHER_API_KEY; },

  // Admin
  get adminUid() { return process.env.ADMIN_UID; },

  // App
  get appPublicUrl() { return process.env.APP_PUBLIC_URL; },
};

module.exports = config;
