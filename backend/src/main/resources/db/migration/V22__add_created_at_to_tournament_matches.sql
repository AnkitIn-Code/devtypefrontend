-- Migration V22: Add created_at column to tournament_matches table (NEW-CRIT-02 / FEAT-M08)
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
