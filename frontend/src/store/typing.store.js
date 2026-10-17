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
  errorEvents: [], // [{ characterExpected, characterTyped, positionIndex, timestampMs }]
  startTime: null,
  endTime: null,
  elapsedTime: 0,
  wpm: 0,
  rawWpm: 0,
  accuracy: 100,
  totalKeystrokes: 0,
  wpmHistory: [],
  isFullscreen: false,
  // Single-backspace rule: true = one backspace is allowed after last wrong key
  canBackspace: false,
  hiddenSince: null,

  // Actions
  setTemplate: (template) => {
    // Clean code preserving exact indentation and newlines
    const rawCode = template?.code || '';
    const cleanCode = rawCode
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trimEnd();

    // EDGE-09: Unicode codepoint-aware splitting using string iterator spread
    const chars = [...cleanCode].map((char, i) => ({
      char,
      status: 'remaining',
      index: i,
    }));

    let initialIndex = 0;
    while (
      initialIndex < chars.length &&
      (chars[initialIndex].char === ' ' || chars[initialIndex].char === '\t')
    ) {
      chars[initialIndex].status = 'correct';
      chars[initialIndex].autoIndented = true;
      initialIndex++;
    }
    if (initialIndex < chars.length) {
      chars[initialIndex].status = 'current';
    }

    set({
      template,
      typedChars: chars,
      currentIndex: initialIndex,
      errors: 0,
      errorPositions: new Set(),
      errorEvents: [],
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
      canBackspace: false,
      hiddenSince: null,
    });
  },

  start: () => set({ status: 'running', startTime: Date.now() }),

  pause: () => set((state) => ({
    status: state.status === 'paused' ? 'running' : 'paused',
    startTime: state.status === 'paused' ? Date.now() - state.elapsedTime * 1000 : state.startTime,
  })),

  // BUG-H09: Pause timer accumulation when tab is hidden
  onTabHidden: () => {
    const state = get();
    if (state.status === 'running') {
      set({ hiddenSince: Date.now() });
    }
  },

  // BUG-H09: Shift startTime forward by hidden duration when tab is visible again
  onTabVisible: () => {
    const state = get();
    if (state.hiddenSince && state.status === 'running') {
      const pauseDuration = Date.now() - state.hiddenSince;
      set({
        startTime: state.startTime ? state.startTime + pauseDuration : state.startTime,
        hiddenSince: null,
      });
    }
  },

  type: (key) => {
    const state = get();
    if (state.status === 'paused' || state.status === 'finished') return;
    if (state.status === 'idle') set({ status: 'running', startTime: Date.now() });

    const { typedChars, currentIndex, errors, errorPositions, totalKeystrokes, wpmHistory, canBackspace } = state;

    if (key === 'Backspace') {
      // EDGE-06: Allow backspace to clear marked-wrong state on index 0
      if (currentIndex === 0) {
        if (typedChars[0] && typedChars[0].status === 'wrong') {
          const newChars = [...typedChars];
          newChars[0] = { ...newChars[0], status: 'current' };
          const newErrorPositions = new Set(errorPositions);
          newErrorPositions.delete(0);
          set({
            typedChars: newChars,
            currentIndex: 0,
            errors: Math.max(0, errors - 1),
            errorPositions: newErrorPositions,
            canBackspace: false,
          });
        }
        return;
      }

      const prevChar = typedChars[currentIndex - 1];
      // Single backspace rule: only if canBackspace is true and prev was wrong
      if (!canBackspace || !prevChar || prevChar.status !== 'wrong') return;


      const newChars = [...typedChars];
      const newErrorPositions = new Set(errorPositions);
      let newErrors = errors;
      let newIndex = currentIndex - 1;

      // If previous character was auto-indented, backspace over the entire auto-indented whitespace block plus the newline
      if (newChars[newIndex]?.autoIndented) {
        while (newIndex >= 0 && newChars[newIndex]?.autoIndented) {
          if (newChars[newIndex].status === 'wrong') {
            newErrors = Math.max(0, newErrors - 1);
            newErrorPositions.delete(newIndex);
          }
          newChars[newIndex] = { ...newChars[newIndex], status: 'remaining', autoIndented: false };
          newIndex--;
        }
        // Now newIndex is at the newline or previous char
        if (newIndex >= 0) {
          if (newChars[newIndex].status === 'wrong') {
            newErrors = Math.max(0, newErrors - 1);
            newErrorPositions.delete(newIndex);
          }
          newChars[newIndex] = { ...newChars[newIndex], status: 'current' };
        }
        // Clean up remaining future current marker
        if (currentIndex < newChars.length) {
          newChars[currentIndex] = { ...newChars[currentIndex], status: 'remaining' };
        }
      } else {
        const removedWasWrong = newChars[newIndex].status === 'wrong';
        newChars[newIndex] = { ...newChars[newIndex], status: 'current' };
        if (newIndex + 1 < newChars.length) {
          newChars[newIndex + 1] = { ...newChars[newIndex + 1], status: 'remaining' };
        }
        if (removedWasWrong) {
          newErrors = Math.max(0, newErrors - 1);
          newErrorPositions.delete(newIndex);
        }
      }

      set({
        typedChars: newChars,
        currentIndex: Math.max(0, newIndex),
        errors: newErrors,
        errorPositions: newErrorPositions,
        canBackspace: false, // used the one allowed backspace — no more until next wrong key
      });
      return;
    }

    if (key.length !== 1) return;

    const now = Date.now();
    const newChars = [...typedChars];
    const expectedChar = typedChars[currentIndex]?.char;
    const isCorrect = key === expectedChar;
    const newErrorPositions = new Set(errorPositions);

    newChars[currentIndex] = {
      ...newChars[currentIndex],
      status: isCorrect ? 'correct' : 'wrong',
    };

    let nextIndex = currentIndex + 1;
    const newErrors = isCorrect ? errors : errors + 1;
    const newErrorEvents = [...(state.errorEvents || [])];

    if (!isCorrect) {
      newErrorPositions.add(currentIndex);
      newErrorEvents.push({
        characterExpected: expectedChar || '',
        characterTyped: key,
        positionIndex: currentIndex,
        timestampMs: state.startTime ? Math.max(0, Math.round(now - state.startTime)) : 0,
      });
    }

    // Smart Auto-Indent on Enter key / Newline match
    if (isCorrect && expectedChar === '\n' && nextIndex < newChars.length) {
      // Auto-skip leading spaces/tabs on the new line
      while (
        nextIndex < newChars.length &&
        (newChars[nextIndex].char === ' ' || newChars[nextIndex].char === '\t')
      ) {
        newChars[nextIndex] = {
          ...newChars[nextIndex],
          status: 'correct',
          autoIndented: true,
        };
        nextIndex++;
      }
    }

    // Mark next as current
    if (nextIndex < newChars.length) {
      newChars[nextIndex] = { ...newChars[nextIndex], status: 'current' };
    }

    const elapsed = (now - state.startTime) / 1000 / 60; // minutes
    const wordsTyped = nextIndex / 5;
    const rawWpm = elapsed > 0 ? Math.round(wordsTyped / elapsed) : 0;
    const correctChars = newChars.filter(c => c.status === 'correct').length;
    const accuracy = nextIndex > 0 ? Math.round((correctChars / nextIndex) * 100) : 100;
    const wpm = Math.round(rawWpm * (accuracy / 100));

    const newWpmHistory = [...wpmHistory];
    if (newWpmHistory.length === 0 || now - (newWpmHistory[newWpmHistory.length - 1]?.time || 0) > 1000) {
      newWpmHistory.push({ time: now, wpm, accuracy });
    }

    const isFinished = nextIndex >= newChars.length;

    set({
      typedChars: newChars,
      currentIndex: nextIndex,
      errors: newErrors,
      errorPositions: newErrorPositions,
      errorEvents: newErrorEvents,
      totalKeystrokes: totalKeystrokes + 1,
      wpm,
      rawWpm,
      accuracy,
      wpmHistory: newWpmHistory,
      status: isFinished ? 'finished' : 'running',
      endTime: isFinished ? now : null,
      elapsedTime: isFinished ? (now - state.startTime) / 1000 : state.elapsedTime,
      // After any forward keypress: allow backspace only if this key was wrong
      canBackspace: !isCorrect,
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
