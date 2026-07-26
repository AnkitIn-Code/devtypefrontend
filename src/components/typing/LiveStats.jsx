import { motion } from 'framer-motion';
import { RotateCcw, Pause, Play, Maximize2, Minimize2 } from 'lucide-react';
import { formatTime, calculateProgress } from '@utils/typing.utils';

export const LiveStats = ({ wpm, rawWpm, accuracy, errors, elapsedTime, currentIndex, totalChars, status, onRestart, onPause, onFullscreen, isFullscreen }) => {
  const progress = calculateProgress(currentIndex, totalChars);

  const stats = [
    { label: 'WPM', value: wpm, color: 'text-primary' },
    { label: 'RAW', value: rawWpm, color: 'text-text-secondary' },
    { label: 'ACC', value: `${accuracy}%`, color: accuracy >= 95 ? 'text-success' : accuracy >= 80 ? 'text-warning' : 'text-error' },
    { label: 'ERR', value: errors, color: errors > 0 ? 'text-error' : 'text-muted' },
    { label: 'TIME', value: formatTime(elapsedTime), color: 'text-text-secondary' },
    { label: 'CHARS', value: `${currentIndex}/${totalChars}`, color: 'text-muted' },
  ];

  return (
    <div className="space-y-3">
      {/* Stats Row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6 flex-wrap">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <motion.div
                key={s.value}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className={`text-2xl font-black font-mono ${s.color}`}
              >
                {s.value}
              </motion.div>
              <div className="text-xs text-muted uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPause}
            className="p-2 rounded-xl text-muted hover:text-text-primary hover:bg-surface-2 transition-all"
            title={status === 'paused' ? 'Resume' : 'Pause'}
          >
            {status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            onClick={onRestart}
            className="p-2 rounded-xl text-muted hover:text-primary hover:bg-primary/10 transition-all"
            title="Restart (Tab+Enter)"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onFullscreen}
            className="p-2 rounded-xl text-muted hover:text-text-primary hover:bg-surface-2 transition-all"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-yellow-300 rounded-full"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
};
