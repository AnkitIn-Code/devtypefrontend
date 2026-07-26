import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      font: 'JetBrains Mono',
      fontSize: 16,
      cursorStyle: 'line', // line | block | underline
      cursorBlink: true,
      soundEnabled: false,
      soundVolume: 0.5,
      keyboardLayout: 'qwerty',
      animationSpeed: 'normal', // slow | normal | fast
      showKeyboard: false,
      smoothCaret: true,
      confidenceMode: false, // no backspace
      stopOnError: false,

      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      setFontSize: (fontSize) => set({ fontSize }),
      setCursorStyle: (cursorStyle) => set({ cursorStyle }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setSoundVolume: (soundVolume) => set({ soundVolume }),
      setKeyboardLayout: (keyboardLayout) => set({ keyboardLayout }),
      setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
      toggleSmoothCaret: () => set((s) => ({ smoothCaret: !s.smoothCaret })),
      toggleConfidenceMode: () => set((s) => ({ confidenceMode: !s.confidenceMode })),
      toggleStopOnError: () => set((s) => ({ stopOnError: !s.stopOnError })),
      resetToDefaults: () => set({
        font: 'JetBrains Mono',
        fontSize: 16,
        cursorStyle: 'line',
        cursorBlink: true,
        soundEnabled: false,
        animationSpeed: 'normal',
        smoothCaret: true,
        confidenceMode: false,
        stopOnError: false,
      }),
    }),
    { name: 'ct_settings' }
  )
);
