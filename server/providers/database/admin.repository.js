const providerName = process.env.ADMIN_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
  activeRepository = require('./postgres.admin.repository');
} else if (providerName === 'firebase') {
  activeRepository = require('./firebase.admin.repository');
} else {
  throw new Error(`Database provider "${providerName}" is not supported for admin.`);
}

module.exports = activeRepository;
