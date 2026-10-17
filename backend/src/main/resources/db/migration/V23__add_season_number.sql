-- V23: Add season_number column to seasons table and back-fill the initial season.
-- Fixes B-04: season_number was null in the initial seed row, causing the frontend
-- to silently fall back to displaying "#1" via a || 1 fallback.

ALTER TABLE seasons
    ADD COLUMN IF NOT EXISTS season_number INTEGER;

-- Back-fill the first (and currently only) active season
UPDATE seasons
SET    season_number = 1
WHERE  season_number IS NULL
  AND  name ILIKE '%genesis%';

-- Generic fallback: number any remaining rows that have no season_number
-- by their insertion order (oldest first)
WITH ordered AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY start_date ASC) AS rn
    FROM   seasons
    WHERE  season_number IS NULL
)
UPDATE seasons s
SET    season_number = o.rn
FROM   ordered o
WHERE  s.id = o.id;
