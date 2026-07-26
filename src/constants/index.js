// Application constants
export const APP_NAME = 'CodeType AI';
export const APP_VERSION = '1.0.0';

// API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080';

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
  TEMPLATES: '/templates',
  CREATE_TEMPLATE: '/templates/create',
  EDIT_TEMPLATE: '/templates/:id/edit',
  AI_TEMPLATE: '/ai-generator',
  MULTIPLAYER: '/multiplayer',
  MULTIPLAYER_ROOM: '/multiplayer/:roomCode',
  LEADERBOARD: '/leaderboard',
  REPORTS: '/reports',
  REPORT_DETAIL: '/reports/:id',
  PROFILE: '/profile',
  ACHIEVEMENTS: '/achievements',
  SETTINGS: '/settings',
};

// Difficulty levels
export const DIFFICULTIES = [
  { value: 'BEGINNER', label: 'Beginner', color: 'text-success' },
  { value: 'INTERMEDIATE', label: 'Intermediate', color: 'text-warning' },
  { value: 'ADVANCED', label: 'Advanced', color: 'text-error' },
  { value: 'EXPERT', label: 'Expert', color: 'text-purple-400' },
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
export const LEADERBOARD_TABS = ['Daily', 'Weekly', 'Monthly', 'Global', 'Friends', 'Country'];

// Achievements
export const ACHIEVEMENTS_DATA = [
  { id: 'wpm_100', title: '100 WPM', description: 'Reach 100 WPM in a typing test', icon: '⚡', xp: 500 },
  { id: 'tests_500', title: '500 Tests', description: 'Complete 500 typing tests', icon: '🎯', xp: 1000 },
  { id: 'templates_100', title: '100 Templates', description: 'Create 100 templates', icon: '📝', xp: 800 },
  { id: 'streak_30', title: '30 Day Streak', description: 'Practice for 30 consecutive days', icon: '🔥', xp: 1500 },
  { id: 'java_master', title: 'Java Master', description: 'Complete 50 Java templates', icon: '☕', xp: 600 },
  { id: 'react_master', title: 'React Master', description: 'Complete 50 React templates', icon: '⚛️', xp: 600 },
  { id: 'spring_master', title: 'Spring Master', description: 'Complete 50 Spring templates', icon: '🌱', xp: 600 },
  { id: 'ai_explorer', title: 'AI Explorer', description: 'Generate 20 AI templates', icon: '🤖', xp: 400 },
  { id: 'multiplayer_win', title: 'Race Winner', description: 'Win 10 multiplayer races', icon: '🏆', xp: 700 },
  { id: 'perfect_accuracy', title: 'Perfectionist', description: 'Complete a test with 100% accuracy', icon: '💎', xp: 300 },
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
