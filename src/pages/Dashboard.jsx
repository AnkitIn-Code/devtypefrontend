import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Zap, TrendingUp, Target, Clock, Flame, Trophy, FileCode2, BarChart3, Play, Plus, ArrowRight
} from 'lucide-react';
import { AppLayout } from '@layouts/AppLayout';
import { useAuthStore } from '@store/auth.store';
import { reportsApi } from '@api/reports.api';
import { templatesApi } from '@api/templates.api';
import { formatDuration, formatNumber, formatRelativeTime, getLanguageLabel, getDifficultyColor } from '@utils/format.utils';
import { formatTime } from '@utils/typing.utils';
import { ROUTES } from '@constants';

const StatCard = ({ icon: Icon, label, value, sublabel, color = 'text-primary' }) => (
  <motion.div
    whileHover={{ y: -2 }}
    className="glass-card p-5 flex flex-col gap-2"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted uppercase tracking-wider font-medium">{label}</span>
      <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
        <Icon size={16} />
      </div>
    </div>
    <span className={`text-3xl font-black ${color}`}>{value}</span>
    {sublabel && <span className="text-xs text-muted">{sublabel}</span>}
  </motion.div>
);

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: statsData } = useQuery({
    queryKey: ['user-stats'],
    queryFn: reportsApi.getStats,
    select: (d) => d.data,
  });

  const { data: templates } = useQuery({
    queryKey: ['templates-recent'],
    queryFn: () => templatesApi.getAll(),
    select: (d) => d.data.slice(0, 4),
  });

  const { data: reports } = useQuery({
    queryKey: ['reports-recent'],
    queryFn: reportsApi.getAll,
    select: (d) => d.data.slice(0, 5),
  });

  const stats = statsData || {};

  const quickStats = [
    { icon: Zap, label: 'Best WPM', value: stats.bestWpm || '--', sublabel: 'Personal record', color: 'text-primary' },
    { icon: Target, label: 'Avg Accuracy', value: stats.avgAccuracy ? `${stats.avgAccuracy}%` : '--', sublabel: 'All time average', color: 'text-success' },
    { icon: TrendingUp, label: 'Avg WPM', value: stats.avgWpm || '--', sublabel: 'Last 30 days', color: 'text-info' },
    { icon: Flame, label: 'Current Streak', value: stats.currentStreak ? `${stats.currentStreak}d` : '--', sublabel: `Best: ${stats.longestStreak || 0}d`, color: 'text-error' },
    { icon: FileCode2, label: 'Total Tests', value: stats.totalTests ? formatNumber(stats.totalTests) : '--', sublabel: 'Completed sessions', color: 'text-purple-400' },
    { icon: Clock, label: 'Time Practiced', value: stats.totalTime ? formatDuration(stats.totalTime) : '--', sublabel: 'Total practice time', color: 'text-warning' },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              <span className="text-primary">{user?.name?.split(' ')[0] || 'Developer'}</span> 👋
            </h1>
            <p className="text-text-secondary mt-1 text-sm">Ready to crush your record today?</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(ROUTES.AI_TEMPLATE)}
              className="btn-outline text-sm px-4 py-2.5 rounded-xl flex items-center gap-2"
            >
              <Plus size={16} /> AI Generate
            </button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(ROUTES.TYPING)}
              className="btn-primary text-sm px-5 py-2.5 rounded-xl flex items-center gap-2"
            >
              <Play size={16} /> Start Typing
            </motion.button>
          </div>
        </motion.div>

        {/* XP Bar */}
        {user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4 flex items-center gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-black text-sm">Lv{user.level || 1}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Level {user.level || 1}</p>
                <p className="text-xs text-muted">{user.xp?.toLocaleString() || 0} XP</p>
              </div>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((user.xp || 0) / (user.xpToNext || 10000)) * 100, 100)}%` }}
                  transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-primary to-yellow-300 rounded-full"
                />
              </div>
              <p className="text-xs text-muted mt-1">{(user.xpToNext || 10000) - (user.xp || 0)} XP to Level {(user.level || 1) + 1}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
              <Trophy size={14} className="text-primary" />
              <span className="text-sm font-semibold text-primary">{user.credits || 0} Credits</span>
            </div>
          </motion.div>
        )}

        {/* Quick Stats Grid */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">Your Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <StatCard {...stat} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Reports + Templates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <BarChart3 size={18} className="text-primary" /> Recent Sessions
              </h3>
              <button onClick={() => navigate(ROUTES.REPORTS)} className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {reports?.map((r) => (
                <div
                  key={r.id}
                  onClick={() => navigate(`${ROUTES.REPORTS}/${r.id}`)}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-2/50 cursor-pointer transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-lg shrink-0">
                    {r.language === 'java' ? '☕' : r.language === 'javascript' ? '🟨' : r.language === 'python' ? '🐍' : '💻'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{r.templateTitle}</p>
                    <p className="text-xs text-muted">{formatRelativeTime(r.completedAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{r.wpm} WPM</p>
                    <p className="text-xs text-muted">{r.accuracy}% acc</p>
                  </div>
                </div>
              ))}
              {!reports?.length && (
                <div className="text-center py-8">
                  <p className="text-muted text-sm">No sessions yet. Start practicing!</p>
                  <button onClick={() => navigate(ROUTES.TYPING)} className="mt-2 text-sm text-primary hover:underline">
                    Go to typing →
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Trending Templates */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <FileCode2 size={18} className="text-primary" /> Trending Templates
              </h3>
              <button onClick={() => navigate(ROUTES.TEMPLATES)} className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1">
                Browse all <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {templates?.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`${ROUTES.TYPING}/${t.id}`)}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-2/50 cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted">{getLanguageLabel(t.language)}</span>
                      <span className="text-muted">·</span>
                      <span className={`text-xs font-medium ${getDifficultyColor(t.difficulty)}`}>{t.difficulty}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted">{formatNumber(t.plays)} plays</p>
                    <p className="text-xs text-muted">♥ {formatNumber(t.likes)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
