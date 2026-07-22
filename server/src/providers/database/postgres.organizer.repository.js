const { query } = require('./postgres.client');
const postgresUserRepository = require('./postgres.user.repository');
const { fromDb, nowDb, nowMs } = require('./time.helper');

const getOrganizerProfile = async (userId) => {
  // email + roles: auth_users | name + avatar: user_profiles | org fields: organizer_profiles
  const result = await query(
    `SELECT a.id,
            u.name,
            a.email,
            u.profile_pic_url,
            a.roles,
            o.company_name, o.tax_code, o.website, o.description, o.status, o.created_at, o.raw_data
     FROM auth_users a
     LEFT JOIN user_profiles u ON u.id = a.id AND u.deleted_at IS NULL
     LEFT JOIN organizer_profiles o ON o.user_id = a.id
     WHERE a.id = $1 AND a.deleted_at IS NULL`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  const doc = {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    profilePicUrl: row.profile_pic_url || '',
    roles: row.roles || []
  };

  if (row.company_name !== null) {
    doc.organizerInfo = {
      companyName: row.company_name,
      taxCode: row.tax_code || '',
      description: row.description || '',
      website: row.website || '',
      status: row.status || 'approved',
      createdAt: fromDb(row.created_at) ?? nowMs()
    };
    if (row.raw_data) {
      doc.organizerInfo = Object.assign({}, row.raw_data, doc.organizerInfo);
    }
  } else {
    // Fallback to user_profiles organizer_info JSONB column if exists but no row in organizer_profiles yet
    const rawUser = await postgresUserRepository.getRawUserDataById(userId);
    if (rawUser && rawUser.organizerInfo) {
      doc.organizerInfo = rawUser.organizerInfo;
    }
  }

  return doc;
};

const addOrganizerRoleToUser = async (userId, organizerData) => {
  // 1. Update user_profiles via postgresUserRepository
  await postgresUserRepository.addOrganizerRoleToUser(userId, organizerData);

  // 2. Upsert to organizer_profiles (created_at is timestamptz)
  const rawData = Object.assign({ status: 'approved' }, organizerData);
  await query(
    `INSERT INTO organizer_profiles (id, user_id, company_name, tax_code, website, description, status, created_at, raw_data)
     VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       tax_code = EXCLUDED.tax_code,
       website = EXCLUDED.website,
       description = EXCLUDED.description,
       status = EXCLUDED.status,
       raw_data = EXCLUDED.raw_data,
       updated_at = NOW()`,
    [
      userId,
      organizerData.companyName || '',
      organizerData.taxCode || '',
      organizerData.website || '',
      organizerData.description || '',
      organizerData.status || 'approved',
      nowDb(),
      JSON.stringify(rawData)
    ]
  );

  return getOrganizerProfile(userId);
};

const updateOrganizerProfile = async (userId, updateData) => {
  // 1. Update user_profiles via postgresUserRepository
  await postgresUserRepository.updateUserFields(userId, updateData);

  // 2. Parse updates for organizer_profiles
  const orgSets = [];
  const orgParams = [];
  let orgIdx = 1;
  const rawMerge = {};
  let hasOrgUpdates = false;

  for (const key in updateData) {
    const val = updateData[key];
    let col = null;
    let field = null;

    if (key.startsWith('organizerInfo.')) {
      field = key.split('.')[1];
    } else {
      field = key;
    }

    if (field === 'companyName') col = 'company_name';
    else if (field === 'taxCode') col = 'tax_code';
    else if (field === 'website') col = 'website';
    else if (field === 'description') col = 'description';
    else if (field === 'status') col = 'status';

    if (col) {
      orgSets.push(`${col} = $${orgIdx}`);
      orgParams.push(val);
      orgIdx++;
      hasOrgUpdates = true;
      rawMerge[field] = val;
    }
  }

  if (hasOrgUpdates) {
    if (Object.keys(rawMerge).length > 0) {
      orgSets.push(`raw_data = COALESCE(raw_data, '{}'::jsonb) || $${orgIdx}::jsonb`);
      orgParams.push(JSON.stringify(rawMerge));
      orgIdx++;
    }
    orgParams.push(userId);
    await query(
      `UPDATE organizer_profiles SET ${orgSets.join(', ')}, updated_at = NOW() WHERE id = $${orgIdx}`,
      orgParams
    );
  }

  return getOrganizerProfile(userId);
};

module.exports = {
  getOrganizerProfile,
  addOrganizerRoleToUser,
  updateOrganizerProfile
};
