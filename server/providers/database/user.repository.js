const firebaseUserRepository = require('./firebase.user.repository');
const postgresUserRepository = require('./postgres.user.repository');

const repositories = {
  firebase: firebaseUserRepository,
  postgres: postgresUserRepository,
};

const providerName = process.env.USER_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
  throw new Error(`Database provider "${providerName}" is not supported for users.`);
}

module.exports = activeRepository;
