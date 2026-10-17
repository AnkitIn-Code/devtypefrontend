import { create } from 'zustand';

export const useAiStore = create((set) => ({
  prompt: '',
  language: 'cpp',
  difficulty: 'INTERMEDIATE',
  topic: '',
  approach: 'optimal', // brute_force | better | optimal
  codeScope: 'function_only', // 'function_only' | 'complete_program'
  generatedCode: null,
  isGenerating: false,
  explanation: '',
  history: [],

  setPrompt: (prompt) => set({ prompt }),
  setLanguage: (language) => set({ language }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setTopic: (topic) => set({ topic }),
  setApproach: (approach) => set({ approach }),
  setCodeScope: (codeScope) => set({ codeScope }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setExplanation: (explanation) => set({ explanation }),

  setResult: (result) => set((s) => ({
    generatedCode: result.code !== undefined ? result.code : s.generatedCode,
    explanation: result.explanation !== undefined ? result.explanation : s.explanation,
    history: [{ ...result, timestamp: Date.now() }, ...s.history.slice(0, 9)],
  })),

  clearResult: () => set({ generatedCode: null, explanation: '' }),
  reset: () => set({
    prompt: '', language: 'cpp', difficulty: 'INTERMEDIATE',
    topic: '', approach: 'optimal', codeScope: 'function_only',
    generatedCode: null, isGenerating: false, explanation: '',
  }),
}));
