-- Add language and snippet_title to typing_sessions table
ALTER TABLE typing_sessions ADD COLUMN IF NOT EXISTS language VARCHAR(50);
ALTER TABLE typing_sessions ADD COLUMN IF NOT EXISTS snippet_title VARCHAR(255);

-- Backfill existing sessions with snippet data
UPDATE typing_sessions ts
SET language = COALESCE(s.language, 'cpp'),
    snippet_title = COALESCE(s.title, 'Practice Session')
FROM snippets s
WHERE ts.snippet_id = s.id AND (ts.language IS NULL OR ts.language = 'mixed');

-- Set default for any remaining orphan sessions
UPDATE typing_sessions
SET language = 'cpp',
    snippet_title = 'Practice Session'
WHERE language IS NULL OR language = 'mixed';
