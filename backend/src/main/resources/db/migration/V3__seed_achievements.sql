-- =============================================================================
-- V3__seed_achievements.sql
-- DevType / CodeType AI — 12 Starter Achievements
--
-- criteria_type values (used by the achievement-evaluation service):
--   WPM_REACHED          — best single-session WPM >= criteria_value
--   SESSIONS_COMPLETED   — total sessions count >= criteria_value
--   ACCURACY_PERFECT     — any session with 100% accuracy
--   LANGUAGE_TOP_SCORE   — top personal WPM in a specific language (criteria_type suffix = lang)
--   LANGUAGES_MASTERED   — scored in >= criteria_value distinct languages
--   STREAK_DAYS          — current or longest streak >= criteria_value
--   DUEL_COMEBACK        — won a duel after trailing at 50% progress
--   SYMBOL_ERROR_RATE    — symbol key error rate <= criteria_value (per mille)
--   FIRST_DUEL_WIN       — won first ever duel
--   GUILD_FOUNDED        — created a guild
--   TOURNAMENT_WON       — won a tournament
--   NIGHT_OWL_SESSION    — completed a session between 00:00-04:00 local time
-- =============================================================================

INSERT INTO achievements (id, code, name, description, icon_url, xp_reward, criteria_type, criteria_value)
VALUES

-- 1. Speed demon — 100 WPM in any session
(gen_random_uuid(),
 'SPEED_100',
 '100 WPM',
 'Achieve a typing speed of 100 WPM or more in a single session.',
 '/icons/achievements/speed_100.svg',
 250,
 'WPM_REACHED',
 100),

-- 2. Veteran — 500 sessions completed
(gen_random_uuid(),
 'SESSIONS_500',
 '500 Tests Completed',
 'Complete 500 typing sessions. Consistency is the key to mastery.',
 '/icons/achievements/sessions_500.svg',
 500,
 'SESSIONS_COMPLETED',
 500),

-- 3. Perfectionist — 100% accuracy in any session
(gen_random_uuid(),
 'PERFECTIONIST',
 'Perfectionist',
 'Complete a typing session with 100% accuracy — not a single mistake.',
 '/icons/achievements/perfectionist.svg',
 300,
 'ACCURACY_PERFECT',
 100),

-- 4. Java Master — achieve top personal WPM score on a Java snippet
(gen_random_uuid(),
 'JAVA_MASTER',
 'Java Master',
 'Earn your highest WPM score ever on a Java code snippet.',
 '/icons/achievements/java_master.svg',
 150,
 'LANGUAGE_TOP_SCORE_JAVA',
 1),

-- 5. Polyglot — achieve a top score in 5 or more programming languages
(gen_random_uuid(),
 'POLYGLOT',
 'Polyglot',
 'Earn a top personal WPM score in 5 or more distinct programming languages.',
 '/icons/achievements/polyglot.svg',
 400,
 'LANGUAGES_MASTERED',
 5),

-- 6. Consistent — 30-day streak
(gen_random_uuid(),
 'STREAK_30',
 '30 Day Streak',
 'Maintain a 30-day consecutive daily practice streak.',
 '/icons/achievements/streak_30.svg',
 600,
 'STREAK_DAYS',
 30),

-- 7. Comeback Kid — win a duel after trailing
(gen_random_uuid(),
 'COMEBACK_WIN',
 'Comeback Win',
 'Win a 1v1 duel after being behind at the 50% progress mark.',
 '/icons/achievements/comeback.svg',
 200,
 'DUEL_COMEBACK',
 1),

-- 8. Symbol Master — low error rate on special characters
(gen_random_uuid(),
 'SYMBOL_MASTER',
 'Symbol Master',
 'Type 500+ sessions with a symbol key error rate below 5 per mille.',
 '/icons/achievements/symbol_master.svg',
 350,
 'SYMBOL_ERROR_RATE',
 5),

-- 9. First Blood — win your first duel
(gen_random_uuid(),
 'FIRST_WIN',
 'First Win',
 'Win your very first 1v1 ranked duel.',
 '/icons/achievements/first_win.svg',
 100,
 'FIRST_DUEL_WIN',
 1),

-- 10. Guild Founder — create a guild
(gen_random_uuid(),
 'GUILD_FOUNDER',
 'Guild Founder',
 'Create and become the owner of a DevType guild.',
 '/icons/achievements/guild_founder.svg',
 150,
 'GUILD_FOUNDED',
 1),

-- 11. Champion — win a tournament
(gen_random_uuid(),
 'TOURNAMENT_CHAMPION',
 'Tournament Champion',
 'Win a DevType tournament and claim the championship title.',
 '/icons/achievements/tournament_champion.svg',
 1000,
 'TOURNAMENT_WON',
 1),

-- 12. Night Owl — complete a session between midnight and 4 AM
(gen_random_uuid(),
 'NIGHT_OWL',
 'Night Owl',
 'Complete a typing session between 12:00 AM and 4:00 AM local time.',
 '/icons/achievements/night_owl.svg',
 75,
 'NIGHT_OWL_SESSION',
 1);
