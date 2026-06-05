// scripts/cleanup.firebase-urls.js
// Script to scan, report, and safely clean up Firebase Storage URLs in PostgreSQL database tables (events, user_profiles, event_media).

require('dotenv').config();
const { query, getPool, transaction } = require('../src/providers/database/postgres.client');

const FIREBASE_URL_PATTERN = 'firebasestorage.googleapis.com';

async function scanEvents() {
  const sql = `
    SELECT id, name, image_url, banner_url, video_url 
    FROM events 
    WHERE image_url LIKE $1 OR banner_url LIKE $1 OR video_url LIKE $1
  `;
  const result = await query(sql, [`%${FIREBASE_URL_PATTERN}%`]);
  return result.rows.map(row => {
    const matchedFields = [];
    if (row.image_url && row.image_url.includes(FIREBASE_URL_PATTERN)) matchedFields.push({ field: 'image_url', url: row.image_url });
    if (row.banner_url && row.banner_url.includes(FIREBASE_URL_PATTERN)) matchedFields.push({ field: 'banner_url', url: row.banner_url });
    if (row.video_url && row.video_url.includes(FIREBASE_URL_PATTERN)) matchedFields.push({ field: 'video_url', url: row.video_url });
    return { id: row.id, name: row.name, matchedFields };
  });
}

async function scanUserProfiles() {
  const sql = `
    SELECT id, email, name, profile_pic_url, cover_photo_url, shared_media 
    FROM user_profiles 
    WHERE profile_pic_url LIKE $1 OR cover_photo_url LIKE $1 OR shared_media::text LIKE $1
  `;
  const result = await query(sql, [`%${FIREBASE_URL_PATTERN}%`]);
  return result.rows.map(row => {
    const matchedFields = [];
    if (row.profile_pic_url && row.profile_pic_url.includes(FIREBASE_URL_PATTERN)) matchedFields.push({ field: 'profile_pic_url', url: row.profile_pic_url });
    if (row.cover_photo_url && row.cover_photo_url.includes(FIREBASE_URL_PATTERN)) matchedFields.push({ field: 'cover_photo_url', url: row.cover_photo_url });
    
    // Scan shared_media JSONB array
    if (row.shared_media && Array.isArray(row.shared_media)) {
      row.shared_media.forEach((item, idx) => {
        if (item && item.mediaUrl && item.mediaUrl.includes(FIREBASE_URL_PATTERN)) {
          matchedFields.push({ field: `shared_media[${idx}].mediaUrl`, url: item.mediaUrl });
        }
      });
    }
    return { id: row.id, email: row.email, name: row.name, matchedFields };
  });
}

async function scanEventMedia() {
  const sql = `
    SELECT id, user_id, event_id, url 
    FROM event_media 
    WHERE url LIKE $1
  `;
  const result = await query(sql, [`%${FIREBASE_URL_PATTERN}%`]);
  return result.rows.map(row => {
    return {
      id: row.id,
      userId: row.user_id,
      eventId: row.event_id,
      matchedFields: [{ field: 'url', url: row.url }]
    };
  });
}

async function getNullableColumns(client) {
  const sql = `
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE is_nullable = 'YES' 
      AND (
        (table_name = 'events' AND column_name IN ('image_url', 'banner_url', 'video_url')) OR
        (table_name = 'user_profiles' AND column_name IN ('profile_pic_url', 'cover_photo_url')) OR
        (table_name = 'event_media' AND column_name = 'url')
      )
  `;
  const result = await client.query(sql);
  const nullableMap = {
    events: [],
    user_profiles: [],
    event_media: []
  };
  result.rows.forEach(row => {
    nullableMap[row.table_name].push(row.column_name);
  });
  return nullableMap;
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is required to run the scan/cleanup.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const isCleanup = args.includes('--cleanup');
  const applyNull = args.includes('--apply-null');

  console.log('========================================================================');
  console.log('Firebase Storage URL Scan & Safe Cleanup/Report Script');
  console.log(`Mode: ${isCleanup ? (applyNull ? 'CLEANUP (Apply Null)' : 'CLEANUP (Dry-run)') : 'REPORT (Dry-run)'}`);
  console.log('========================================================================\n');

  console.log('Scanning tables...');
  
  const [events, users, media] = await Promise.all([
    scanEvents(),
    scanUserProfiles(),
    scanEventMedia()
  ]);

  let totalMatches = 0;

  console.log(`\n--- 1. Events (Matches: ${events.length}) ---`);
  events.forEach(item => {
    console.log(`  Event ID: ${item.id} (${item.name})`);
    item.matchedFields.forEach(match => {
      console.log(`    - ${match.field}: ${match.url}`);
      totalMatches++;
    });
  });

  console.log(`\n--- 2. User Profiles (Matches: ${users.length}) ---`);
  users.forEach(item => {
    console.log(`  User ID: ${item.id} (${item.name || item.email})`);
    item.matchedFields.forEach(match => {
      console.log(`    - ${match.field}: ${match.url}`);
      totalMatches++;
    });
  });

  console.log(`\n--- 3. Event Media (Matches: ${media.length}) ---`);
  media.forEach(item => {
    console.log(`  Media ID: ${item.id} (Event: ${item.eventId}, User: ${item.userId})`);
    item.matchedFields.forEach(match => {
      console.log(`    - ${match.field}: ${match.url}`);
      totalMatches++;
    });
  });

  console.log('\n========================================================================');
  console.log(`Scan completed. Found ${totalMatches} total Firebase Storage URL references.`);
  console.log('========================================================================\n');

  if (isCleanup) {
    if (applyNull) {
      console.log('Cleanup Action Requested (Apply Null)...');
      try {
        const counts = await transaction(async (client) => {
          const nullableMap = await getNullableColumns(client);
          
          const updateCounts = {
            events: { rowCount: 0, columns: { image_url: 0, banner_url: 0, video_url: 0 } },
            user_profiles: { rowCount: 0, columns: { profile_pic_url: 0, cover_photo_url: 0 } },
            event_media: { rowCount: 0, columns: { url: 0 } }
          };

          // Update events
          const eventsColsToNullify = nullableMap.events;
          if (eventsColsToNullify.length > 0) {
            const setClauses = eventsColsToNullify.map(col => `"${col}" = CASE WHEN "${col}" LIKE $1 THEN NULL ELSE "${col}" END`).join(', ');
            const whereClause = eventsColsToNullify.map(col => `"${col}" LIKE $1`).join(' OR ');
            
            const sql = `UPDATE events SET ${setClauses} WHERE ${whereClause} RETURNING id, ${eventsColsToNullify.map(col => `"${col}"`).join(', ')}`;
            const res = await client.query(sql, [`%${FIREBASE_URL_PATTERN}%`]);
            
            updateCounts.events.rowCount = res.rowCount;
            res.rows.forEach(row => {
              eventsColsToNullify.forEach(col => {
                if (row[col] === null) {
                  updateCounts.events.columns[col] = (updateCounts.events.columns[col] || 0) + 1;
                }
              });
            });
          }

          // Update user_profiles
          const userColsToNullify = nullableMap.user_profiles;
          if (userColsToNullify.length > 0) {
            const setClauses = userColsToNullify.map(col => `"${col}" = CASE WHEN "${col}" LIKE $1 THEN NULL ELSE "${col}" END`).join(', ');
            const whereClause = userColsToNullify.map(col => `"${col}" LIKE $1`).join(' OR ');
            
            const sql = `UPDATE user_profiles SET ${setClauses} WHERE ${whereClause} RETURNING id, ${userColsToNullify.map(col => `"${col}"`).join(', ')}`;
            const res = await client.query(sql, [`%${FIREBASE_URL_PATTERN}%`]);
            
            updateCounts.user_profiles.rowCount = res.rowCount;
            res.rows.forEach(row => {
              userColsToNullify.forEach(col => {
                if (row[col] === null) {
                  updateCounts.user_profiles.columns[col] = (updateCounts.user_profiles.columns[col] || 0) + 1;
                }
              });
            });
          }

          // Update event_media
          const mediaColsToNullify = nullableMap.event_media;
          if (mediaColsToNullify.length > 0) {
            const setClauses = mediaColsToNullify.map(col => `"${col}" = CASE WHEN "${col}" LIKE $1 THEN NULL ELSE "${col}" END`).join(', ');
            const whereClause = mediaColsToNullify.map(col => `"${col}" LIKE $1`).join(' OR ');
            
            const sql = `UPDATE event_media SET ${setClauses} WHERE ${whereClause} RETURNING id, ${mediaColsToNullify.map(col => `"${col}"`).join(', ')}`;
            const res = await client.query(sql, [`%${FIREBASE_URL_PATTERN}%`]);
            
            updateCounts.event_media.rowCount = res.rowCount;
            res.rows.forEach(row => {
              mediaColsToNullify.forEach(col => {
                if (row[col] === null) {
                  updateCounts.event_media.columns[col] = (updateCounts.event_media.columns[col] || 0) + 1;
                }
              });
            });
          }

          return { updateCounts, nullableMap };
        });

        console.log('SUCCESS: PostgreSQL transaction committed successfully.');
        console.log('\n========================================================================');
        console.log('CLEANUP RESULTS (NULLIFIED FIELDS)');
        console.log('========================================================================');
        console.log('events:');
        console.log(`  - Total Rows Updated: ${counts.updateCounts.events.rowCount}`);
        Object.entries(counts.updateCounts.events.columns).forEach(([col, count]) => {
          console.log(`  - Column "${col}": ${count} fields set to NULL`);
        });
        if (counts.nullableMap.events.length < 3) {
          const skipped = ['image_url', 'banner_url', 'video_url'].filter(c => !counts.nullableMap.events.includes(c));
          console.log(`  - (Skipped non-nullable or missing columns: ${skipped.join(', ')})`);
        }

        console.log('user_profiles:');
        console.log(`  - Total Rows Updated: ${counts.updateCounts.user_profiles.rowCount}`);
        Object.entries(counts.updateCounts.user_profiles.columns).forEach(([col, count]) => {
          console.log(`  - Column "${col}": ${count} fields set to NULL`);
        });
        if (counts.nullableMap.user_profiles.length < 2) {
          const skipped = ['profile_pic_url', 'cover_photo_url'].filter(c => !counts.nullableMap.user_profiles.includes(c));
          console.log(`  - (Skipped non-nullable or missing columns: ${skipped.join(', ')})`);
        }

        console.log('event_media:');
        console.log(`  - Total Rows Updated: ${counts.updateCounts.event_media.rowCount}`);
        Object.entries(counts.updateCounts.event_media.columns).forEach(([col, count]) => {
          console.log(`  - Column "${col}": ${count} fields set to NULL`);
        });
        if (counts.nullableMap.event_media.length < 1) {
          const skipped = ['url'].filter(c => !counts.nullableMap.event_media.includes(c));
          console.log(`  - (Skipped non-nullable columns: ${skipped.join(', ')})`);
        }
        console.log('========================================================================\n');

      } catch (transactionError) {
        console.error('FATAL: Database transaction failed and was rolled back.', transactionError);
        process.exitCode = 1;
      }
    } else {
      console.log('Cleanup Action Requested...');
      console.log('WARNING: Destructive conversion (deleting or nullifying URLs) is unsafe because it will cause broken image/video assets in the application.');
      console.log('No safe replacement base URL/mapping is provided, so we default to a safe NO-OP.');
      console.log('No database records were modified. Existing URLs have been preserved.');
      console.log('To safely migrate, please upload these assets to the new local/S3 storage provider and run an update query mapping the old URLs to the new ones.');
      console.log('\nTo apply NULL conversion for nullable columns, run with: --cleanup --apply-null');
    }
  } else {
    console.log('To request cleanup, run with the --cleanup flag.');
    console.log('Note: Destructive conversion is unsafe and will default to a report/no-op to prevent data loss.');
  }

  // Close the DB pool
  const pool = getPool();
  if (pool) {
    await pool.end();
  }
}

run().catch(err => {
  console.error('An error occurred during scan/cleanup execution:', err);
  process.exitCode = 1;
});
