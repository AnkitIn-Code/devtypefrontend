import { create } from 'zustand';

export const useReportsStore = create((set) => ({
  reports: [],
  currentReport: null,
  stats: null,
  isLoading: false,

  setReports: (reports) => set({ reports }),
  setCurrentReport: (report) => set({ currentReport: report }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  addReport: (report) => set((s) => ({ reports: [report, ...s.reports] })),
}));
