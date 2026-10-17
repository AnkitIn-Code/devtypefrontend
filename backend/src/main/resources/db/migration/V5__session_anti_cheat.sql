-- =============================================================================
-- V5__session_anti_cheat.sql
-- Add is_suspicious flag to typing_sessions for server-side anti-cheat audit
-- =============================================================================

ALTER TABLE typing_sessions
ADD COLUMN is_suspicious BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_ts_suspicious ON typing_sessions (is_suspicious) WHERE is_suspicious = TRUE;
