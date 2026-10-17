// Typing utility functions

/**
 * Calculate WPM from correct characters and elapsed seconds
 */
export const calculateWpm = (correctChars, elapsedSeconds) => {
  if (elapsedSeconds <= 0) return 0;
  const minutes = elapsedSeconds / 60;
  return Math.round(correctChars / 5 / minutes);
};

/**
 * Calculate accuracy from correct and total keystrokes
 */
export const calculateAccuracy = (correct, total) => {
  if (total === 0) return 100;
  return parseFloat(((correct / total) * 100).toFixed(1));
};

/**
 * Calculate consistency (lower std deviation = more consistent)
 */
export const calculateConsistency = (wpmHistory) => {
  if (wpmHistory.length < 2) return 100;
  const wpms = wpmHistory.map(h => h.wpm);
  const avg = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  const variance = wpms.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / wpms.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, Math.round(100 - (stdDev / avg) * 100));
};

/**
 * Format elapsed time as MM:SS
 */
export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Get character class based on status
 */
export const getCharClass = (status) => {
  switch (status) {
    case 'correct': return 'char-correct';
    case 'wrong': return 'char-wrong';
    case 'current': return 'char-current';
    default: return 'char-remaining';
  }
};

/**
 * Calculate progress percentage
 */
export const calculateProgress = (currentIndex, totalChars) => {
  if (totalChars === 0) return 0;
  return Math.round((currentIndex / totalChars) * 100);
};
