// Application constants
export const APP_NAME = 'CodeType AI';
export const APP_VERSION = '1.0.0';

// API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:9092';

// Auth
export const ACCESS_TOKEN_KEY = 'ct_access_token';
export const REFRESH_TOKEN_KEY = 'ct_refresh_token';
export const USER_KEY = 'ct_user';

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  TYPING: '/type',
  TYPING_TEMPLATE: '/type/:templateId',
  PRACTICE: '/practice',
  TEMPLATES: '/templates',
  CREATE_TEMPLATE: '/templates/create',
  // NOTE: Template editing is handled by CreateTemplate.jsx via /templates/create?edit=<id>
  // rather than a separate /templates/:id/edit route. This avoids maintaining two pages
  // with near-identical form logic. EDIT_TEMPLATE constant intentionally removed (C-04).
  AI_TEMPLATE: '/ai-generator',
  MULTIPLAYER: '/multiplayer',
  MULTIPLAYER_ROOM: '/multiplayer/:roomCode',
  LEADERBOARD: '/leaderboard',
  REPORTS: '/reports',
  REPORT_DETAIL: '/reports/:id',
  PROFILE: '/profile',
  PROFILE_USER: '/profile/:username',
  ACHIEVEMENTS: '/achievements',
  SETTINGS: '/settings',
  ADMIN_SESSIONS: '/admin/suspicious-sessions',
};

// Difficulty levels (3 standard levels)
export const DIFFICULTIES = [
  { value: 'BEGINNER', label: 'Beginner', color: 'text-success' },
  { value: 'INTERMEDIATE', label: 'Intermediate', color: 'text-warning' },
  { value: 'ADVANCED', label: 'Advanced', color: 'text-error' },
];

// Languages
export const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'shell', label: 'Shell' },
];

// Leaderboard tabs
export const LEADERBOARD_TABS = ['Daily', 'Weekly', 'Monthly', 'Global', 'Friends'];

// Achievements — mirrors the full set seeded in V3 + V15 DB migrations.
// Fields match API response: 'name', 'code', 'icon', 'xp', 'description'.
// The 'title' alias is kept for legacy fallback rendering compatibility.
export const ACHIEVEMENTS_DATA = [
  // ── EASY TIER ──────────────────────────────────────────────────────────────
  { id: 'SPEED_20',  code: 'SPEED_20',  name: 'First Speed',       title: 'First Speed',       description: 'Achieve a typing speed of 20 WPM in any typing session.', icon: '⚡',  xp: 100,  criteriaType: 'WPM_REACHED',       criteriaValue: 20 },
  { id: 'SPEED_30',  code: 'SPEED_30',  name: 'First Spark',       title: 'First Spark',       description: 'Achieve a typing speed of 30 WPM in any typing session.', icon: '⚡',  xp: 100,  criteriaType: 'WPM_REACHED',       criteriaValue: 30 },
  { id: 'SPEED_50',  code: 'SPEED_50',  name: 'Steady Hands',      title: 'Steady Hands',      description: 'Achieve a typing speed of 50 WPM in any typing session.', icon: '🔥', xp: 200,  criteriaType: 'WPM_REACHED',       criteriaValue: 50 },
  { id: 'SESSIONS_1', code: 'SESSIONS_1', name: 'First Keypress',  title: 'First Keypress',    description: 'Complete your very first typing test session.',             icon: '🎯', xp: 100,  criteriaType: 'SESSIONS_COMPLETED', criteriaValue: 1 },
  { id: 'SESSIONS_10', code: 'SESSIONS_10', name: 'Warmup Racer',  title: 'Warmup Racer',      description: 'Complete 10 typing test sessions.',                        icon: '📝', xp: 200,  criteriaType: 'SESSIONS_COMPLETED', criteriaValue: 10 },
  { id: 'STREAK_1',  code: 'STREAK_1',  name: 'Day One',           title: 'Day One',           description: 'Complete a daily practice session.',                       icon: '📅', xp: 100,  criteriaType: 'STREAK_DAYS',        criteriaValue: 1 },
  { id: 'STREAK_3',  code: 'STREAK_3',  name: '3-Day Streak',      title: '3-Day Streak',      description: 'Maintain a 3-day consecutive practice streak.',            icon: '📅', xp: 150,  criteriaType: 'STREAK_DAYS',        criteriaValue: 3 },
  { id: 'LEVEL_2',   code: 'LEVEL_2',   name: 'Level Up',          title: 'Level Up',          description: 'Reach Level 2 in developer experience.',                  icon: '⭐', xp: 100,  criteriaType: 'LEVEL_REACHED',      criteriaValue: 2 },
  { id: 'LEVEL_5',   code: 'LEVEL_5',   name: 'Rising Developer',  title: 'Rising Developer',  description: 'Reach Level 5 in developer experience.',                  icon: '⭐', xp: 200,  criteriaType: 'LEVEL_REACHED',      criteriaValue: 5 },

  // ── MEDIUM TIER ────────────────────────────────────────────────────────────
  { id: 'SPEED_75',  code: 'SPEED_75',  name: 'Speed Demon',       title: 'Speed Demon',       description: 'Achieve a typing speed of 75 WPM in a code typing session.', icon: '🚀', xp: 400, criteriaType: 'WPM_REACHED',        criteriaValue: 75 },
  { id: 'SESSIONS_50', code: 'SESSIONS_50', name: 'Dedicated Typist', title: 'Dedicated Typist', description: 'Complete 50 typing test sessions.',                     icon: '💻', xp: 400,  criteriaType: 'SESSIONS_COMPLETED', criteriaValue: 50 },
  { id: 'STREAK_7',  code: 'STREAK_7',  name: 'Weekly Warrior',    title: 'Weekly Warrior',    description: 'Maintain a 7-day consecutive practice streak.',           icon: '🔥', xp: 350,  criteriaType: 'STREAK_DAYS',        criteriaValue: 7 },
  { id: 'LEVEL_15',  code: 'LEVEL_15',  name: 'Code Craftsman',    title: 'Code Craftsman',    description: 'Reach Level 15 in developer experience.',                 icon: '🎖️', xp: 500, criteriaType: 'LEVEL_REACHED',      criteriaValue: 15 },
  { id: 'PERFECTIONIST', code: 'PERFECTIONIST', name: 'Perfectionist', title: 'Perfectionist', description: 'Complete a typing session with 100% accuracy.',           icon: '💎', xp: 350,  criteriaType: 'ACCURACY_PERFECT',   criteriaValue: 1 },
  { id: 'MULTIPLAYER_WINS_5', code: 'MULTIPLAYER_WINS_5', name: 'Race Master', title: 'Race Master', description: 'Win 5 multiplayer coding races.',               icon: '🏆', xp: 500,  criteriaType: 'MULTIPLAYER_WINS',   criteriaValue: 5 },
  { id: 'TEMPLATES_CREATED_3', code: 'TEMPLATES_CREATED_3', name: 'Snippet Creator', title: 'Snippet Creator', description: 'Create 3 custom code templates.',      icon: '🧩', xp: 300,  criteriaType: 'TEMPLATES_CREATED',  criteriaValue: 3 },

  // ── HARD / ELITE TIER ─────────────────────────────────────────────────────
  { id: 'SPEED_100', code: 'SPEED_100', name: 'Century Club',      title: 'Century Club',      description: 'Achieve a typing speed of 100 WPM in a code typing session.', icon: '👑', xp: 750,  criteriaType: 'WPM_REACHED',       criteriaValue: 100 },
  { id: 'SPEED_120', code: 'SPEED_120', name: 'Lightning Fingers', title: 'Lightning Fingers', description: 'Achieve a typing speed of 120 WPM in a code typing session.', icon: '⚡', xp: 1200, criteriaType: 'WPM_REACHED',      criteriaValue: 120 },
  { id: 'SESSIONS_200', code: 'SESSIONS_200', name: 'Keyboard Veteran', title: 'Keyboard Veteran', description: 'Complete 200 typing test sessions.',               icon: '🥇', xp: 800,  criteriaType: 'SESSIONS_COMPLETED', criteriaValue: 200 },
  { id: 'SESSIONS_500', code: 'SESSIONS_500', name: 'Iron Coder',  title: 'Iron Coder',        description: 'Complete 500 typing test sessions.',                      icon: '🛡️', xp: 1500, criteriaType: 'SESSIONS_COMPLETED', criteriaValue: 500 },
  { id: 'LEVEL_30',  code: 'LEVEL_30',  name: 'Grandmaster Developer', title: 'Grandmaster Developer', description: 'Reach Level 30 in developer experience.',     icon: '🌟', xp: 1000, criteriaType: 'LEVEL_REACHED',      criteriaValue: 30 },
  { id: 'STREAK_30', code: 'STREAK_30', name: '30 Day Streak',     title: '30 Day Streak',     description: 'Maintain a 30-day consecutive daily practice streak.',    icon: '🔥', xp: 600,  criteriaType: 'STREAK_DAYS',        criteriaValue: 30 },

  // ── V3 LEGACY / SPECIAL ───────────────────────────────────────────────────
  { id: 'NIGHT_OWL', code: 'NIGHT_OWL', name: 'Night Owl',         title: 'Night Owl',         description: 'Complete a typing session between 12:00 AM and 4:00 AM local time.', icon: '🦉', xp: 75, criteriaType: 'NIGHT_OWL_SESSION', criteriaValue: 1 },
  { id: 'GUILD_FOUNDER', code: 'GUILD_FOUNDER', name: 'Guild Founder', title: 'Guild Founder', description: 'Create and become the owner of a DevType guild.',        icon: '🏛️', xp: 150, criteriaType: 'GUILD_FOUNDED',      criteriaValue: 1 },
  { id: 'TOURNAMENT_CHAMPION', code: 'TOURNAMENT_CHAMPION', name: 'Tournament Champion', title: 'Tournament Champion', description: 'Win a DevType tournament and claim the championship title.', icon: '🥇', xp: 1000, criteriaType: 'TOURNAMENT_WON', criteriaValue: 1 },
];

// Credits events
export const CREDIT_EVENTS = {
  DAILY_PRACTICE: 10,
  MULTIPLAYER_WIN: 50,
  CHALLENGE_COMPLETE: 30,
  CREATE_TEMPLATE: 20,
  SHARE_TEMPLATE: 15,
  LEADERBOARD_TOP10: 100,
};
