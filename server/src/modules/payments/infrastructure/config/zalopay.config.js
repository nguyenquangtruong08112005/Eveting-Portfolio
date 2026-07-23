const envConfig = require('@/shared/config/env.config');

const config = {
    app_id: envConfig.zalopay.appId,
    key1: envConfig.zalopay.key1,
    key2: envConfig.zalopay.key2,
    endpoint: envConfig.zalopay.endpoint,
    callback_url: `${envConfig.appPublicUrl}/payments/callback`
};

module.exports = config;
