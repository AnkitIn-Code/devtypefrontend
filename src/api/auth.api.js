import api from './axios';

// Mock delay helper for dev
const delay = (ms = 600) => new Promise(res => setTimeout(res, ms));

export const authApi = {
  login: async (credentials) => {
    // TODO: Replace with real endpoint
    await delay();
    if (credentials.email === 'guest@demo.com' || credentials.email.includes('@')) {
      return {
        data: {
          accessToken: 'mock_access_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(),
          user: {
            id: 'usr_001',
            name: credentials.email.split('@')[0],
            email: credentials.email,
            avatar: null,
            role: 'USER',
            level: 5,
            xp: 2400,
            credits: 1200,
            joinedAt: new Date().toISOString(),
          },
        },
      };
    }
    throw { response: { data: { message: 'Invalid credentials' } } };
  },

  signup: async (userData) => {
    await delay();
    return {
      data: {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        user: {
          id: 'usr_new_' + Date.now(),
          name: userData.name,
          email: userData.email,
          avatar: null,
          role: 'USER',
          level: 1,
          xp: 0,
          credits: 50,
          joinedAt: new Date().toISOString(),
        },
      },
    };
  },

  logout: async () => {
    await delay(200);
    return { data: { success: true } };
  },

  forgotPassword: async (email) => {
    await delay();
    return { data: { message: `Password reset link sent to ${email}` } };
  },

  googleLogin: async (googleToken) => {
    await delay();
    return {
      data: {
        accessToken: 'mock_google_token_' + Date.now(),
        refreshToken: 'mock_refresh_' + Date.now(),
        user: {
          id: 'usr_google_001',
          name: 'Google User',
          email: 'google@example.com',
          avatar: null,
          role: 'USER',
          level: 3,
          xp: 800,
          credits: 300,
        },
      },
    };
  },

  refreshToken: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),

  getMe: async () => {
    await delay(300);
    const user = JSON.parse(localStorage.getItem('ct_user') || 'null');
    return { data: user };
  },
};
