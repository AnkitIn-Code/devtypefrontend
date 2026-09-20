import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Zap, TrendingUp, Target, Clock, Flame, Trophy, FileCode2,
  BarChart3, Play, ArrowRight, Sparkles, ChevronRight,
  Code2, Cpu, Users, Medal
} from 'lucide-react';
import { AppLayout } from '@layouts/AppLayout';
import { useAuthStore } from '@store/auth.store';
import { reportsApi } from '@api/reports.api';
import { templatesApi } from '@api/templates.api';
import {
  formatDuration, formatNumber, formatRelativeTime,
  getLanguageLabel, getDifficultyColor
} from '@utils/format.utils';
import { ROUTES } from '@constants';

// --- Animation helpers ---
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
});

// --- Stat Card ---
const StatCard = ({ icon: Icon, label, value, sublabel, glowColor }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.02 }}
    transition={{ duration: 0.2 }}
    className="relative overflow-hidden rounded-2xl p-5 cursor-default"
    style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      boxShadow: `0 0 30px -10px ${glowColor}40`,
    }}
  >
    {/* Glow blob */}
    <div
      className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
      style={{ background: glowColor }}
    />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${glowColor}22` }}
        >
          <Icon size={15} style={{ color: glowColor }} />
        </div>
      </div>
      <div className="text-3xl font-black tracking-tight mb-1" style={{ color: glowColor }}>
        {value}
      </div>
      {sublabel && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {sublabel}
        </p>
      )}
    </div>
  </motion.div>
);

// --- Quick Action Card ---
const ActionCard = ({ icon: Icon, label, desc, href }) => {
  const navigate = useNavigate();
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(href)}
      className="relative cursor-pointer overflow-hidden rounded-2xl p-5 group"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Hover overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'var(--accent-dim)' }}
      />
      <div className="relative z-10 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-dim)' }}
        >
          <Icon size={20} style={{ color: 'var(--accent-light)' }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
        </div>
        <ChevronRight
          size={16}
          className="ml-auto group-hover:translate-x-1 transition-all"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>
    </motion.div>
  );
};

const LANG_EMOJI = {
  java: '☕', javascript: '🟡', python: '🐍', typescript: '🔷',
  cpp: '⚙️', rust: '🦀', go: '🐹',
};

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
    select: (d) => d.data.slice(0, 5),
  });

  const { data: reports } = useQuery({
    queryKey: ['reports-recent'],
    queryFn: reportsApi.getAll,
    select: (d) => d.data.slice(0, 5),
  });

  const stats = statsData || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Developer';
  const xpProgress = Math.min(((user?.xp || 0) / (user?.xpToNext || 10000)) * 100, 100);

  const quickStats = [
    { icon: Zap, label: 'Best WPM', value: stats.bestWpm || '--', sublabel: 'All-time record', glowColor: '#a78bfa' },
    { icon: Target, label: 'Avg Accuracy', value: stats.avgAccuracy ? `${stats.avgAccuracy}%` : '--', sublabel: 'All-time avg', glowColor: '#34d399' },
    { icon: TrendingUp, label: 'Avg WPM', value: stats.avgWpm || '--', sublabel: 'Last 30 days', glowColor: '#60a5fa' },
    { icon: Flame, label: 'Streak', value: stats.currentStreak ? `${stats.currentStreak}d` : '--', sublabel: `Best: ${stats.longestStreak || 0}d`, glowColor: '#f97316' },
    { icon: FileCode2, label: 'Sessions', value: stats.totalTests ? formatNumber(stats.totalTests) : '--', sublabel: 'Completed', glowColor: '#e879f9' },
    { icon: Clock, label: 'Practice Time', value: stats.totalTime ? formatDuration(stats.totalTime) : '--', sublabel: 'Total', glowColor: '#fbbf24' },
  ];

  const quickActions = [
    { icon: Play, label: 'Start Practice', desc: 'Jump into a typing session', href: ROUTES.TYPING },
    { icon: Cpu, label: 'AI Generator', desc: 'Generate a custom template', href: ROUTES.AI_TEMPLATE },
    { icon: Users, label: 'Multiplayer', desc: 'Race against friends', href: ROUTES.MULTIPLAYER },
    { icon: Trophy, label: 'Leaderboard', desc: 'See top performers', href: ROUTES.LEADERBOARD },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Hero Welcome Banner ── */}
        <motion.div
          {...fadeUp(0)}
          className="relative overflow-hidden rounded-3xl p-8"
          style={{
            background: 'linear-gradient(135deg, var(--accent-dim) 0%, var(--card-bg) 60%, rgba(79,70,229,0.08) 100%)',
            border: '1px solid var(--accent-border)',
          }}
        >
          {/* Soft glow blobs — theme-neutral opacity */}
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'var(--accent)', opacity: 0.08 }}
          />
          <div
            className="absolute bottom-0 left-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: '#4f46e5', opacity: 0.06 }}
          />

          {/* Decorative icon */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.04 }}>
            <Code2 size={180} style={{ color: 'var(--accent)' }} />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent-light)' }}>
                {greeting} 👋
              </p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>
                Welcome back,{' '}
                <span style={{ color: 'var(--accent-light)' }}>{firstName}</span>
              </h1>
              <p className="mt-2 text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
                Ready to set a new personal record today? Your last session was great — keep pushing!
              </p>

              {/* XP Progress */}
              {user && (
                <div className="mt-4 flex items-center gap-3 max-w-xs">
                  <div className="text-xs font-bold w-12 shrink-0" style={{ color: 'var(--accent-light)' }}>
                    Lv {user.level || 1}
                  </div>
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--border)' }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgress}%` }}
                      transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, var(--accent), #4f46e5)' }}
                    />
                  </div>
                  <div className="text-xs w-20 shrink-0 text-right" style={{ color: 'var(--text-muted)' }}>
                    {(user.xp || 0).toLocaleString()} / {(user.xpToNext || 10000).toLocaleString()} XP
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(ROUTES.AI_TEMPLATE)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  border: '1px solid var(--accent-border)',
                  color: 'var(--accent-light)',
                  background: 'var(--accent-dim)',
                }}
              >
                <Sparkles size={15} /> AI Generate
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(ROUTES.TYPING)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                  boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
                }}
              >
                <Play size={15} /> Start Typing
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div>
          <motion.div {...fadeUp(0.05)} className="flex items-center justify-between mb-4">
            <h2
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Performance Overview
            </h2>
            <button
              onClick={() => navigate(ROUTES.REPORTS)}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--accent-light)' }}
            >
              All Reports <ArrowRight size={12} />
            </button>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {quickStats.map((stat, i) => (
              <motion.div key={stat.label} {...fadeUp(0.08 + i * 0.04)}>
                <StatCard {...stat} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <motion.div {...fadeUp(0.15)}>
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <ActionCard key={action.href} {...action} />
            ))}
          </div>
        </motion.div>

        {/* ── Recent Activity + Templates ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Recent Sessions — Left */}
          <motion.div {...fadeUp(0.2)} className="lg:col-span-7">
            <div
              className="rounded-2xl overflow-hidden h-full"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
            >
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <BarChart3 size={16} style={{ color: 'var(--accent-light)' }} /> Recent Sessions
                </h3>
                <button
                  onClick={() => navigate(ROUTES.REPORTS)}
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-light)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  View all <ArrowRight size={11} />
                </button>
              </div>

              <div>
                {reports?.map((r) => (
                  <motion.div
                    key={r.id}
                    onClick={() => navigate(`${ROUTES.REPORTS}/${r.id}`)}
                    className="flex items-center gap-4 px-6 py-4 cursor-pointer group"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    whileHover={{ backgroundColor: 'var(--accent-dim)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: 'var(--bg-surface-2)' }}
                    >
                      {LANG_EMOJI[r.language] || '💻'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {r.templateTitle}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatRelativeTime(r.completedAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-black font-mono" style={{ color: 'var(--accent-light)' }}>
                        {r.wpm} WPM
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.accuracy}% acc</p>
                    </div>
                    <ChevronRight
                      size={14}
                      className="group-hover:translate-x-1 transition-all shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </motion.div>
                ))}

                {!reports?.length && (
                  <div className="px-6 py-12 text-center">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: 'var(--accent-dim)' }}
                    >
                      <BarChart3 size={22} style={{ color: 'var(--accent)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      No sessions yet
                    </p>
                    <button
                      onClick={() => navigate(ROUTES.TYPING)}
                      className="mt-3 text-xs font-semibold transition-colors"
                      style={{ color: 'var(--accent-light)' }}
                    >
                      Start your first session →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column */}
          <div className="lg:col-span-5 flex flex-col gap-5">

            {/* Trending Templates */}
            <motion.div {...fadeUp(0.25)}>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
              >
                <div
                  className="flex items-center justify-between px-6 py-4"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <FileCode2 size={16} className="text-cyan-400" /> Trending Templates
                  </h3>
                  <button
                    onClick={() => navigate(ROUTES.TEMPLATES)}
                    className="text-xs flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-light)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    Browse <ArrowRight size={11} />
                  </button>
                </div>

                <div>
                  {templates?.map((t) => (
                    <motion.div
                      key={t.id}
                      onClick={() => navigate(`${ROUTES.TYPING}/${t.id}`)}
                      className="flex items-center gap-3 px-6 py-3.5 cursor-pointer group"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      whileHover={{ backgroundColor: 'var(--accent-dim)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate transition-colors"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {getLanguageLabel(t.language)}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>·</span>
                          <span className={`text-[11px] font-semibold ${getDifficultyColor(t.difficulty)}`}>
                            {t.difficulty}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {formatNumber(t.plays)} plays
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          ♥ {formatNumber(t.likes)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Achievements teaser */}
            <motion.div {...fadeUp(0.3)}>
              <div
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.04))',
                  border: '1px solid rgba(245,158,11,0.15)',
                }}
              >
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy size={16} className="text-amber-400" />
                      <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        Achievements
                      </h4>
                    </div>
                    <p className="text-xs max-w-[180px]" style={{ color: 'var(--text-muted)' }}>
                      Complete challenges to unlock badges and earn XP
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(ROUTES.ACHIEVEMENTS)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/25 transition-all shrink-0"
                    style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.20)' }}
                  >
                    <Medal size={13} /> View
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
