import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '@constants';
import { userApi } from '@api/user.api';
import { authApi } from '@api/auth.api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: localStorage.getItem(ACCESS_TOKEN_KEY) || null,
      isAuthenticated: !!localStorage.getItem(ACCESS_TOKEN_KEY),
      isGuest: false,
      isLoading: false,
      isHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken) => {
        if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        set({ accessToken, isAuthenticated: !!accessToken });
      },

      login: (user, accessToken) => {
        if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isGuest: false,
          isHydrated: true,
        });
      },

      loginAsGuest: () => {
        set({
          user: { id: 'guest', username: 'Guest', email: null, role: 'GUEST' },
          isAuthenticated: false,
          isGuest: true,
          accessToken: null,
          isHydrated: true,
        });
      },

      logout: async () => {
        if (!get().isGuest) {
          try {
            await authApi.logout();
          } catch {
            // Ignore logout API errors
          }
        }

        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isGuest: false,
          isHydrated: true,
        });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setLoading: (isLoading) => set({ isLoading }),

      hydrateAuth: async () => {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY); // purge any legacy refresh tokens from storage

        if (!token) {
          set({
            isHydrated: true,
            isAuthenticated: false,
            user: null,
            accessToken: null,
          });
          return;
        }

        set({ accessToken: token });

        try {
          const res = await userApi.getMe();
          set({
            user: res.data,
            accessToken: localStorage.getItem(ACCESS_TOKEN_KEY) || token,
            isAuthenticated: true,
            isGuest: false,
            isHydrated: true,
          });
        } catch (err) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isGuest: false,
            isHydrated: true,
          });
        }
      },
    }),
    {
      name: USER_KEY,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
);


// Listen to global logout and token refresh events dispatched from axios interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
    const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/practice', '/typing', '/templates', '/leaderboard'];
    const currentPath = window.location.pathname;
    const isPublic = publicPaths.some(p => currentPath === p || (p !== '/' && currentPath.startsWith(p)));
    if (!isPublic) {
      window.location.href = '/login';
    }
  });

  window.addEventListener('auth:token_refreshed', (e) => {
    if (e.detail?.accessToken) {
      useAuthStore.getState().setTokens(e.detail.accessToken, e.detail.refreshToken);
    }
  });
}
