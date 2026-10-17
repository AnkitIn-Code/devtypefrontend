import api from './axios';

export const leaderboardApi = {
  get: async (scope = 'global', metric = 'wpm') => {
    const scopeParam = scope.toLowerCase();
    const res = await api.get(`/leaderboard?scope=${scopeParam}&metric=${metric}`);
    return { data: res.data?.leaderboard || [] };
  },

  getUserRank: async (scope = 'global', metric = 'wpm') => {
    const scopeParam = scope.toLowerCase();
    const res = await api.get(`/leaderboard?scope=${scopeParam}&metric=${metric}`);
    return { data: { rank: res.data?.userRank || 0 } };
  },
};
