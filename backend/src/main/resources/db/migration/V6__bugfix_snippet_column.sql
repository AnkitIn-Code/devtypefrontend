-- V6: Add buggy_code column to snippets for BUG_FIX game mode
-- The buggyCode field stores an intentionally-incorrect version of the snippet
-- that players must type to correct. Null for non-BUG_FIX snippets.

ALTER TABLE snippets ADD COLUMN IF NOT EXISTS buggy_code TEXT;

COMMENT ON COLUMN snippets.buggy_code IS
  'Intentionally buggy version of code used in BUG_FIX multiplayer mode. NULL for regular snippets.';
