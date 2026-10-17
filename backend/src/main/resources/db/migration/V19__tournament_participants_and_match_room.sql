-- Part 3: BUG-C07 / FEAT-S06 — Tournament participant registration
-- FEAT-M08 — Link tournament matches to their duel room

-- FEAT-S06: proper join table so tournaments are seeded from actual registrants,
-- not from an arbitrary global slice of users (BUG-C07 fix).
CREATE TABLE tournament_participants (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID         NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id       UUID         NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    registered_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tournament_id, user_id)   -- prevent double-registration
);

-- FEAT-M08: nullable FK that ties a TournamentMatch to the MultiplayerRoom that
-- was created for it as a DUEL, so match results flow through MatchPersistenceService.
ALTER TABLE tournament_matches
    ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES multiplayer_rooms(id);
