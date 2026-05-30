// Compare featured profile data between Firebase and Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.featured_profiles.firebase-postgres.js
//   DATABASE_URL=postgres://... FEATURED_PROFILE_SMOKE_ID=<id> node scripts/compare.featured_profiles.firebase-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../../../providers/database/firebase.featuredProfile.repository');
var postgresRepo = require('../../../providers/database/postgres.featuredProfile.repository');

function stableStringify(obj) {
  return JSON.stringify(obj, function(key, value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce(function(acc, k) {
        acc[k] = value[k];
        return acc;
      }, {});
    }
    return value;
  });
}

var matched = 0;
var missingInPostgres = [];
var missingInFirebase = [];
var different = [];

async function compare() {
  var firebaseProfiles = await firebaseRepo.getAllFeaturedProfiles();
  var postgresProfiles = await postgresRepo.getAllFeaturedProfiles();

  var fbMap = {};
  firebaseProfiles.forEach(function(p) { fbMap[p.id] = p; });
  var pgMap = {};
  postgresProfiles.forEach(function(p) { pgMap[p.id] = p; });

  var allIds = Object.keys(fbMap).concat(Object.keys(pgMap)).filter(function(id, idx, arr) {
    return arr.indexOf(id) === idx;
  }).sort();

  allIds.forEach(function(id) {
    var inFb = id in fbMap;
    var inPg = id in pgMap;
    if (inFb && inPg) {
      // Normalize followerCount and followersCount and ownerUserId if needed for comparison
      var fbNormalized = {
        id: fbMap[id].id,
        name: fbMap[id].name,
        profileType: fbMap[id].profileType || 'artist',
        bio: fbMap[id].bio || '',
        imageUrl: fbMap[id].imageUrl || '',
        genres: fbMap[id].genres || [],
        followerCount: fbMap[id].followerCount || fbMap[id].followersCount || 0,
        followersCount: fbMap[id].followerCount || fbMap[id].followersCount || 0,
        ownerUserId: fbMap[id].ownerUserId || null
      };
      var pgNormalized = {
        id: pgMap[id].id,
        name: pgMap[id].name,
        profileType: pgMap[id].profileType || 'artist',
        bio: pgMap[id].bio || '',
        imageUrl: pgMap[id].imageUrl || '',
        genres: pgMap[id].genres || [],
        followerCount: pgMap[id].followerCount || pgMap[id].followersCount || 0,
        followersCount: pgMap[id].followerCount || pgMap[id].followersCount || 0,
        ownerUserId: pgMap[id].ownerUserId || null
      };
      
      var fbStr = stableStringify(fbNormalized);
      var pgStr = stableStringify(pgNormalized);
      if (fbStr === pgStr) {
        matched++;
      } else {
        different.push({ id: id, firebase: fbMap[id], postgres: pgMap[id] });
      }
    } else if (inFb && !inPg) {
      missingInPostgres.push(id);
    } else if (!inFb && inPg) {
      missingInFirebase.push(id);
    }
  });

  console.log('matched: ' + matched);
  console.log('missing in postgres: ' + missingInPostgres.length);
  console.log('missing in firebase: ' + missingInFirebase.length);
  console.log('different: ' + different.length);

  missingInPostgres.forEach(function(id) {
    console.log('  MISSING-PG: ' + id);
  });
  missingInFirebase.forEach(function(id) {
    console.log('  MISSING-FB: ' + id);
  });
  different.forEach(function(d) {
    console.log('  DIFFERENT: ' + d.id);
    console.log('    Firebase: ' + JSON.stringify(d.firebase));
    console.log('    Postgres: ' + JSON.stringify(d.postgres));
  });

  var smokeId = process.env.FEATURED_PROFILE_SMOKE_ID || 'fp_google_experts';
  if (smokeId) {
    console.log('\nFEATURED_PROFILE_SMOKE_ID=' + smokeId);
    
    // 1. getFeaturedProfileById
    var fbById = await firebaseRepo.getFeaturedProfileById(smokeId);
    var pgById = await postgresRepo.getFeaturedProfileById(smokeId);
    var fbByIdFound = fbById !== null;
    var pgByIdFound = pgById !== null;
    console.log('  getFeaturedProfileById - firebase: ' + (fbByIdFound ? 'found' : 'not found'));
    console.log('  getFeaturedProfileById - postgres: ' + (pgByIdFound ? 'found' : 'not found'));
    if (fbByIdFound && pgByIdFound) {
      var fbByIdStr = stableStringify(fbById);
      var pgByIdStr = stableStringify(pgById);
      if (fbByIdStr === pgByIdStr) {
        console.log('  getFeaturedProfileById: MATCH');
      } else {
        console.log('  getFeaturedProfileById: DIFFERENT');
        console.log('    Firebase keys: ' + Object.keys(fbById).sort().join(', '));
        console.log('    Postgres keys: ' + Object.keys(pgById).sort().join(', '));
        console.log('    Firebase: ' + JSON.stringify(fbById));
        console.log('    Postgres: ' + JSON.stringify(pgById));
        different.push({ id: smokeId + ' (byId)', firebase: fbById, postgres: pgById });
      }
    } else {
      different.push({ id: smokeId + ' (byId)', firebase: fbById, postgres: pgById });
    }

    // 2. getFeaturedProfilesPage
    var fbPageResult = await firebaseRepo.getFeaturedProfilesPage(1, 100);
    var pgPageResult = await postgresRepo.getFeaturedProfilesPage(1, 100);
    var fbPageProfile = fbPageResult.profiles.find(p => p.id === smokeId);
    var pgPageProfile = pgPageResult.profiles.find(p => p.id === smokeId);
    var fbPageFound = !!fbPageProfile;
    var pgPageFound = !!pgPageProfile;
    console.log('  getFeaturedProfilesPage - firebase: ' + (fbPageFound ? 'found' : 'not found'));
    console.log('  getFeaturedProfilesPage - postgres: ' + (pgPageFound ? 'found' : 'not found'));
    if (fbPageFound && pgPageFound) {
      var fbPageStr = stableStringify(fbPageProfile);
      var pgPageStr = stableStringify(pgPageProfile);
      if (fbPageStr === pgPageStr) {
        console.log('  getFeaturedProfilesPage: MATCH');
      } else {
        console.log('  getFeaturedProfilesPage: DIFFERENT');
        console.log('    Firebase keys: ' + Object.keys(fbPageProfile).sort().join(', '));
        console.log('    Postgres keys: ' + Object.keys(pgPageProfile).sort().join(', '));
        console.log('    Firebase: ' + JSON.stringify(fbPageProfile));
        console.log('    Postgres: ' + JSON.stringify(pgPageProfile));
        different.push({ id: smokeId + ' (page)', firebase: fbPageProfile, postgres: pgPageProfile });
      }
    } else {
      different.push({ id: smokeId + ' (page)', firebase: fbPageProfile, postgres: pgPageProfile });
    }

    // 3. getFeaturedProfilesByIds
    var fbByIds = await firebaseRepo.getFeaturedProfilesByIds([smokeId]);
    var pgByIds = await postgresRepo.getFeaturedProfilesByIds([smokeId]);
    var fbByIdsProfile = fbByIds.find(p => p.id === smokeId);
    var pgByIdsProfile = pgByIds.find(p => p.id === smokeId);
    var fbByIdsFound = !!fbByIdsProfile;
    var pgByIdsFound = !!pgByIdsProfile;
    console.log('  getFeaturedProfilesByIds - firebase: ' + (fbByIdsFound ? 'found' : 'not found'));
    console.log('  getFeaturedProfilesByIds - postgres: ' + (pgByIdsFound ? 'found' : 'not found'));
    if (fbByIdsFound && pgByIdsFound) {
      var fbByIdsStr = stableStringify(fbByIdsProfile);
      var pgByIdsStr = stableStringify(pgByIdsProfile);
      if (fbByIdsStr === pgByIdsStr) {
        console.log('  getFeaturedProfilesByIds: MATCH');
      } else {
        console.log('  getFeaturedProfilesByIds: DIFFERENT');
        console.log('    Firebase keys: ' + Object.keys(fbByIdsProfile).sort().join(', '));
        console.log('    Postgres keys: ' + Object.keys(pgByIdsProfile).sort().join(', '));
        console.log('    Firebase: ' + JSON.stringify(fbByIdsProfile));
        console.log('    Postgres: ' + JSON.stringify(pgByIdsProfile));
        different.push({ id: smokeId + ' (byIds)', firebase: fbByIdsProfile, postgres: pgByIdsProfile });
      }
    } else {
      different.push({ id: smokeId + ' (byIds)', firebase: fbByIdsProfile, postgres: pgByIdsProfile });
    }

    // 4. getFeaturedProfilesDataByIds
    var fbDataByIds = await firebaseRepo.getFeaturedProfilesDataByIds([smokeId]);
    var pgDataByIds = await postgresRepo.getFeaturedProfilesDataByIds([smokeId]);
    var fbDataByIdsProfile = fbDataByIds.find(p => p.id === smokeId);
    var pgDataByIdsProfile = pgDataByIds.find(p => p.id === smokeId);
    var fbDataByIdsFound = !!fbDataByIdsProfile;
    var pgDataByIdsFound = !!pgDataByIdsProfile;
    console.log('  getFeaturedProfilesDataByIds - firebase: ' + (fbDataByIdsFound ? 'found' : 'not found'));
    console.log('  getFeaturedProfilesDataByIds - postgres: ' + (pgDataByIdsFound ? 'found' : 'not found'));
    if (fbDataByIdsFound && pgDataByIdsFound) {
      var fbDataByIdsStr = stableStringify(fbDataByIdsProfile);
      var pgDataByIdsStr = stableStringify(pgDataByIdsProfile);
      if (fbDataByIdsStr === pgDataByIdsStr) {
        console.log('  getFeaturedProfilesDataByIds: MATCH');
      } else {
        console.log('  getFeaturedProfilesDataByIds: DIFFERENT');
        console.log('    Firebase keys: ' + Object.keys(fbDataByIdsProfile).sort().join(', '));
        console.log('    Postgres keys: ' + Object.keys(pgDataByIdsProfile).sort().join(', '));
        console.log('    Firebase: ' + JSON.stringify(fbDataByIdsProfile));
        console.log('    Postgres: ' + JSON.stringify(pgDataByIdsProfile));
        different.push({ id: smokeId + ' (dataByIds)', firebase: fbDataByIdsProfile, postgres: pgDataByIdsProfile });
      }
    } else {
      different.push({ id: smokeId + ' (dataByIds)', firebase: fbDataByIdsProfile, postgres: pgDataByIdsProfile });
    }
  }

  var hasDiff = missingInPostgres.length > 0 || missingInFirebase.length > 0 || different.length > 0;
  if (hasDiff) {
    process.exit(1);
  }
}

compare().catch(function(err) {
  console.error('Compare failed: ' + err.message);
  process.exit(1);
});
