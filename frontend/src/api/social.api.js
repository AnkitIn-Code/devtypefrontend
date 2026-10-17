import api from './axios';

export const socialApi = {
  // Leaderboard
  getLeaderboard: async (scope = 'global', metric = 'wpm', period = 'all', language = 'all', limit = 50) => {
    return api.get('/leaderboard', {
      params: {
        scope,
        metric,
        period,
        ...(language && language !== 'all' ? { language } : {}),
        limit,
      },
    });
  },

  // User Search
  searchUsers: async (query) => {
    return api.get('/users/search', { params: { q: query } });
  },

  // Friends
  getFriends: async () => {
    return api.get('/friends');
  },

  getUserFriends: async (username) => {
    return api.get(`/friends/user/${encodeURIComponent(username)}`);
  },

  getPendingRequests: async () => {
    return api.get('/friends/requests/pending');
  },

  getSentRequests: async () => {
    return api.get('/friends/requests/sent');
  },

  sendFriendRequest: async (username) => {
    return api.post(`/friends/request/${username}`);
  },

  acceptFriendRequest: async (id) => {
    return api.post(`/friends/${id}/accept`);
  },

  declineFriendRequest: async (id) => {
    return api.post(`/friends/${id}/decline`);
  },

  removeFriend: async (id) => {
    return api.delete(`/friends/${id}`);
  },

  // Guilds
  getGuilds: async () => {
    return api.get('/guilds');
  },

  createGuild: async (data) => {
    return api.post('/guilds', data);
  },

  getGuildDetail: async (id) => {
    return api.get(`/guilds/${id}`);
  },

  joinGuild: async (id) => {
    return api.post(`/guilds/${id}/join`);
  },

  leaveGuild: async (id) => {
    return api.post(`/guilds/${id}/leave`);
  },

  getGuildLeaderboard: async (id, metric = 'wpm', period = 'all') => {
    return api.get(`/guilds/${id}/leaderboard`, { params: { metric, period } });
  },


  // Tournaments
  getTournaments: async () => {
    return api.get('/tournaments');
  },

  createTournament: async (data) => {
    return api.post('/tournaments', data);
  },

  startTournament: async (id) => {
    return api.post(`/tournaments/${id}/start`);
  },

  registerTournament: async (id) => {
    return api.post(`/tournaments/${id}/register`);
  },

  reportMatchResult: async (id, matchId, winnerId) => {
    return api.post(`/tournaments/${id}/matches/${matchId}/result`, { winnerId });
  },

  getTournamentBracket: async (id) => {
    return api.get(`/tournaments/${id}/bracket`);
  },

  // Share Card
  getSessionShareCard: async (sessionId) => {
    return api.get(`/sessions/${sessionId}/share-card`);
  },
};
