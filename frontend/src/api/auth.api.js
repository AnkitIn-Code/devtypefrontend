import api from './axios';

export const authApi = {
  login: async (credentials) => {
    return api.post('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
  },

  signup: async (userData) => {
    return api.post('/auth/register', {
      username: userData.username,
      email: userData.email,
      password: userData.password,
    });
  },

  logout: async (refreshToken) => {
    return api.post('/auth/logout', { refreshToken });
  },

  refreshToken: async (refreshToken) => {
    return api.post('/auth/refresh', { refreshToken });
  },

  getMe: async () => {
    return api.get('/users/me');
  },

  forgotPassword: async (email) => {
    return api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token, newPassword) => {
    return api.post('/auth/reset-password', { token, newPassword });
  },
};

