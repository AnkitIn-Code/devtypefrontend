const delay = (ms = 400) => new Promise(res => setTimeout(res, ms));

export const userApi = {
  getProfile: async (userId) => {
    await delay();
    return {
      data: {
        id: userId || 'usr_001',
        name: 'DevTypist',
        email: 'dev@codetype.ai',
        bio: 'Full-stack developer passionate about clean code and speed.',
        avatar: null,
        level: 12,
        xp: 6800,
        xpToNext: 10000,
        credits: 3420,
        streak: 7,
        joinedAt: '2024-01-01T00:00:00Z',
        stats: {
          totalTests: 147,
          avgWpm: 78,
          bestWpm: 112,
          avgAccuracy: 93.4,
          totalTime: 18320,
          totalCharacters: 89240,
          templatesCreated: 12,
          multiplayerWins: 8,
        },
        achievements: ['wpm_100', 'tests_500', 'streak_30', 'react_master'],
        recentReports: [],
      },
    };
  },

  updateProfile: async (data) => {
    await delay();
    return { data };
  },

  updateAvatar: async (formData) => {
    await delay();
    return { data: { avatarUrl: '/default-avatar.png' } };
  },

  getStats: async () => {
    await delay();
    return {
      data: {
        wpmHistory: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString(),
          wpm: Math.floor(60 + Math.random() * 50),
        })),
        accuracyHistory: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString(),
          accuracy: parseFloat((85 + Math.random() * 15).toFixed(1)),
        })),
      },
    };
  },
};
