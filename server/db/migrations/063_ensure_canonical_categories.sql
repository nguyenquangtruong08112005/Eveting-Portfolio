-- Ensure all active events have canonical category keys.
-- Idempotent: only appends canonical keys when the array contains matching
-- aliases but is missing the canonical value. Does not touch real events that
-- already have proper categories or events that were deliberately tagged with
-- non-standard categories.
--
-- Canonical mapping (mirrors web/src/lib/constants.ts CATEGORIES):
--   music:     concert, edm, pop, hip-hop, v-pop, show
--   arts:      art, exhibition, culture, museum, fashion, theater, theatre
--   sports:    sport, marathon, running, fitness, yoga, wellness
--   workshop:  conference, expo, business, networking, education, seminar
--   nightlife: dj, club, party, festival, bar
--   tech:      technology, esports, gaming, online

BEGIN;

UPDATE events SET
  category = CASE
    WHEN NOT (category @> ARRAY['music']::text[])
         AND category && ARRAY['concert','edm','pop','hip-hop','v-pop','show']::text[]
    THEN array_append(category, 'music')
    ELSE category
  END,
  last_updated_at = NOW()
WHERE deleted_at IS NULL;

UPDATE events SET
  category = CASE
    WHEN NOT (category @> ARRAY['arts']::text[])
         AND category && ARRAY['art','exhibition','culture','museum','fashion','theater','theatre']::text[]
    THEN array_append(category, 'arts')
    ELSE category
  END,
  last_updated_at = NOW()
WHERE deleted_at IS NULL;

UPDATE events SET
  category = CASE
    WHEN NOT (category @> ARRAY['sports']::text[])
         AND category && ARRAY['sport','marathon','running','fitness','yoga','wellness']::text[]
    THEN array_append(category, 'sports')
    ELSE category
  END,
  last_updated_at = NOW()
WHERE deleted_at IS NULL;

UPDATE events SET
  category = CASE
    WHEN NOT (category @> ARRAY['workshop']::text[])
         AND category && ARRAY['conference','expo','business','networking','education','seminar']::text[]
    THEN array_append(category, 'workshop')
    ELSE category
  END,
  last_updated_at = NOW()
WHERE deleted_at IS NULL;

UPDATE events SET
  category = CASE
    WHEN NOT (category @> ARRAY['nightlife']::text[])
         AND category && ARRAY['dj','club','party','festival','bar']::text[]
    THEN array_append(category, 'nightlife')
    ELSE category
  END,
  last_updated_at = NOW()
WHERE deleted_at IS NULL;

UPDATE events SET
  category = CASE
    WHEN NOT (category @> ARRAY['tech']::text[])
         AND category && ARRAY['technology','esports','gaming','online']::text[]
    THEN array_append(category, 'tech')
    ELSE category
  END,
  last_updated_at = NOW()
WHERE deleted_at IS NULL;

COMMIT;
