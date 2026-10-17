-- V15: Seed Balanced Tiered Achievements (Easy, Medium, Hard)

INSERT INTO achievements (id, code, name, description, icon_url, xp_reward, criteria_type, criteria_value)
VALUES

-- EASY TIER
(gen_random_uuid(), 'SPEED_20', 'First Speed', 'Achieve a typing speed of 20 WPM in any typing session.', '⚡', 100, 'WPM_REACHED', 20),
(gen_random_uuid(), 'SPEED_30', 'First Spark', 'Achieve a typing speed of 30 WPM in any typing session.', '⚡', 100, 'WPM_REACHED', 30),
(gen_random_uuid(), 'SPEED_50', 'Steady Hands', 'Achieve a typing speed of 50 WPM in any typing session.', '🔥', 200, 'WPM_REACHED', 50),
(gen_random_uuid(), 'SESSIONS_1', 'First Keypress', 'Complete your very first typing test session.', '🎯', 100, 'SESSIONS_COMPLETED', 1),
(gen_random_uuid(), 'SESSIONS_10', 'Warmup Racer', 'Complete 10 typing test sessions.', '📝', 200, 'SESSIONS_COMPLETED', 10),
(gen_random_uuid(), 'STREAK_1', 'Day One', 'Complete a daily practice session.', '📅', 100, 'STREAK_DAYS', 1),
(gen_random_uuid(), 'STREAK_3', '3-Day Streak', 'Maintain a 3-day consecutive practice streak.', '📅', 150, 'STREAK_DAYS', 3),
(gen_random_uuid(), 'LEVEL_2', 'Level Up', 'Reach Level 2 in developer experience.', '⭐', 100, 'LEVEL_REACHED', 2),
(gen_random_uuid(), 'LEVEL_5', 'Rising Developer', 'Reach Level 5 in developer experience.', '⭐', 200, 'LEVEL_REACHED', 5),

-- MEDIUM TIER
(gen_random_uuid(), 'SPEED_75', 'Speed Demon', 'Achieve a typing speed of 75 WPM in a code typing session.', '🚀', 400, 'WPM_REACHED', 75),
(gen_random_uuid(), 'SESSIONS_50', 'Dedicated Typist', 'Complete 50 typing test sessions.', '💻', 400, 'SESSIONS_COMPLETED', 50),
(gen_random_uuid(), 'STREAK_7', 'Weekly Warrior', 'Maintain a 7-day consecutive practice streak.', '🔥', 350, 'STREAK_DAYS', 7),
(gen_random_uuid(), 'LEVEL_15', 'Code Craftsman', 'Reach Level 15 in developer experience.', '🎖️', 500, 'LEVEL_REACHED', 15),
(gen_random_uuid(), 'MULTIPLAYER_WINS_5', 'Race Master', 'Win 5 multiplayer coding races.', '🏆', 500, 'MULTIPLAYER_WINS', 5),
(gen_random_uuid(), 'TEMPLATES_CREATED_3', 'Snippet Creator', 'Create 3 custom code templates.', '🧩', 300, 'TEMPLATES_CREATED', 3),

-- HARD / ELITE TIER
(gen_random_uuid(), 'SPEED_100', 'Century Club', 'Achieve a typing speed of 100 WPM in a code typing session.', '👑', 750, 'WPM_REACHED', 100),
(gen_random_uuid(), 'SPEED_120', 'Lightning Fingers', 'Achieve a typing speed of 120 WPM in a code typing session.', '⚡', 1200, 'WPM_REACHED', 120),
(gen_random_uuid(), 'SESSIONS_200', 'Keyboard Veteran', 'Complete 200 typing test sessions.', '🥇', 800, 'SESSIONS_COMPLETED', 200),
(gen_random_uuid(), 'SESSIONS_500', 'Iron Coder', 'Complete 500 typing test sessions.', '🛡️', 1500, 'SESSIONS_COMPLETED', 500),
(gen_random_uuid(), 'LEVEL_30', 'Grandmaster Developer', 'Reach Level 30 in developer experience.', '🌟', 1000, 'LEVEL_REACHED', 30)

ON CONFLICT (code) DO NOTHING;
