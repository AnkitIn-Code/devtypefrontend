import { create } from 'zustand';

export const useLeaderboardStore = create((set) => ({
  activeTab: 'Global',
  entries: [],
  userRank: null,
  isLoading: false,

  setTab: (tab) => set({ activeTab: tab }),
  setEntries: (entries) => set({ entries }),
  setUserRank: (userRank) => set({ userRank }),
  setLoading: (isLoading) => set({ isLoading }),
}));
