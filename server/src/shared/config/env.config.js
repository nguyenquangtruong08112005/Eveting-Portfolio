const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  jwtTicketSecret: process.env.JWT_TICKET_SECRET,

  zalopay: {
    appId: process.env.ZALOPAY_APP_ID,
    key1: process.env.ZALOPAY_KEY1,
    key2: process.env.ZALOPAY_KEY2,
    endpoint: process.env.ZALOPAY_ENDPOINT,
  },

  appPublicUrl: process.env.APP_PUBLIC_URL,
};

module.exports = config;
