-- V13: Seed Daily Challenge & Monthly Perfectionist Achievements

INSERT INTO achievements (id, code, name, description, icon_url, xp_reward, criteria_type, criteria_value)
VALUES
(gen_random_uuid(),
 'DAILY_CHALLENGER',
 'Daily Challenger',
 'Complete your first Daily Code Challenge.',
 '/icons/achievements/daily_challenger.svg',
 200,
 'DAILY_CHALLENGE_COMPLETED',
 1),

(gen_random_uuid(),
 'MONTHLY_PERFECTIONIST',
 'Monthly Perfectionist',
 'Complete 30 Daily Code Challenges to achieve monthly mastery.',
 '/icons/achievements/monthly_perfectionist.svg',
 1000,
 'DAILY_CHALLENGE_COMPLETED',
 30)
ON CONFLICT (code) DO NOTHING;
