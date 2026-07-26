import { create } from 'zustand';

export const useTypingStore = create((set, get) => ({
  // State
  status: 'idle', // idle | countdown | running | paused | finished
  template: null,
  input: '',
  typedChars: [], // { char, status: 'correct' | 'wrong' | 'remaining' | 'current' }
  currentIndex: 0,
  errors: 0,
  errorPositions: new Set(),
  startTime: null,
  endTime: null,
  elapsedTime: 0,
  wpm: 0,
  rawWpm: 0,
  accuracy: 100,
  totalKeystrokes: 0,
  wpmHistory: [],
  isFullscreen: false,

  // Actions
  setTemplate: (template) => {
    const chars = template.code.split('').map((char, i) => ({
      char,
      status: i === 0 ? 'current' : 'remaining',
      index: i,
    }));
    set({
      template,
      typedChars: chars,
      currentIndex: 0,
      errors: 0,
      errorPositions: new Set(),
      input: '',
      status: 'idle',
      startTime: null,
      endTime: null,
      elapsedTime: 0,
      wpm: 0,
      rawWpm: 0,
      accuracy: 100,
      totalKeystrokes: 0,
      wpmHistory: [],
    });
  },

  start: () => set({ status: 'running', startTime: Date.now() }),

  pause: () => set((state) => ({
    status: state.status === 'paused' ? 'running' : 'paused',
    startTime: state.status === 'paused' ? Date.now() - state.elapsedTime * 1000 : state.startTime,
  })),

  type: (key) => {
    const state = get();
    if (state.status === 'paused' || state.status === 'finished') return;
    if (state.status === 'idle') set({ status: 'running', startTime: Date.now() });

    const { typedChars, currentIndex, errors, errorPositions, totalKeystrokes, wpmHistory } = state;

    if (key === 'Backspace') {
      if (currentIndex === 0) return;
      const newIndex = currentIndex - 1;
      const newChars = [...typedChars];
      const removedWasWrong = newChars[newIndex].status === 'wrong';
      newChars[newIndex] = { ...newChars[newIndex], status: 'current' };
      if (newIndex + 1 < newChars.length) {
        newChars[newIndex + 1] = { ...newChars[newIndex + 1], status: 'remaining' };
      }
      const newErrorPositions = new Set(errorPositions);
      if (removedWasWrong) newErrorPositions.delete(newIndex);

      set({
        typedChars: newChars,
        currentIndex: newIndex,
        errors: removedWasWrong ? errors - 1 : errors,
        errorPositions: newErrorPositions,
      });
      return;
    }

    if (key.length !== 1) return;

    const newChars = [...typedChars];
    const expectedChar = typedChars[currentIndex]?.char;
    const isCorrect = key === expectedChar;
    const newErrorPositions = new Set(errorPositions);

    newChars[currentIndex] = {
      ...newChars[currentIndex],
      status: isCorrect ? 'correct' : 'wrong',
    };

    const nextIndex = currentIndex + 1;
    const newErrors = isCorrect ? errors : errors + 1;

    if (!isCorrect) newErrorPositions.add(currentIndex);

    // Mark next as current
    if (nextIndex < newChars.length) {
      newChars[nextIndex] = { ...newChars[nextIndex], status: 'current' };
    }

    const now = Date.now();
    const elapsed = (now - state.startTime) / 1000 / 60; // minutes
    const wordsTyped = nextIndex / 5;
    const rawWpm = elapsed > 0 ? Math.round(wordsTyped / elapsed) : 0;
    const correctChars = newChars.filter(c => c.status === 'correct').length;
    const accuracy = nextIndex > 0 ? Math.round((correctChars / nextIndex) * 100) : 100;
    const wpm = Math.round(rawWpm * (accuracy / 100));

    const newWpmHistory = [...wpmHistory];
    if (newWpmHistory.length === 0 || now - (newWpmHistory[newWpmHistory.length - 1]?.time || 0) > 2000) {
      newWpmHistory.push({ time: now, wpm, accuracy });
    }

    const isFinished = nextIndex >= newChars.length;

    set({
      typedChars: newChars,
      currentIndex: nextIndex,
      errors: newErrors,
      errorPositions: newErrorPositions,
      totalKeystrokes: totalKeystrokes + 1,
      wpm,
      rawWpm,
      accuracy,
      wpmHistory: newWpmHistory,
      status: isFinished ? 'finished' : 'running',
      endTime: isFinished ? now : null,
      elapsedTime: isFinished ? (now - state.startTime) / 1000 : state.elapsedTime,
    });
  },

  tick: () => {
    const state = get();
    if (state.status !== 'running' || !state.startTime) return;
    const elapsed = (Date.now() - state.startTime) / 1000;
    set({ elapsedTime: elapsed });
  },

  reset: () => {
    const state = get();
    if (state.template) {
      get().setTemplate(state.template);
    }
  },

  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
}));
