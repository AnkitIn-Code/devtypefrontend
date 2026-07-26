import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '@constants';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isGuest: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        set({ accessToken, refreshToken });
      },

      login: (user, accessToken, refreshToken) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isGuest: false,
        });
      },

      loginAsGuest: () => {
        set({
          user: { id: 'guest', name: 'Guest', email: null, role: 'GUEST' },
          isAuthenticated: false,
          isGuest: true,
          accessToken: null,
        });
      },

      logout: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isGuest: false,
        });
      },

      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: USER_KEY,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
);
