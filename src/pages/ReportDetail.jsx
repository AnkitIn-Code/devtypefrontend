import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Target, Clock, AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { AppLayout } from '@layouts/AppLayout';
import { Spinner } from '@components/common/Badge';
import { reportsApi } from '@api/reports.api';
import { formatDuration, formatRelativeTime } from '@utils/format.utils';
import { formatTime } from '@utils/typing.utils';

// Keyboard heatmap component
const KeyboardHeatmap = ({ mistakeChars = [] }) => {
  const rows = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m'],
  ];

  return (
    <div className="space-y-2">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center gap-1" style={{ paddingLeft: ri * 12 }}>
          {row.map(key => {
            const isMistake = mistakeChars.includes(key);
            return (
              <motion.div
                key={key}
                whileHover={{ scale: 1.2 }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                  isMistake ? 'bg-error/60 text-white' : 'bg-surface-2 text-muted'
                }`}
                title={isMistake ? `${key} — frequent mistake` : key}
              >
                {key}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.getById(id),
    select: d => d.data,
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Spinner size="xl" /></div></AppLayout>;
  if (!report) return <AppLayout><div className="text-center py-20 text-muted">Report not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-surface-2 text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{report.templateTitle}</h1>
            <p className="text-muted text-sm">{formatRelativeTime(report.completedAt)}</p>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'WPM', value: report.wpm, color: 'text-primary', icon: Zap },
            { label: 'Accuracy', value: `${report.accuracy}%`, color: report.accuracy >= 95 ? 'text-success' : 'text-warning', icon: Target },
            { label: 'Time', value: formatTime(report.duration), color: 'text-info', icon: Clock },
            { label: 'Errors', value: report.errors, color: report.errors > 5 ? 'text-error' : 'text-muted', icon: AlertTriangle },
          ].map(stat => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-5 text-center"
            >
              <div className={`text-3xl font-black font-mono ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted mt-1 uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WPM Timeline */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-text-primary mb-4 text-sm">Speed Timeline</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={report.keystrokes} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                <XAxis dataKey="time" tick={{ fill: '#71717A', fontSize: 10 }} />
                <YAxis tick={{ fill: '#71717A', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 8 }} />
                <Area type="monotone" dataKey="wpm" stroke="#EAB308" strokeWidth={2} fill="url(#wpmGrad)" name="WPM" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy Timeline */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-text-primary mb-4 text-sm">Accuracy Timeline</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={report.keystrokes} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                <XAxis dataKey="time" tick={{ fill: '#71717A', fontSize: 10 }} />
                <YAxis tick={{ fill: '#71717A', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 8 }} />
                <Area type="monotone" dataKey="accuracy" stroke="#22C55E" strokeWidth={2} fill="url(#accGrad)" name="Accuracy %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Keyboard Heatmap */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-text-primary mb-4 text-sm">Keyboard Heatmap — Mistake Keys</h3>
          <p className="text-xs text-muted mb-4">
            Red keys indicate characters where mistakes occurred most frequently.
          </p>
          <KeyboardHeatmap mistakeChars={report.mistakeChars} />
        </div>

        {/* Session Details */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-text-primary mb-4 text-sm">Session Details</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Raw WPM', value: report.rawWpm },
              { label: 'Characters', value: report.characters },
              { label: 'Consistency', value: `${report.consistency}%` },
              { label: 'Language', value: report.language },
              { label: 'Duration', value: formatDuration(report.duration) },
              { label: 'Completed', value: new Date(report.completedAt).toLocaleString() },
            ].map(item => (
              <div key={item.label}>
                <dt className="text-xs text-muted uppercase tracking-wider">{item.label}</dt>
                <dd className="text-sm font-semibold text-text-primary mt-0.5">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReportDetail;
