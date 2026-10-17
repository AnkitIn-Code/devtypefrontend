import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3, ChevronRight, Zap, Target, Clock, Trophy,
  TrendingUp, Sparkles, Filter, ArrowUpRight, Code2, Layers,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { AppLayout } from '@layouts/AppLayout';
import { Spinner } from '@components/common/Badge';
import { reportsApi } from '@api/reports.api';
import { ROUTES } from '@constants';
import { formatRelativeTime, formatDuration } from '@utils/format.utils';

const formatLanguageName = (lang = '') => {
  const l = (lang || '').toLowerCase();
  if (l === 'cpp' || l === 'c++') return 'C++';
  if (l === 'javascript' || l === 'js') return 'JavaScript';
  if (l === 'typescript' || l === 'ts') return 'TypeScript';
  if (l === 'python' || l === 'py') return 'Python';
  if (l === 'java') return 'Java';
  if (l === 'rust') return 'Rust';
  if (l === 'go' || l === 'golang') return 'Go';
  if (l === 'mixed' || !l) return 'C++';
  return lang.charAt(0).toUpperCase() + lang.slice(1);
};

const getLanguageIcon = (lang = '') => {
  const l = (lang || '').toLowerCase();
  if (l.includes('java') && !l.includes('script')) return '☕';
  if (l.includes('javascript') || l === 'js') return '🟨';
  if (l.includes('typescript') || l === 'ts') return '🔷';
  if (l.includes('python') || l === 'py') return '🐍';
  if (l.includes('cpp') || l === 'c++' || l === 'c' || l === 'mixed') return '⚡';
  if (l.includes('rust')) return '🦀';
  if (l.includes('go')) return '🐹';
  if (l.includes('html') || l.includes('css')) return '🎨';
  return '💻';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="p-3 rounded-2xl border shadow-xl text-xs space-y-1.5"
        style={{
          background: 'rgba(18, 19, 28, 0.95)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p className="font-bold text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Session #{label}
        </p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 font-mono font-bold">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}:
            </span>
            <span className="text-white">
              {entry.value} {entry.name === 'WPM' ? 'wpm' : '%'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Reports = () => {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState('ALL');

  const { data: reports = [], isLoading: reportsLoading, isRefetching: reportsRefetching, refetch: refetchReports } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.getAll,
    select: d => d.data || [],
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: langStats = [], isRefetching: langRefetching, refetch: refetchLangStats } = useQuery({
    queryKey: ['lang-stats'],
    queryFn: reportsApi.getLanguageStats,
    select: d => d.data || [],
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: stats, isRefetching: statsRefetching, refetch: refetchStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: reportsApi.getStats,
    select: d => d.data,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const isRefreshing = reportsRefetching || langRefetching || statsRefetching;

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchReports(), refetchLangStats(), refetchStats()]);
      toast.success('Analytics & reports updated!');
    } catch {
      toast.error('Failed to refresh reports.');
    }
  };

  // Filtered reports
  const filteredReports = selectedLang === 'ALL'
    ? reports
    : reports.filter(r => (r.language || '').toLowerCase() === selectedLang.toLowerCase());

  // Build WPM timeline for chart
  const wpmData = filteredReports.slice().reverse().map((r, i) => ({
    index: i + 1,
    wpm: Math.round(r.wpm || 0),
    accuracy: Math.round(r.accuracy || 0),
    date: new Date(r.completedAt || r.createdAt || Date.now()).toLocaleDateString(),
  }));

  // Unique languages for filter pills
  const availableLanguages = ['ALL', ...Array.from(new Set(reports.map(r => (r.language || '').toLowerCase()).filter(Boolean)))];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))',
                  border: '1px solid rgba(168,85,247,0.3)',
                  color: 'var(--accent-light)',
                }}
              >
                <BarChart3 size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Performance & Analytics
                </h1>
                <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {reports.length} practice session{reports.length === 1 ? '' : 's'} recorded · Real-time typing insights
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || reportsLoading}
              className="px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all duration-150 hover:scale-105 disabled:opacity-60"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-violet-400' : 'text-violet-400'} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Reports'}</span>
            </button>

            <button
              onClick={() => navigate(ROUTES.TEMPLATES)}
              className="px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all duration-150 hover:scale-105"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <Code2 size={14} style={{ color: 'var(--accent-light)' }} />
              <span>Practice New Code</span>
              <ArrowUpRight size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        {/* 4 Hero KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Personal Best',
                value: `${stats.bestWpm || 0}`,
                unit: 'WPM',
                icon: Trophy,
                accentColor: '#f59e0b',
                bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.02))',
                borderColor: 'rgba(245,158,11,0.25)',
              },
              {
                label: 'Avg Accuracy',
                value: `${stats.avgAccuracy || 0}`,
                unit: '%',
                icon: Target,
                accentColor: '#10b981',
                bgGradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.02))',
                borderColor: 'rgba(16,185,129,0.25)',
              },
              {
                label: 'Time Practiced',
                value: formatDuration(stats.totalTimeMs ? Math.round(stats.totalTimeMs / 1000) : stats.totalTime || 0),
                unit: '',
                icon: Clock,
                accentColor: '#38bdf8',
                bgGradient: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.02))',
                borderColor: 'rgba(56,189,248,0.25)',
              },
              {
                label: 'Total Sessions',
                value: `${stats.totalSessions ?? stats.totalTests ?? reports.length ?? 0}`,
                unit: 'Runs',
                icon: Zap,
                accentColor: '#c084fc',
                bgGradient: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.02))',
                borderColor: 'rgba(168,85,247,0.25)',
              },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-3xl p-5 border shadow-sm relative overflow-hidden flex flex-col justify-between"
                  style={{
                    background: s.bgGradient,
                    borderColor: s.borderColor,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                      {s.label}
                    </span>
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.25)', color: s.accentColor }}
                    >
                      <Icon size={16} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {s.value}
                      </span>
                      {s.unit && (
                        <span className="text-xs font-bold uppercase font-mono" style={{ color: s.accentColor }}>
                          {s.unit}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Charts Section: WPM & Accuracy Trend + Language Proficiency */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Progression Area Chart (7 Cols) */}
          <div
            className="lg:col-span-7 rounded-3xl p-6 border shadow-md space-y-5"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <TrendingUp size={16} style={{ color: 'var(--accent-light)' }} />
                  <span>Speed & Accuracy Progression</span>
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Interactive timeline of your typing metrics across tests
                </p>
              </div>

              {/* Legend Badges */}
              <div className="flex items-center gap-3 text-[11px] font-mono font-bold">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ background: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.3)', color: '#c084fc' }}>
                  <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" /> WPM
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Accuracy
                </span>
              </div>
            </div>

            {wpmData.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={wpmData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="accGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.25)" vertical={false} />
                    <XAxis dataKey="index" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="wpm"
                      stroke="#a855f7"
                      strokeWidth={2.5}
                      fill="url(#wpmGradient)"
                      dot={{ r: 5, strokeWidth: 2, fill: '#a855f7', stroke: '#ffffff' }}
                      activeDot={{ r: 7 }}
                      name="WPM"
                    />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#accGradient)"
                      dot={{ r: 5, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff' }}
                      activeDot={{ r: 7 }}
                      name="Accuracy"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2" style={{ color: 'var(--text-muted)' }}>
                <Sparkles size={24} className="opacity-40" />
                <p className="text-xs">Complete practice sessions to unlock your historical speed graphs.</p>
              </div>
            )}
          </div>

          {/* Language Proficiency (5 Cols) */}
          <div
            className="lg:col-span-5 rounded-3xl p-6 border shadow-md space-y-5 flex flex-col justify-between"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Layers size={16} style={{ color: 'var(--accent-light)' }} />
                <span>Language Proficiency</span>
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Average speed and completion by programming language
              </p>
            </div>

            {langStats.length > 0 ? (
              <div className="space-y-4 pt-1">
                {langStats.map(l => (
                  <div key={l.language} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                        <span>{getLanguageIcon(l.language)}</span>
                        <span>{formatLanguageName(l.language)}</span>
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[11px] font-bold" style={{ color: 'var(--accent-light)' }}>
                          {l.avgWpm} WPM
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          ({l.tests || 1} test{l.tests === 1 ? '' : 's'})
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-2)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((l.avgWpm || 1) / 120) * 100, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, var(--accent), #6366f1)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-2" style={{ color: 'var(--text-muted)' }}>
                <Code2 size={24} className="opacity-40" />
                <p className="text-xs">Practice code in C++, Python, JavaScript or Java to see language breakdowns.</p>
              </div>
            )}

            <div className="pt-3 border-t text-[11px] flex items-center justify-between" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <span>Target Standard</span>
              <span className="font-mono font-bold text-white">80+ WPM Mastery</span>
            </div>
          </div>
        </div>

        {/* Sessions History List with Filter Pills */}
        <div
          className="rounded-3xl p-6 border shadow-md space-y-5"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Practice History
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Click any session to view complete keystroke diagnostics and keyboard error heatmaps
              </p>
            </div>

            {/* Filter Pills */}
            {availableLanguages.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {availableLanguages.map(lang => {
                  const isSelected = selectedLang === lang;
                  return (
                    <button
                      key={lang}
                      onClick={() => setSelectedLang(lang)}
                      className="px-3 py-1 rounded-full text-xs font-bold border transition-all duration-150 capitalize shrink-0"
                      style={{
                        background: isSelected ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                        color: isSelected ? 'var(--accent-light)' : 'var(--text-secondary)',
                      }}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {reportsLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <div className="space-y-2.5">
              {filteredReports.map((r, index) => (
                <motion.div
                  key={r.id || index}
                  whileHover={{ scale: 1.008, x: 3 }}
                  onClick={() => navigate(`${ROUTES.REPORTS}/${r.id}`)}
                  className="p-4 rounded-2xl border flex items-center justify-between gap-4 cursor-pointer transition-all duration-150 group"
                  style={{
                    background: 'var(--bg-surface-2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 border"
                      style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      {getLanguageIcon(r.language)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold truncate group-hover:text-violet-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                          {r.snippetTitle || r.templateTitle || 'Practice Session'}
                        </h4>
                        {r.language && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border hidden sm:inline-block" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--accent-light)' }}>
                            {formatLanguageName(r.language)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>
                        {formatRelativeTime(r.createdAt || r.completedAt)} · {formatDuration(r.durationMs ? Math.round(r.durationMs / 1000) : r.duration || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    {/* WPM & Accuracy Pill */}
                    <div className="text-right font-mono">
                      <div className="text-sm sm:text-base font-black flex items-center justify-end gap-1" style={{ color: 'var(--accent-light)' }}>
                        <span>{Math.round(r.wpm || 0)}</span>
                        <span className="text-[10px] font-bold text-muted">WPM</span>
                      </div>
                      <div className="text-[11px] font-bold" style={{ color: (r.accuracy || 100) >= 95 ? '#34d399' : '#fbbf24' }}>
                        {Math.round(r.accuracy || 100)}% acc
                      </div>
                    </div>

                    {/* XP & Errors */}
                    <div className="text-right font-mono hidden md:block">
                      <div className="text-xs font-bold" style={{ color: (r.errorCount ?? r.errors) > 0 ? '#f87171' : 'var(--text-muted)' }}>
                        {r.errorCount ?? r.errors ?? 0} errors
                      </div>
                      <div className="text-[10px] font-bold text-amber-400">
                        {r.xpEarned ? `+${r.xpEarned} XP` : 'Verified'}
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full flex items-center justify-center group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredReports.length === 0 && (
                <div className="text-center py-14 space-y-2" style={{ color: 'var(--text-muted)' }}>
                  <Code2 size={28} className="mx-auto opacity-40" />
                  <p className="text-xs font-medium">No sessions found for this selection.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
