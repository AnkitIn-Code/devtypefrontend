import { create } from 'zustand';

export const useTemplatesStore = create((set, get) => ({
  templates: [],
  myTemplates: [],
  currentTemplate: null,
  filters: { language: '', difficulty: '', search: '' },
  isLoading: false,

  setTemplates: (templates) => set({ templates }),
  setMyTemplates: (myTemplates) => set({ myTemplates }),
  setCurrentTemplate: (tpl) => set({ currentTemplate: tpl }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  setLoading: (isLoading) => set({ isLoading }),

  addTemplate: (tpl) => set((s) => ({ myTemplates: [tpl, ...s.myTemplates] })),
  removeTemplate: (id) => set((s) => ({
    myTemplates: s.myTemplates.filter(t => t.id !== id),
    templates: s.templates.filter(t => t.id !== id),
  })),
  updateTemplate: (id, updates) => set((s) => ({
    myTemplates: s.myTemplates.map(t => t.id === id ? { ...t, ...updates } : t),
    templates: s.templates.map(t => t.id === id ? { ...t, ...updates } : t),
  })),
}));
