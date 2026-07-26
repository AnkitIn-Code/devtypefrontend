import { create } from 'zustand';

export const useAiStore = create((set) => ({
  prompt: '',
  language: 'javascript',
  difficulty: 'INTERMEDIATE',
  topic: '',
  length: 'medium',
  generatedCode: null,
  isGenerating: false,
  explanation: '',
  history: [],

  setPrompt: (prompt) => set({ prompt }),
  setLanguage: (language) => set({ language }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setTopic: (topic) => set({ topic }),
  setLength: (length) => set({ length }),
  setGenerating: (isGenerating) => set({ isGenerating }),

  setResult: (result) => set((s) => ({
    generatedCode: result.code,
    explanation: result.explanation || '',
    history: [{ ...result, timestamp: Date.now() }, ...s.history.slice(0, 9)],
  })),

  clearResult: () => set({ generatedCode: null, explanation: '' }),
  reset: () => set({
    prompt: '', language: 'javascript', difficulty: 'INTERMEDIATE',
    topic: '', length: 'medium', generatedCode: null, isGenerating: false, explanation: '',
  }),
}));
