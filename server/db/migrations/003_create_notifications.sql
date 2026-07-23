CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    type        TEXT NOT NULL,
    event_id    TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc ON notifications (created_at DESC);
