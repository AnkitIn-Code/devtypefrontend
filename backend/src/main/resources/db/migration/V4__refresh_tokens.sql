-- =============================================================================
-- V4__refresh_tokens.sql
-- Hashed refresh token store for JWT revocation on logout
--
-- Design:
--   • token_hash stores BCrypt hash of the raw refresh token — raw token
--     never persisted, same as password hashing.
--   • One user can hold multiple active tokens (multi-device login).
--   • Logout revokes by setting is_revoked = true (soft revoke) so expired
--     tokens can be cleaned up in a scheduled job rather than blocking logout.
--   • expires_at enables index-based cleanup of stale tokens.
-- =============================================================================

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,   -- BCrypt hash of raw token
    is_revoked  BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rt_user_id    ON refresh_tokens (user_id);
CREATE INDEX idx_rt_expires    ON refresh_tokens (expires_at);
CREATE INDEX idx_rt_revoked    ON refresh_tokens (is_revoked) WHERE is_revoked = FALSE;
