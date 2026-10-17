-- ─────────────────────────────────────────────────────────────────────────────
-- V17: Add plays & likes columns to snippets, plus snippet_likes join table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE snippets ADD COLUMN IF NOT EXISTS plays INTEGER NOT NULL DEFAULT 0;
ALTER TABLE snippets ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_snippets_plays ON snippets (plays DESC);
CREATE INDEX IF NOT EXISTS idx_snippets_likes ON snippets (likes DESC);

CREATE TABLE IF NOT EXISTS snippet_likes (
    snippet_id UUID NOT NULL REFERENCES snippets (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users    (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (snippet_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_snippet_likes_user ON snippet_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_snippet_likes_created ON snippet_likes (created_at DESC);
