const providerName = process.env.USER_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
  activeRepository = require('./postgres.user.repository');
} else if (providerName === 'firebase') {
  activeRepository = require('./firebase.user.repository');
} else {
  throw new Error(`Database provider "${providerName}" is not supported for users.`);
}

module.exports = activeRepository;
