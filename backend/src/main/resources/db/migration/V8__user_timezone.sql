-- V8: Add timezone field to users for timezone-aware streak calculation
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'UTC';

COMMENT ON COLUMN users.timezone IS
  'IANA timezone identifier (e.g. Asia/Kolkata, America/New_York). '
  'Used by StreakService to determine the user''s local calendar day.';
