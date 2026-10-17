import api from './axios';

export const gamificationApi = {
  getLevelCurve: async (maxLevel = 50) => {
    return api.get(`/gamification/level-curve?maxLevel=${maxLevel}`);
  },

  getAchievements: async () => {
    return api.get('/achievements');
  },

  getRecentAchievements: async (limit = 5, username = null) => {
    const params = username ? `?limit=${limit}&username=${username}` : `?limit=${limit}`;
    return api.get(`/achievements/recent${params}`);
  },

  getTodayChallenge: async () => {
    return api.get('/daily-challenge');
  },

  submitDailyChallenge: async (data) => {
    return api.post('/daily-challenge/submit', data);
  },

  getCreditHistory: async (page = 0, size = 20) => {
    return api.get(`/users/me/credits/history?page=${page}&size=${size}`);
  },

  getCosmetics: async () => {
    return api.get('/cosmetics');
  },

  purchaseCosmetic: async (cosmeticId) => {
    return api.post(`/cosmetics/${cosmeticId}/purchase`);
  },

  getCurrentSeason: async () => {
    return api.get('/seasons/current');
  },

  getSeasonHistory: async () => {
    return api.get('/seasons/history');
  },

  getMonthlyCalendar: async (year, month) => {
    return api.get(`/daily-challenge/monthly?year=${year}&month=${month}`);
  },
};

