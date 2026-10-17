import { useEffect, useRef, useState } from 'react';

export const useTimer = (isRunning) => {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      if (!startRef.current) startRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed((Date.now() - startRef.current) / 1000);
      }, 100);
    } else {
      clearInterval(intervalRef.current);
      if (!isRunning) startRef.current = null;
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const reset = () => {
    setElapsed(0);
    startRef.current = null;
  };

  return { elapsed, reset };
};
