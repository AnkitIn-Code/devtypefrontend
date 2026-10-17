import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTypingStore } from '@store/typing.store';

export const useTyping = () => {
  const store = useTypingStore();
  const timerRef = useRef(null);

  // Start the elapsed time ticker
  useEffect(() => {
    if (store.status === 'running') {
      timerRef.current = setInterval(() => {
        store.tick();
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [store.status]);

  // BUG-H09: Tab visibility change listener to pause and adjust timer
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        store.onTabHidden();
      } else {
        store.onTabVisible();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // EDGE-05: Intercept paste attempts and notify user (only during typing tests, not in text areas/inputs)
  useEffect(() => {
    const handlePaste = (e) => {
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      toast.error('Pasting is disabled during typing tests', { id: 'no-paste' });
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (store.status === 'finished') return;

      // Do not intercept keystrokes if the user is typing into an input, textarea, or editable element (e.g. Bug Fix editor)
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable || e.target?.closest?.('.monaco-editor')) {
        return;
      }

      // EDGE-05: Catch Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        toast.error('Pasting is disabled during typing tests', { id: 'no-paste' });
        return;
      }

      // Esc key pauses/resumes
      if (e.key === 'Escape') {
        e.preventDefault();
        store.pause();
        return;
      }

      // EDGE-10: Tab key handling
      if (e.key === 'Tab') {
        e.preventDefault();
        const currentExpected = store.typedChars[store.currentIndex]?.char;
        if (currentExpected === '\t') {
          // If the snippet has a literal tab at current position, type the tab
          store.type('\t');
        } else if (currentExpected === ' ' && store.typedChars[store.currentIndex + 1]?.char === ' ') {
          // If indentation spaces
          store.type(' ');
        } else {
          // Otherwise, Tab serves as the quick restart hotkey
          store.reset();
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        store.type('\n');
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        store.type('Backspace');
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        store.type(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store.status, store.currentIndex, store.typedChars]);

  return store;
};
