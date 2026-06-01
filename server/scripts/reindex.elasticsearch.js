require('dotenv').config();

const esClient = require('../config/elasticsearch.config');
const { query } = require('../providers/database/postgres.client');
const featuredProfileRepository = require('../providers/database/featuredProfile.repository');

const ELASTIC_INDEX = 'events';

function rowToEvent(row) {
  if (!row) return null;
  if (row.raw_data) {
    return { id: row.id, ...row.raw_data };
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    imageUrl: row.image_url || null,
    bannerUrl: row.banner_url || null,
    featuredProfileIds: row.featured_profile_ids || [],
    category: row.category || [],
    tags: row.tags || [],
    date: row.date != null ? Number(row.date) : null,
    eventType: row.event_type || 'physical',
    location: row.location || null,
    venueName: row.venue_name || null,
    city: row.city || null,
    minPrice: row.min_price != null ? Number(row.min_price) : 0,
    videoUrl: row.video_url || '',
    status: row.status || 'pending',
    visibility: row.visibility || 'private',
  };
}

async function buildElasticData(eventData) {
  let featuredProfileNames = [];
  if (eventData.featuredProfileIds && eventData.featuredProfileIds.length > 0) {
    try {
      featuredProfileNames = await featuredProfileRepository.getFeaturedProfileNamesByIds(eventData.featuredProfileIds);
    } catch (error) {
      console.error(`Failed to load featured profile names for event ${eventData.id}:`, error.message || error);
    }
  }

  const data = {
    name: eventData.name || null,
    description: eventData.description || null,
    tags: eventData.tags || [],
    city: eventData.city || null,
    category: eventData.category || [],
    minPrice: eventData.minPrice !== undefined ? eventData.minPrice : null,
    date: eventData.date || null,
    featuredProfileIds: eventData.featuredProfileIds || [],
    featuredProfileNames,
    status: eventData.status || null,
    visibility: eventData.visibility || null,
    imageUrl: eventData.imageUrl || null,
    bannerUrl: eventData.bannerUrl || null,
    videoUrl: eventData.videoUrl || null,
    location: eventData.location || null,
    venueName: eventData.venueName || null,
    eventType: eventData.eventType || null,
  };

  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) data[key] = null;
  });
  return data;
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to rebuild the Elasticsearch index.');
  }
  if (!esClient) {
    throw new Error('ELASTIC_NODE_URL is required to rebuild the Elasticsearch index.');
  }

  await esClient.indices.delete({ index: ELASTIC_INDEX, ignore_unavailable: true });
  await esClient.indices.create({ index: ELASTIC_INDEX });

  const result = await query(
    "SELECT * FROM events WHERE status = 'active' AND visibility = 'public' ORDER BY date ASC"
  );

  if (result.rows.length === 0) {
    console.log('No active public events found. Elasticsearch index created empty.');
    return;
  }

  const operations = [];
  for (const row of result.rows) {
    const eventData = rowToEvent(row);
    const document = await buildElasticData(eventData);
    operations.push({ index: { _index: ELASTIC_INDEX, _id: row.id } });
    operations.push(document);
  }

  const response = await esClient.bulk({ refresh: true, operations });
  if (response.errors) {
    const failures = response.items
      .filter((item) => item.index && item.index.error)
      .slice(0, 5)
      .map((item) => item.index.error);
    throw new Error(`Elasticsearch bulk index failed: ${JSON.stringify(failures)}`);
  }

  console.log(`Reindexed ${result.rows.length} events into Elasticsearch index "${ELASTIC_INDEX}".`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
