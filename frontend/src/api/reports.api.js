import api from './axios';

export const reportsApi = {
  // Submit a session
  create: (sessionData) => api.post('/sessions', sessionData),

  // Get session history (supports optional username for public profile sessions)
  getAll: async (params = {}) => {
    const { username, ...restParams } = params;
    const url = username ? `/sessions/user/${encodeURIComponent(username)}` : '/sessions/me';
    const res = await api.get(url, { params: { size: 50, ...restParams } });
    const items = res.data?.content || res.data || [];
    return { data: items };
  },

  // Get language performance breakdown
  getLanguageStats: async () => {
    const res = await api.get('/sessions/me', { params: { size: 100 } });
    const items = res.data?.content || res.data || [];
    const langMap = {};
    items.forEach(s => {
      let lang = s.language;
      if (!lang || lang.toLowerCase() === 'mixed') {
        lang = 'cpp';
      }
      if (!langMap[lang]) {
        langMap[lang] = { language: lang, totalWpm: 0, totalAcc: 0, tests: 0 };
      }
      langMap[lang].totalWpm += (s.wpm || 0);
      langMap[lang].totalAcc += (s.accuracy ? Number(s.accuracy) : 100);
      langMap[lang].tests += 1;
    });
    const result = Object.values(langMap).map(l => ({
      language: l.language,
      avgWpm: Math.round(l.totalWpm / l.tests),
      avgAccuracy: Math.round(l.totalAcc / l.tests),
      tests: l.tests,
    }));
    return { data: result };
  },

  // Get single session detail by ID
  getById: async (id) => {
    const res = await api.get(`/sessions/${id}`);
    return { data: res.data };
  },

  // Get aggregate stats for dashboard
  getStats: async () => {
    const res = await api.get('/stats/me');
    return { data: res.data };
  },

  // Get time series history for charts
  getHistory: async (range = '30d') => {
    const res = await api.get('/stats/me/history', { params: { range } });
    return { data: res.data };
  },

  // Get weak symbol heatmap
  getSymbolHeatmap: async () => {
    const res = await api.get('/stats/me/symbol-heatmap');
    return { data: res.data };
  },

  // Get top N weak keys
  getWeakKeys: async (limit = 5) => {
    const res = await api.get('/stats/me/weak-keys', { params: { limit } });
    return { data: res.data };
  },

  // Generate weak key drill snippet
  generateWeakKeyDrill: async () => {
    const res = await api.post('/drills/weak-keys');
    return { data: res.data };
  },
};
