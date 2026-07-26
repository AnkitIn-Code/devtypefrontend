import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, ChevronRight, Zap, Target, Clock } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { AppLayout } from '@layouts/AppLayout';
import { Badge, Spinner } from '@components/common/Badge';
import { reportsApi } from '@api/reports.api';
import { ROUTES } from '@constants';
import { formatRelativeTime, formatDuration, getDifficultyColor } from '@utils/format.utils';

const Reports = () => {
  const navigate = useNavigate();

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.getAll,
    select: d => d.data,
  });

  const { data: langStats = [] } = useQuery({
    queryKey: ['lang-stats'],
    queryFn: reportsApi.getLanguageStats,
    select: d => d.data,
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: reportsApi.getStats,
    select: d => d.data,
  });

  // Build WPM timeline for chart
  const wpmData = reports.slice().reverse().map((r, i) => ({
    index: i + 1,
    wpm: r.wpm,
    accuracy: r.accuracy,
    date: new Date(r.completedAt).toLocaleDateString(),
  }));

  const radarData = langStats.map(l => ({
    language: l.language,
    wpm: l.avgWpm,
    accuracy: l.avgAccuracy,
    tests: l.tests,
  }));

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 size={24} className="text-primary" /> Reports & Analytics
          </h1>
          <p className="text-text-secondary text-sm mt-1">{reports.length} sessions recorded</p>
        </div>

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Best WPM', value: stats.bestWpm, icon: Zap, color: 'text-primary' },
              { label: 'Avg Accuracy', value: `${stats.avgAccuracy}%`, icon: Target, color: 'text-success' },
              { label: 'Total Time', value: formatDuration(stats.totalTime), icon: Clock, color: 'text-info' },
              { label: 'Sessions', value: stats.totalTests, icon: BarChart3, color: 'text-warning' },
            ].map(s => (
              <div key={s.label} className="glass-card p-4">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WPM History */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-text-primary mb-4 text-sm">WPM & Accuracy Trend</h3>
            {wpmData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={wpmData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                  <XAxis dataKey="index" tick={{ fill: '#71717A', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717A', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 8 }}
                    labelStyle={{ color: '#A1A1AA', fontSize: 11 }}
                  />
                  <Line type="monotone" dataKey="wpm" stroke="#EAB308" strokeWidth={2} dot={{ fill: '#EAB308', r: 3 }} name="WPM" />
                  <Line type="monotone" dataKey="accuracy" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} name="Accuracy %" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted text-sm">Complete more sessions to see trends</div>
            )}
          </div>

          {/* Language Stats Radar */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-text-primary mb-4 text-sm">Language Performance</h3>
            {radarData.length > 0 ? (
              <div className="space-y-3">
                {langStats.map(l => (
                  <div key={l.language} className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary w-24 shrink-0">{l.language}</span>
                    <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-yellow-300 rounded-full"
                        style={{ width: `${(l.avgWpm / 100) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono text-primary w-16 text-right">{l.avgWpm} WPM</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted text-sm">No language data yet</div>
            )}
          </div>
        </div>

        {/* Session List */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-text-primary mb-4 text-sm">All Sessions</h3>
          {reportsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="space-y-1">
              {reports.map(r => (
                <motion.div
                  key={r.id}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`${ROUTES.REPORTS}/${r.id}`)}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-2/50 cursor-pointer transition-all group"
                >
                  <div className="text-xl">
                    {r.language === 'java' ? '☕' : r.language === 'javascript' ? '🟨' : r.language === 'python' ? '🐍' : '💻'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">{r.templateTitle}</p>
                    <p className="text-xs text-muted">{formatRelativeTime(r.completedAt)} · {formatDuration(r.duration)}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-bold text-primary">{r.wpm} WPM</div>
                      <div className="text-xs text-muted">{r.accuracy}% acc</div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-sm text-error">{r.errors} errors</div>
                      <div className="text-xs text-muted">{r.characters} chars</div>
                    </div>
                    <ChevronRight size={14} className="text-muted group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
