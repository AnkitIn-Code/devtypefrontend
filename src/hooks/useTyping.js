import { useEffect, useRef } from 'react';
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

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (store.status === 'finished') return;

      // Allow Backspace, Tab (as spaces), and printable chars
      if (e.key === 'Tab') {
        e.preventDefault();
        store.type('  '); // Tab as two spaces
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
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        store.type(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store.status]);

  return store;
};
