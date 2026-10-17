import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, BarChart3, Home, Zap, Target, Clock, AlertTriangle, Award, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatTime, calculateConsistency } from '@utils/typing.utils';
import { ROUTES } from '@constants';

export const TypingResults = ({
  wpm,
  rawWpm,
  accuracy,
  errors,
  elapsedTime,
  wpmHistory = [],
  totalChars,
  onRestart,
  failedSubmission = false,
  isRetrying = false,
  onRetrySubmission,
}) => {
  const navigate = useNavigate();
  const consistency = calculateConsistency(wpmHistory);

  const getRankTier = (speed) => {
    if (speed >= 120) return { label: 'GRANDMASTER', emoji: '👑', color: '#ec4899' };
    if (speed >= 90) return { label: 'MASTER', emoji: '🏆', color: '#a855f7' };
    if (speed >= 70) return { label: 'DIAMOND', emoji: '💎', color: '#38bdf8' };
    if (speed >= 50) return { label: 'GOLD', emoji: '🥇', color: '#f59e0b' };
    return { label: 'PRO', emoji: '⚡', color: '#10b981' };
  };

  const rank = getRankTier(wpm);

  const chartData = wpmHistory.length > 0 ? wpmHistory.map((item, idx) => ({
    time: `${idx + 1}s`,
    wpm: Math.round(item.wpm || wpm || 0),
  })) : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto border shadow-2xl space-y-7 relative overflow-hidden"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}
    >
      {/* EDGE-04: Submission failure recovery banner */}
      {failedSubmission && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-rose-400 font-semibold">
            <AlertTriangle size={16} />
            <span>Session not saved (server connection error).</span>
          </div>
          {onRetrySubmission && (
            <button
              onClick={onRetrySubmission}
              disabled={isRetrying}
              className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw size={12} className={isRetrying ? 'animate-spin' : ''} />
              <span>{isRetrying ? 'Retrying...' : 'Retry Submission'}</span>
            </button>
          )}
        </div>
      )}

      {/* Top Trophy & Celebration Banner */}

      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', damping: 10 }}
          className="text-5xl inline-block drop-shadow-lg"
        >
          {rank.emoji}
        </motion.div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-mono font-black uppercase tracking-wider px-3 py-1 rounded-full border" style={{ background: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.3)', color: rank.color }}>
              Rank Tier: {rank.label}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {wpm >= 100 ? 'Exceptional Execution!' : wpm >= 80 ? 'Masterful Speed!' : wpm >= 60 ? 'Solid Coding Session!' : 'Great Practice Run!'}
          </h2>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Your session metrics have been calculated and verified
          </p>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Net Speed', value: `${wpm}`, unit: 'WPM', color: 'var(--accent-light)' },
          { label: 'Accuracy', value: `${accuracy}`, unit: '%', color: accuracy >= 95 ? '#34d399' : '#fbbf24' },
          { label: 'Raw Speed', value: `${rawWpm}`, unit: 'WPM', color: 'var(--text-secondary)' },
          { label: 'Consistency', value: `${consistency}`, unit: '%', color: '#38bdf8' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl border text-center space-y-1"
            style={{
              background: 'var(--bg-surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight" style={{ color: stat.color }}>
                {stat.value}
              </span>
              <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text-muted)' }}>
                {stat.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Metrics Pill Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Errors</div>
          <div className="text-base font-black font-mono mt-0.5" style={{ color: errors > 0 ? '#f87171' : '#34d399' }}>
            {errors}
          </div>
        </div>

        <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Time Elapsed</div>
          <div className="text-base font-black font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {formatTime(elapsedTime)}
          </div>
        </div>

        <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Characters</div>
          <div className="text-base font-black font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {totalChars}
          </div>
        </div>
      </div>

      {/* Speed Progression Curve */}
      {chartData.length > 2 && (
        <div
          className="p-5 rounded-2xl border space-y-3"
          style={{
            background: 'var(--bg-surface-2)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Speed Graph (WPM vs Time)
            </span>
            <span className="font-mono font-bold text-[11px]" style={{ color: 'var(--accent-light)' }}>
              Peak: {Math.max(...chartData.map(d => d.wpm))} WPM
            </span>
          </div>

          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="resultWpmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(18, 19, 28, 0.95)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                />
                <Area type="monotone" dataKey="wpm" stroke="#a855f7" strokeWidth={2} fill="url(#resultWpmGrad)" name="WPM" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRestart}
          className="px-6 py-3 rounded-full text-xs font-bold text-white shadow-lg shadow-violet-500/25 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
        >
          <RotateCcw size={15} />
          <span>Practice Again</span>
        </motion.button>

        <button
          onClick={() => navigate(ROUTES.REPORTS)}
          className="px-5 py-3 rounded-full text-xs font-bold border flex items-center gap-2 transition-all duration-150 hover:scale-102"
          style={{
            background: 'var(--bg-surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <BarChart3 size={15} style={{ color: 'var(--accent-light)' }} />
          <span>View Detailed Diagnostics</span>
          <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
        </button>

        <button
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="px-5 py-3 rounded-full text-xs font-bold border flex items-center gap-2 transition-all duration-150 hover:scale-102"
          style={{
            background: 'transparent',
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <Home size={15} />
          <span>Dashboard</span>
        </button>
      </div>
    </motion.div>
  );
};
