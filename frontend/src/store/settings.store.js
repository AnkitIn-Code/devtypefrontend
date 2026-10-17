import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userApi } from '@api/user.api';

let syncDebounceTimer = null;
const syncToServer = (state) => {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('ct_access_token');
  if (!token) return;

  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(async () => {
    try {
      const payload = {
        theme: state.theme,
        font: state.font,
        fontSize: state.fontSize,
        cursorStyle: state.cursorStyle,
        cursorBlink: state.cursorBlink,
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume,
        keyboardLayout: state.keyboardLayout,
        animationSpeed: state.animationSpeed,
        smoothCaret: state.smoothCaret,
        confidenceMode: state.confidenceMode,
        stopOnError: state.stopOnError,
      };
      await userApi.updateSettings(payload);
    } catch {
      // Background sync silent fail
    }
  }, 800);
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
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

      loadFromServer: async () => {
        try {
          const res = await userApi.getSettings();
          if (res?.data) {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            set((s) => ({ ...s, ...data }));
          }
        } catch {
          // ignore if unauthenticated
        }
      },

      setTheme: (theme) => { set({ theme }); syncToServer({ ...get(), theme }); },
      toggleTheme: () => set((s) => {
        const nextTheme = s.theme === 'dark' ? 'light' : 'dark';
        syncToServer({ ...s, theme: nextTheme });
        return { theme: nextTheme };
      }),
      setFont: (font) => { set({ font }); syncToServer({ ...get(), font }); },
      setFontSize: (fontSize) => { set({ fontSize }); syncToServer({ ...get(), fontSize }); },
      setCursorStyle: (cursorStyle) => { set({ cursorStyle }); syncToServer({ ...get(), cursorStyle }); },
      toggleSound: () => set((s) => {
        const next = !s.soundEnabled;
        syncToServer({ ...s, soundEnabled: next });
        return { soundEnabled: next };
      }),
      setSoundVolume: (soundVolume) => { set({ soundVolume }); syncToServer({ ...get(), soundVolume }); },
      setKeyboardLayout: (keyboardLayout) => { set({ keyboardLayout }); syncToServer({ ...get(), keyboardLayout }); },
      setAnimationSpeed: (animationSpeed) => { set({ animationSpeed }); syncToServer({ ...get(), animationSpeed }); },
      toggleSmoothCaret: () => set((s) => {
        const next = !s.smoothCaret;
        syncToServer({ ...s, smoothCaret: next });
        return { smoothCaret: next };
      }),
      toggleConfidenceMode: () => set((s) => {
        const next = !s.confidenceMode;
        syncToServer({ ...s, confidenceMode: next });
        return { confidenceMode: next };
      }),
      toggleStopOnError: () => set((s) => {
        const next = !s.stopOnError;
        syncToServer({ ...s, stopOnError: next });
        return { stopOnError: next };
      }),
      resetToDefaults: () => {
        const defaults = {
          font: 'JetBrains Mono',
          fontSize: 16,
          cursorStyle: 'line',
          cursorBlink: true,
          soundEnabled: false,
          animationSpeed: 'normal',
          smoothCaret: true,
          confidenceMode: false,
          stopOnError: false,
        };
        set(defaults);
        syncToServer({ ...get(), ...defaults });
      },
    }),
    { name: 'ct_settings' }
  )
);
