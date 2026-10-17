-- =============================================================================
-- V11__session_wpm_history.sql
-- Add wpm_history JSONB column to typing_sessions.
--
-- The TypingSession entity declares a wpm_history field mapped as JSONB,
-- but no prior migration added this column — causing 500 errors on any
-- JPA query that touches the typing_sessions table (including /api/users/me).
-- =============================================================================

ALTER TABLE typing_sessions
    ADD COLUMN IF NOT EXISTS wpm_history JSONB;

COMMENT ON COLUMN typing_sessions.wpm_history IS
    'Per-second WPM snapshots recorded during the session, stored as a JSON array of {t, wpm} objects.';
