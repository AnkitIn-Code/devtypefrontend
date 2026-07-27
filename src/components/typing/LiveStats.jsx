import { motion } from 'framer-motion';
import { RotateCcw, Pause, Play, Maximize2, Minimize2, Activity, Zap, Target, AlertTriangle, Clock } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatTime, calculateProgress } from '@utils/typing.utils';

export const LiveStats = ({
  wpm,
  rawWpm,
  accuracy,
  errors,
  elapsedTime,
  currentIndex,
  totalChars,
  status,
  wpmHistory = [],
  onRestart,
  onPause,
  onFullscreen,
  isFullscreen,
}) => {
  const progress = calculateProgress(currentIndex, totalChars);

  // Format chart data
  const chartData = wpmHistory.length > 0
    ? wpmHistory.map((item, idx) => ({
        time: `${idx * 2}s`,
        wpm: item.wpm || 0,
        accuracy: item.accuracy ?? 100,
      }))
    : [{ time: '0s', wpm: 0, accuracy: 100 }];

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-primary animate-pulse" />
          <h3 className="font-semibold text-sm text-text-primary tracking-wide">Live Performance Analytics</h3>
        </div>

        <div className="flex items-center gap-1.5">
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
            title="Restart (Tab)"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onFullscreen}
            className="p-2 rounded-xl text-muted hover:text-text-primary hover:bg-surface-2 transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-2/40 border border-border/40 p-3.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium mb-1">
            <Zap size={14} className="text-primary" /> Speed (WPM)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-primary">{wpm}</span>
            <span className="text-xs text-muted font-mono">Raw: {rawWpm}</span>
          </div>
        </div>

        <div className="bg-surface-2/40 border border-border/40 p-3.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium mb-1">
            <Target size={14} className="text-emerald-400" /> Accuracy
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${accuracy >= 95 ? 'text-emerald-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-rose-400'}`}>
              {accuracy}%
            </span>
          </div>
        </div>

        <div className="bg-surface-2/40 border border-border/40 p-3.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium mb-1">
            <AlertTriangle size={14} className={errors > 0 ? 'text-rose-400' : 'text-muted'} /> Errors
          </div>
          <span className={`text-2xl font-bold font-mono ${errors > 0 ? 'text-rose-400' : 'text-text-primary'}`}>
            {errors}
          </span>
        </div>

        <div className="bg-surface-2/40 border border-border/40 p-3.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium mb-1">
            <Clock size={14} className="text-sky-400" /> Elapsed Time
          </div>
          <span className="text-2xl font-bold font-mono text-text-primary">
            {formatTime(elapsedTime)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted mb-1.5">
          <span>Overall Progress</span>
          <span className="font-mono font-medium">{Math.round(progress)}% ({currentIndex}/{totalChars})</span>
        </div>
        <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-yellow-400 to-emerald-400 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Real-Time Chart: WPM vs Accuracy */}
      <div className="pt-2 border-t border-border/40">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-text-secondary font-medium">Live WPM & Accuracy Curve</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-primary">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> WPM
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Accuracy
            </span>
          </div>
        </div>

        <div className="h-44 w-full bg-surface-2/20 rounded-xl p-2 border border-border/30">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="accGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ padding: '2px 0' }}
              />
              <Area type="monotone" dataKey="wpm" name="WPM" stroke="#eab308" strokeWidth={2.5} fillOpacity={1} fill="url(#wpmGradient)" />
              <Area type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#accGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
