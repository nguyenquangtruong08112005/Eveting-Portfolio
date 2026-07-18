-- Migration: 050_user_roles
-- W2: relational roles (authz SoT); keep auth_users.roles as cache synced by app/trigger.

CREATE TABLE IF NOT EXISTS user_roles (
  user_id    TEXT NOT NULL,
  role_id    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_user_id') THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT fk_user_roles_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_role_id') THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT fk_user_roles_role_id
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure role catalog rows exist for common auth roles (match by name if id differs)
INSERT INTO roles (id, name, description, created_at)
SELECT v.id, v.name, v.description, NOW()
FROM (VALUES
  ('role_user', 'user', 'Default attendee/user'),
  ('role_organizer', 'organizer', 'Event organizer'),
  ('role_admin', 'admin', 'Platform admin')
) AS v(id, name, description)
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.name = v.name OR r.id = v.id);

-- Seed user_roles from auth_users.roles arrays (resolve role id by name)
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT u.id, roles.id, NOW()
FROM auth_users u
CROSS JOIN LATERAL unnest(COALESCE(u.roles, ARRAY['user']::text[])) AS role_name
JOIN roles ON roles.name = CASE
  WHEN role_name IN ('user','attendee') THEN 'user'
  WHEN role_name = 'organizer' THEN 'organizer'
  WHEN role_name = 'admin' THEN 'admin'
  ELSE 'user'
END
ON CONFLICT DO NOTHING;
