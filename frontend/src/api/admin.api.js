import api from './axios';

export const adminApi = {
  getSuspiciousSessions: (params = {}) =>
    api.get('/admin/suspicious-sessions', { params }),

  invalidateSession: (sessionId) =>
    api.post(`/admin/sessions/${sessionId}/invalidate`),
};
