-- V9: User preferences / settings JSONB column
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB;

COMMENT ON COLUMN users.settings IS
  'JSON object containing user preferences (theme, fontSize, soundVolume, showLiveWpm, etc.)';
