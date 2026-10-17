-- =============================================================================
-- V2__core_tables.sql
-- DevType / CodeType AI — Full Schema
--
-- Conventions:
--   • All PKs use UUID (gen_random_uuid()) for distributed safety
--   • Timestamps are TIMESTAMPTZ (UTC-aware)
--   • Enums stored as VARCHAR with CHECK constraints (easier to evolve)
--   • Tags stored in a join table (snippet_tags) for clean JPA mapping
--   • Soft cascade: user deletion cascades owned data; external refs SET NULL
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username         VARCHAR(30)  NOT NULL,
    email            VARCHAR(255) NOT NULL,
    password_hash    VARCHAR(255),               -- NULL for OAuth-only accounts
    avatar_url       TEXT,
    level            INTEGER      NOT NULL DEFAULT 1,
    xp               INTEGER      NOT NULL DEFAULT 0,
    credits          INTEGER      NOT NULL DEFAULT 0,
    current_streak   INTEGER      NOT NULL DEFAULT 0,
    longest_streak   INTEGER      NOT NULL DEFAULT 0,
    last_active_date DATE,
    country          CHAR(2),                    -- ISO 3166-1 alpha-2
    role             VARCHAR(10)  NOT NULL DEFAULT 'USER'
                         CHECK (role IN ('USER', 'ADMIN')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email    UNIQUE (email)
);

CREATE INDEX idx_users_xp       ON users (xp   DESC);
CREATE INDEX idx_users_level    ON users (level DESC);
CREATE INDEX idx_users_country  ON users (country);
CREATE INDEX idx_users_created  ON users (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. snippets
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE snippets (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID         REFERENCES users (id) ON DELETE SET NULL,
    language    VARCHAR(50)  NOT NULL,
    difficulty  VARCHAR(15)  NOT NULL
                    CHECK (difficulty IN ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT')),
    title       VARCHAR(255) NOT NULL,
    code        TEXT         NOT NULL,
    is_public   BOOLEAN      NOT NULL DEFAULT TRUE,
    source_type VARCHAR(20)  NOT NULL DEFAULT 'MANUAL'
                    CHECK (source_type IN ('MANUAL','AI_GENERATED','GITHUB_IMPORT')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snippets_author     ON snippets (author_id);
CREATE INDEX idx_snippets_language   ON snippets (language);
CREATE INDEX idx_snippets_difficulty ON snippets (difficulty);
CREATE INDEX idx_snippets_public     ON snippets (is_public);
CREATE INDEX idx_snippets_created    ON snippets (created_at DESC);

-- Tags as a join table (clean JPA @ElementCollection mapping)
CREATE TABLE snippet_tags (
    snippet_id UUID        NOT NULL REFERENCES snippets (id) ON DELETE CASCADE,
    tag        VARCHAR(50) NOT NULL,
    PRIMARY KEY (snippet_id, tag)
);

CREATE INDEX idx_snippet_tags_tag ON snippet_tags (tag);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. typing_sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE typing_sessions (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID          NOT NULL REFERENCES users    (id) ON DELETE CASCADE,
    snippet_id  UUID          REFERENCES snippets (id) ON DELETE SET NULL,
    wpm         INTEGER       NOT NULL,
    raw_wpm     INTEGER       NOT NULL,
    accuracy    NUMERIC(5,2)  NOT NULL,   -- e.g. 98.45 (max 100.00)
    error_count INTEGER       NOT NULL DEFAULT 0,
    duration_ms INTEGER       NOT NULL,
    xp_earned   INTEGER       NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ts_user_id    ON typing_sessions (user_id);
CREATE INDEX idx_ts_snippet_id ON typing_sessions (snippet_id);
CREATE INDEX idx_ts_wpm        ON typing_sessions (wpm DESC);
CREATE INDEX idx_ts_created    ON typing_sessions (created_at DESC);
-- Composite: user history sorted by date
CREATE INDEX idx_ts_user_date  ON typing_sessions (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. session_error_events  (heatmap / per-position analytics)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE session_error_events (
    id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID    NOT NULL REFERENCES typing_sessions (id) ON DELETE CASCADE,
    character_expected CHAR(1) NOT NULL,
    character_typed    CHAR(1) NOT NULL,
    position_index     INTEGER NOT NULL,
    timestamp_ms       INTEGER NOT NULL   -- ms elapsed from session start
);

CREATE INDEX idx_see_session_id ON session_error_events (session_id);
-- Analytics: aggregate errors per expected character
CREATE INDEX idx_see_char       ON session_error_events (character_expected);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. achievements
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE achievements (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code           VARCHAR(50)  NOT NULL,
    name           VARCHAR(100) NOT NULL,
    description    TEXT         NOT NULL,
    icon_url       TEXT,
    xp_reward      INTEGER      NOT NULL DEFAULT 0,
    criteria_type  VARCHAR(50)  NOT NULL,   -- e.g. WPM_REACHED, SESSIONS_COMPLETED
    criteria_value INTEGER      NOT NULL DEFAULT 0,

    CONSTRAINT uq_achievements_code UNIQUE (code)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. user_achievements
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_achievements (
    user_id        UUID        NOT NULL REFERENCES users        (id) ON DELETE CASCADE,
    achievement_id UUID        NOT NULL REFERENCES achievements (id) ON DELETE CASCADE,
    unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_ua_user_id        ON user_achievements (user_id);
CREATE INDEX idx_ua_achievement_id ON user_achievements (achievement_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. multiplayer_rooms
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE multiplayer_rooms (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code         VARCHAR(10) NOT NULL,
    mode         VARCHAR(15) NOT NULL
                     CHECK (mode IN ('CLASSIC_RACE','DUEL','BATTLE_ROYALE','RELAY','GHOST','BOSS_FIGHT','BUG_FIX')),
    status       VARCHAR(15) NOT NULL DEFAULT 'WAITING'
                     CHECK (status IN ('WAITING','IN_PROGRESS','FINISHED')),
    snippet_id   UUID        REFERENCES snippets (id) ON DELETE SET NULL,
    host_user_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    max_players  INTEGER     NOT NULL DEFAULT 8,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_rooms_code UNIQUE (code)
);

CREATE INDEX idx_rooms_status  ON multiplayer_rooms (status);
CREATE INDEX idx_rooms_host    ON multiplayer_rooms (host_user_id);
CREATE INDEX idx_rooms_created ON multiplayer_rooms (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. match_participants
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE match_participants (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id              UUID          NOT NULL REFERENCES multiplayer_rooms (id) ON DELETE CASCADE,
    user_id              UUID          REFERENCES users (id) ON DELETE SET NULL,  -- NULL = AI bot
    progress_percent     NUMERIC(5,2)  NOT NULL DEFAULT 0,
    wpm                  INTEGER,
    finished_at          TIMESTAMPTZ,
    placement            INTEGER,
    eliminated_at_round  INTEGER       -- Battle Royale only
);

CREATE INDEX idx_mp_room_id ON match_participants (room_id);
CREATE INDEX idx_mp_user_id ON match_participants (user_id);
-- Prevent duplicate real-user entries per room
CREATE UNIQUE INDEX idx_mp_room_user
    ON match_participants (room_id, user_id)
    WHERE user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. duel_ratings  (Elo rating per user)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE duel_ratings (
    user_id    UUID        PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    elo_rating INTEGER     NOT NULL DEFAULT 1200,
    wins       INTEGER     NOT NULL DEFAULT 0,
    losses     INTEGER     NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dr_elo ON duel_ratings (elo_rating DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. friendships
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE friendships (
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    friend_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status     VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','ACCEPTED','BLOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, friend_id),
    CONSTRAINT ck_friendship_no_self CHECK (user_id <> friend_id)
);

CREATE INDEX idx_fs_user_id   ON friendships (user_id);
CREATE INDEX idx_fs_friend_id ON friendships (friend_id);
CREATE INDEX idx_fs_status    ON friendships (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. guilds
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE guilds (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name               VARCHAR(100) NOT NULL,
    server_external_id VARCHAR(100),   -- e.g. Discord guild ID
    owner_id           UUID         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guilds_owner    ON guilds (owner_id);
CREATE INDEX idx_guilds_external ON guilds (server_external_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. guild_members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE guild_members (
    guild_id  UUID        NOT NULL REFERENCES guilds (id) ON DELETE CASCADE,
    user_id   UUID        NOT NULL REFERENCES users  (id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (guild_id, user_id)
);

CREATE INDEX idx_gm_guild_id ON guild_members (guild_id);
CREATE INDEX idx_gm_user_id  ON guild_members (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. tournaments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE tournaments (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    guild_id     UUID         REFERENCES guilds (id) ON DELETE SET NULL,   -- NULL = open
    bracket_type VARCHAR(15)  NOT NULL
                     CHECK (bracket_type IN ('SINGLE_ELIM','DOUBLE_ELIM')),
    status       VARCHAR(15)  NOT NULL DEFAULT 'UPCOMING'
                     CHECK (status IN ('UPCOMING','IN_PROGRESS','FINISHED','CANCELLED')),
    starts_at    TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tournaments_guild    ON tournaments (guild_id);
CREATE INDEX idx_tournaments_status   ON tournaments (status);
CREATE INDEX idx_tournaments_starts   ON tournaments (starts_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. tournament_matches
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE tournament_matches (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id    UUID    NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
    round            INTEGER NOT NULL,
    participant_a_id UUID    REFERENCES users (id) ON DELETE SET NULL,
    participant_b_id UUID    REFERENCES users (id) ON DELETE SET NULL,
    winner_id        UUID    REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_tm_tournament ON tournament_matches (tournament_id);
CREATE INDEX idx_tm_round      ON tournament_matches (tournament_id, round);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. daily_challenges
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE daily_challenges (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date       DATE NOT NULL,
    snippet_id UUID NOT NULL REFERENCES snippets (id) ON DELETE CASCADE,

    CONSTRAINT uq_daily_challenge_date UNIQUE (date)
);

CREATE INDEX idx_dc_date ON daily_challenges (date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. daily_challenge_results
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE daily_challenge_results (
    user_id            UUID          NOT NULL REFERENCES users            (id) ON DELETE CASCADE,
    daily_challenge_id UUID          NOT NULL REFERENCES daily_challenges (id) ON DELETE CASCADE,
    wpm                INTEGER       NOT NULL,
    accuracy           NUMERIC(5,2)  NOT NULL,
    rank               INTEGER,
    completed_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, daily_challenge_id)
);

CREATE INDEX idx_dcr_challenge ON daily_challenge_results (daily_challenge_id);
CREATE INDEX idx_dcr_user      ON daily_challenge_results (user_id);
-- Leaderboard ordering within a daily challenge
CREATE INDEX idx_dcr_wpm       ON daily_challenge_results (daily_challenge_id, wpm DESC);
