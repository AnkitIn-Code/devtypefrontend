import api from './axios';

export const userApi = {
  getMe: async () => {
    return api.get('/users/me');
  },

  updateMe: async (data) => {
    return api.patch('/users/me', data);
  },

  getProfile: async (identifier) => {
    if (!identifier) {
      return api.get('/users/me');
    }
    return api.get(`/users/${encodeURIComponent(identifier)}`);
  },

  updateAvatar: async (avatarUrl) => {
    return api.patch('/users/me', { avatarUrl });
  },

  deleteAccount: async (password) => {
    return api.delete('/users/me', { data: { password } });
  },

  getSettings: async () => {
    return api.get('/users/me/settings');
  },

  updateSettings: async (settingsData) => {
    return api.patch('/users/me/settings', JSON.stringify(settingsData), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  /**
   * @deprecated Use `reportsApi.getStats()` from `@api/reports.api` instead.
   */
  getStats: async () => {
    console.warn('[userApi] getStats() is deprecated. Please import and use reportsApi.getStats() from @api/reports.api.');
    return {
      data: {
        wpmHistory: [],
        accuracyHistory: [],
      },
    };
  },
};
