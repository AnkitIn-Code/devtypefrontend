-- V7: Gamification schema — credit ledger, cosmetics, seasons

-- ── Credit Ledger ──────────────────────────────────────────────────────────
-- Every credit earn/spend event recorded with a human-readable reason
CREATE TABLE IF NOT EXISTS credit_ledger (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta       INTEGER     NOT NULL,          -- positive = earned, negative = spent
    reason      VARCHAR(120) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id, created_at DESC);

-- ── Cosmetics ─────────────────────────────────────────────────────────────
-- Keyboard sound packs / cursor themes; actual assets are frontend-side
CREATE TABLE IF NOT EXISTS cosmetics (
    id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key          VARCHAR(60) NOT NULL UNIQUE,  -- stable business key e.g. 'SOUND_MECHANICAL'
    name         VARCHAR(100) NOT NULL,
    type         VARCHAR(30) NOT NULL,         -- 'KEYBOARD_SOUND' | 'CURSOR_THEME'
    description  TEXT,
    metadata     JSONB,                        -- {soundFile, cursorClass, previewUrl, ...}
    credit_cost  INTEGER     NOT NULL DEFAULT 0,
    is_default   BOOLEAN     NOT NULL DEFAULT false
);

-- ── User Cosmetics (ownership) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_cosmetics (
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cosmetic_id  UUID        NOT NULL REFERENCES cosmetics(id) ON DELETE CASCADE,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, cosmetic_id)
);

-- ── Seasons ────────────────────────────────────────────────────────────────
-- Named ranked-duel seasons; ELO resets at season boundaries
CREATE TABLE IF NOT EXISTS seasons (
    id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    start_date   DATE        NOT NULL,
    end_date     DATE,
    is_active    BOOLEAN     NOT NULL DEFAULT false
);

-- ── Season History ─────────────────────────────────────────────────────────
-- Snapshot of each user's final ELO and global rank when a season ends
CREATE TABLE IF NOT EXISTS season_history (
    id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id    UUID        NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    final_elo    INTEGER     NOT NULL,
    final_rank   INTEGER,
    snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (season_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_season_history_user ON season_history(user_id, snapshotted_at DESC);

-- ── Seed: Default Cosmetics ────────────────────────────────────────────────
INSERT INTO cosmetics (key, name, type, description, metadata, credit_cost, is_default) VALUES
  ('DEFAULT_KEYS',    'Classic Keys',      'KEYBOARD_SOUND', 'Standard soft keystroke sounds',
   '{"soundFile":"classic.mp3","volume":0.4}',  0,   true),
  ('MECHANICAL',      'Mechanical Clicky', 'KEYBOARD_SOUND', 'Satisfying mechanical keyboard clicks',
   '{"soundFile":"mechanical.mp3","volume":0.5}', 200, false),
  ('TYPEWRITER',      'Vintage Typewriter','KEYBOARD_SOUND', 'Old-school typewriter clacking',
   '{"soundFile":"typewriter.mp3","volume":0.45}', 150, false),
  ('CURSOR_BEAM',     'Beam Cursor',       'CURSOR_THEME',   'Classic blinking vertical beam',
   '{"cursorClass":"cursor-beam","color":"#EAB308"}', 0, true),
  ('CURSOR_GLOW',     'Neon Glow Cursor',  'CURSOR_THEME',   'Bright neon glowing cursor',
   '{"cursorClass":"cursor-glow","color":"#22d3ee"}', 100, false)
ON CONFLICT (key) DO NOTHING;

-- ── Seed: First Season ─────────────────────────────────────────────────────
INSERT INTO seasons (name, start_date, end_date, is_active) VALUES
  ('Season 1 — Genesis', CURRENT_DATE, NULL, true)
ON CONFLICT DO NOTHING;

-- ── Seed: Achievements ────────────────────────────────────────────────────
-- 20 achievements covering all criteria types
INSERT INTO achievements (code, name, description, icon_url, xp_reward, criteria_type, criteria_value) VALUES
  ('FIRST_SESSION',       'First Keystrokes',      'Complete your first typing session',         '⌨️',  50,  'SESSIONS_COMPLETED',     1),
  ('SESSIONS_10',         'Getting Started',       'Complete 10 typing sessions',                '🔥',  100, 'SESSIONS_COMPLETED',     10),
  ('SESSIONS_50',         'Dedicated Typist',      'Complete 50 typing sessions',                '💪',  200, 'SESSIONS_COMPLETED',     50),
  ('SESSIONS_100',        'Century Club',          'Complete 100 typing sessions',               '💯',  500, 'SESSIONS_COMPLETED',     100),
  ('WPM_50',              'Speed Demon',           'Reach 50 WPM in a single session',           '⚡',  100, 'WPM_REACHED',            50),
  ('WPM_75',              'Fast Fingers',          'Reach 75 WPM in a single session',           '🏎️', 200, 'WPM_REACHED',            75),
  ('WPM_100',             'Century Typist',        'Reach 100 WPM in a single session',          '🚀',  500, 'WPM_REACHED',            100),
  ('WPM_150',             'Blazing Fast',          'Reach 150 WPM in a single session',          '⚡🔥', 1000,'WPM_REACHED',           150),
  ('PERFECT_SESSION',     'Perfectionist',         'Complete a session with 100% accuracy',      '🎯',  200, 'ACCURACY_100',           1),
  ('PERFECT_10',          'Flawless Streak',       'Complete 10 sessions with 100% accuracy',    '💎',  500, 'ACCURACY_100',           10),
  ('STREAK_3',            'On Fire',               'Maintain a 3-day practice streak',           '🔥',  100, 'STREAK_DAYS',            3),
  ('STREAK_7',            'Week Warrior',          'Maintain a 7-day practice streak',           '📅',  300, 'STREAK_DAYS',            7),
  ('STREAK_30',           'Monthly Master',        'Maintain a 30-day practice streak',          '🗓️', 1000,'STREAK_DAYS',            30),
  ('LEVEL_5',             'Rising Star',           'Reach Level 5',                              '⭐',  150, 'LEVEL_REACHED',          5),
  ('LEVEL_10',            'Seasoned Coder',        'Reach Level 10',                             '🌟',  500, 'LEVEL_REACHED',          10),
  ('LEVEL_25',            'Elite Developer',       'Reach Level 25',                             '👑',  2000,'LEVEL_REACHED',          25),
  ('TEMPLATE_CREATOR',    'Content Creator',       'Create your first code template',            '📝',  100, 'TEMPLATES_CREATED',      1),
  ('TEMPLATE_MASTER',     'Template Master',       'Create 10 code templates',                   '🗂️', 300, 'TEMPLATES_CREATED',      10),
  ('FIRST_WIN',           'Winner',                'Win your first multiplayer race',            '🏆',  200, 'MULTIPLAYER_WINS',        1),
  ('WIN_STREAK_5',        'Dominator',             'Win 5 multiplayer races',                    '👑',  500, 'MULTIPLAYER_WINS',        5),
  ('DAILY_CHALLENGER',    'Daily Challenger',      'Complete your first daily challenge',         '📆',  150, 'DAILY_CHALLENGE_COMPLETED', 1),
  ('DAILY_WEEK',          'Challenge Accepted',    'Complete 7 daily challenges',                '🎯',  500, 'DAILY_CHALLENGE_COMPLETED', 7)
ON CONFLICT (code) DO NOTHING;
