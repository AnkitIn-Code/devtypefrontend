import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, BarChart3, Home, Share2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatTime, calculateConsistency } from '@utils/typing.utils';
import { ROUTES } from '@constants';

const ResultStat = ({ label, value, color = 'text-primary', large = false }) => (
  <div className="text-center p-4">
    <div className={`font-black font-mono ${large ? 'text-5xl' : 'text-3xl'} ${color}`}>{value}</div>
    <div className="text-xs text-muted uppercase tracking-widest mt-1">{label}</div>
  </div>
);

export const TypingResults = ({ wpm, rawWpm, accuracy, errors, elapsedTime, wpmHistory, totalChars, onRestart }) => {
  const navigate = useNavigate();
  const consistency = calculateConsistency(wpmHistory);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass-card p-8 max-w-3xl mx-auto"
    >
      {/* Trophy */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 12 }}
          className="text-6xl mb-3"
        >
          {wpm >= 100 ? '🏆' : wpm >= 80 ? '🥇' : wpm >= 60 ? '🎯' : '💪'}
        </motion.div>
        <h2 className="text-2xl font-bold text-text-primary">
          {wpm >= 100 ? 'Incredible!' : wpm >= 80 ? 'Great Job!' : wpm >= 60 ? 'Good Work!' : 'Keep Practicing!'}
        </h2>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 border-b border-t border-border py-6">
        <ResultStat label="WPM" value={wpm} large />
        <ResultStat label="Accuracy" value={`${accuracy}%`} color={accuracy >= 95 ? 'text-success' : 'text-warning'} large />
        <ResultStat label="Raw WPM" value={rawWpm} color="text-text-secondary" />
        <ResultStat label="Consistency" value={`${consistency}%`} color="text-info" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 text-center">
        <div>
          <div className="text-xl font-bold text-error">{errors}</div>
          <div className="text-xs text-muted">Errors</div>
        </div>
        <div>
          <div className="text-xl font-bold text-text-secondary">{formatTime(elapsedTime)}</div>
          <div className="text-xs text-muted">Time</div>
        </div>
        <div>
          <div className="text-xl font-bold text-text-secondary">{totalChars}</div>
          <div className="text-xs text-muted">Characters</div>
        </div>
      </div>

      {/* WPM Chart */}
      {wpmHistory.length > 2 && (
        <div className="mb-8">
          <h4 className="text-sm text-muted mb-3 uppercase tracking-wider">WPM Over Time</h4>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={wpmHistory} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
              <XAxis dataKey="time" hide />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 8 }}
                labelStyle={{ color: '#A1A1AA' }}
                itemStyle={{ color: '#EAB308' }}
              />
              <Line type="monotone" dataKey="wpm" stroke="#EAB308" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={onRestart}
          className="btn-primary px-6 py-2.5 rounded-xl flex items-center gap-2"
        >
          <RotateCcw size={16} /> Try Again
        </motion.button>
        <button
          onClick={() => navigate(ROUTES.REPORTS)}
          className="btn-outline px-6 py-2.5 rounded-xl flex items-center gap-2"
        >
          <BarChart3 size={16} /> View Reports
        </button>
        <button
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="btn-ghost px-6 py-2.5 rounded-xl flex items-center gap-2"
        >
          <Home size={16} /> Dashboard
        </button>
      </div>
    </motion.div>
  );
};
