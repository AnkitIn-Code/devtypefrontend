-- =============================================================================
-- V16__fix_duplicate_achievements.sql
--
-- Problem: V3 and V15 both insert SPEED_100 and SESSIONS_500 with different
-- UUIDs. ON CONFLICT DO NOTHING means V3 rows survive, but if user_achievements
-- somehow reference a stale or duplicate UUID, those links break.
--
-- Fix:
-- 1. For each duplicate code, find all achievement UUIDs.
-- 2. Pick the canonical one (the UUID that has the most user_achievement refs).
-- 3. Reassign all user_achievement rows pointing to non-canonical duplicates.
-- 4. Delete the orphan duplicate achievement rows.
-- =============================================================================

DO $$
DECLARE
  dup_code TEXT;
  canonical_id UUID;
  dup_id UUID;
BEGIN
  FOR dup_code IN
    SELECT code FROM achievements GROUP BY code HAVING COUNT(*) > 1
  LOOP
    SELECT a.id INTO canonical_id
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id
    WHERE a.code = dup_code
    GROUP BY a.id
    ORDER BY COUNT(ua.id) DESC, a.id ASC
    LIMIT 1;

    FOR dup_id IN
      SELECT id FROM achievements WHERE code = dup_code AND id <> canonical_id
    LOOP
      UPDATE user_achievements
        SET achievement_id = canonical_id
        WHERE achievement_id = dup_id
          AND NOT EXISTS (
            SELECT 1 FROM user_achievements ua2
            WHERE ua2.achievement_id = canonical_id
              AND ua2.user_id = user_achievements.user_id
          );

      DELETE FROM user_achievements WHERE achievement_id = dup_id;
      DELETE FROM achievements WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;
