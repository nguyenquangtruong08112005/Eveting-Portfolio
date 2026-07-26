-- Normalize demo event categories to canonical keys for search compatibility.
-- Each canonical category (music, arts, sports, workshop, nightlife, tech) must
-- return >=10 future public published events. Overlap: music doubles as nightlife,
-- workshop doubles as tech, theater and exhibition roll into arts.
-- Touches only demo_evt_ rows.
UPDATE events SET
  category = CASE
    WHEN id LIKE 'demo_evt_music_%'       THEN ARRAY['music', 'nightlife']
    WHEN id LIKE 'demo_evt_theater_%'     THEN ARRAY['arts', 'theater']
    WHEN id LIKE 'demo_evt_workshop_%'    THEN ARRAY['workshop', 'tech']
    WHEN id LIKE 'demo_evt_sports_%'      THEN ARRAY['sports']
    WHEN id LIKE 'demo_evt_exhibition_%'  THEN ARRAY['arts', 'exhibition']
    ELSE category
  END,
  last_updated_at = NOW()
WHERE id LIKE 'demo_evt_%' AND deleted_at IS NULL;
