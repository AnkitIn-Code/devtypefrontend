import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Zap, Target, Clock, AlertTriangle, Share2,
  RotateCcw, Award, Sparkles, CheckCircle2, ChevronRight,
  Code2, Keyboard, ShieldCheck
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { AppLayout } from '@layouts/AppLayout';
import { Spinner } from '@components/common/Badge';
import { ShareResultModal } from '@components/common/ShareResultModal';
import { reportsApi } from '@api/reports.api';
import { socialApi } from '@api/social.api';
import { formatDuration, formatRelativeTime } from '@utils/format.utils';
import { formatTime } from '@utils/typing.utils';
import { ROUTES } from '@constants';

// Keyboard Heatmap Component with Modern Keycaps
const KeyboardHeatmap = ({ mistakes = [] }) => {
  const rawList = Array.isArray(mistakes) ? mistakes : [];

  const getMistakeCount = (keyObj) => {
    let count = 0;
    for (const item of rawList) {
      let char = '';
      if (typeof item === 'string') {
        char = item;
      } else if (item && typeof item === 'object') {
        char = item.characterExpected || item.char || item.key || '';
      }
      if (!char) continue;

      const lowerChar = char.toLowerCase();
      if (keyObj.matchChars && keyObj.matchChars.includes(char)) {
        count += (item.count || 1);
      } else if (keyObj.key && keyObj.key.toLowerCase() === lowerChar) {
        count += (item.count || 1);
      } else if (char === ' ' && (keyObj.id === 'space' || keyObj.key === 'Space')) {
        count += (item.count || 1);
      } else if ((char === '\n' || char === '\r') && (keyObj.id === 'enter' || keyObj.key === 'Enter')) {
        count += (item.count || 1);
      } else if (char === '\t' && (keyObj.id === 'tab' || keyObj.key === 'Tab')) {
        count += (item.count || 1);
      }
    }
    return count;
  };

  const keyboardRows = [
    // Row 1
    [
      { id: 'backquote', label: '` ~', key: '`', matchChars: ['`', '~'] },
      { id: '1', label: '1 !', key: '1', matchChars: ['1', '!'] },
      { id: '2', label: '2 @', key: '2', matchChars: ['2', '@'] },
      { id: '3', label: '3 #', key: '3', matchChars: ['3', '#'] },
      { id: '4', label: '4 $', key: '4', matchChars: ['4', '$'] },
      { id: '5', label: '5 %', key: '5', matchChars: ['5', '%'] },
      { id: '6', label: '6 ^', key: '6', matchChars: ['6', '^'] },
      { id: '7', label: '7 &', key: '7', matchChars: ['7', '&'] },
      { id: '8', label: '8 *', key: '8', matchChars: ['8', '*'] },
      { id: '9', label: '9 (', key: '9', matchChars: ['9', '('] },
      { id: '0', label: '0 )', key: '0', matchChars: ['0', ')'] },
      { id: 'minus', label: '- _', key: '-', matchChars: ['-', '_'] },
      { id: 'equal', label: '= +', key: '=', matchChars: ['=', '+'] },
      { id: 'backspace', label: 'Backspace ⌫', key: 'Backspace', width: 'w-20', matchChars: ['\b', 'Backspace'] },
    ],
    // Row 2
    [
      { id: 'tab', label: 'Tab ⇥', key: 'Tab', width: 'w-14', matchChars: ['\t', 'Tab'] },
      { id: 'q', label: 'Q', key: 'q' },
      { id: 'w', label: 'W', key: 'w' },
      { id: 'e', label: 'E', key: 'e' },
      { id: 'r', label: 'R', key: 'r' },
      { id: 't', label: 'T', key: 't' },
      { id: 'y', label: 'Y', key: 'y' },
      { id: 'u', label: 'U', key: 'u' },
      { id: 'i', label: 'I', key: 'i' },
      { id: 'o', label: 'O', key: 'o' },
      { id: 'p', label: 'P', key: 'p' },
      { id: 'bracketleft', label: '[ {', key: '[', matchChars: ['[', '{'] },
      { id: 'bracketright', label: '] }', key: ']', matchChars: [']', '}'] },
      { id: 'backslash', label: '\\ |', key: '\\', matchChars: ['\\', '|'], width: 'w-12' },
    ],
    // Row 3
    [
      { id: 'caps', label: 'Caps', key: 'CapsLock', width: 'w-16' },
      { id: 'a', label: 'A', key: 'a' },
      { id: 's', label: 'S', key: 's' },
      { id: 'd', label: 'D', key: 'd' },
      { id: 'f', label: 'F', key: 'f' },
      { id: 'g', label: 'G', key: 'g' },
      { id: 'h', label: 'H', key: 'h' },
      { id: 'j', label: 'J', key: 'j' },
      { id: 'k', label: 'K', key: 'k' },
      { id: 'l', label: 'L', key: 'l' },
      { id: 'semicolon', label: '; :', key: ';', matchChars: [';', ':'] },
      { id: 'quote', label: '\' "', key: '\'', matchChars: ['\'', '"'] },
      { id: 'enter', label: 'Enter ↵', key: 'Enter', width: 'w-20', matchChars: ['\n', '\r', 'Enter'] },
    ],
    // Row 4
    [
      { id: 'shiftleft', label: 'Shift ⇧', key: 'Shift', width: 'w-24' },
      { id: 'z', label: 'Z', key: 'z' },
      { id: 'x', label: 'X', key: 'x' },
      { id: 'c', label: 'C', key: 'c' },
      { id: 'v', label: 'V', key: 'v' },
      { id: 'b', label: 'B', key: 'b' },
      { id: 'n', label: 'N', key: 'n' },
      { id: 'm', label: 'M', key: 'm' },
      { id: 'comma', label: ', <', key: ',', matchChars: [',', '<'] },
      { id: 'period', label: '. >', key: '.', matchChars: ['.', '>'] },
      { id: 'slash', label: '/ ?', key: '/', matchChars: ['/', '?'] },
      { id: 'shiftright', label: 'Shift ⇧', key: 'Shift', width: 'w-24' },
    ],
    // Row 5
    [
      { id: 'ctrlleft', label: 'Ctrl', key: 'Control', width: 'w-14' },
      { id: 'altleft', label: 'Alt', key: 'Alt', width: 'w-14' },
      { id: 'space', label: 'Space Bar ( ␣ )', key: 'Space', width: 'flex-1 max-w-md', matchChars: [' ', 'Space'] },
      { id: 'altright', label: 'Alt', key: 'Alt', width: 'w-14' },
      { id: 'ctrlright', label: 'Ctrl', key: 'Control', width: 'w-14' },
    ]
  ];

  return (
    <div
      className="space-y-2 p-5 sm:p-6 rounded-3xl border shadow-inner overflow-x-auto"
      style={{
        background: 'var(--bg-surface-2)',
        borderColor: 'var(--border)',
      }}
    >
      {keyboardRows.map((row, ri) => (
        <div key={ri} className="flex items-center justify-center gap-1.5 min-w-[700px]">
          {row.map((k) => {
            const count = getMistakeCount(k);
            let keyStyle = {
              background: 'var(--card-bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            };

            if (count >= 5) {
              keyStyle = {
                background: 'rgba(239, 68, 68, 0.85)',
                borderColor: '#f87171',
                color: '#ffffff',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)',
              };
            } else if (count >= 3) {
              keyStyle = {
                background: 'rgba(244, 63, 94, 0.7)',
                borderColor: '#fb7185',
                color: '#ffffff',
                boxShadow: '0 0 8px rgba(244, 63, 94, 0.3)',
              };
            } else if (count >= 1) {
              keyStyle = {
                background: 'rgba(245, 158, 11, 0.25)',
                borderColor: 'rgba(245, 158, 11, 0.6)',
                color: '#fbbf24',
              };
            }

            return (
              <motion.div
                key={k.id}
                whileHover={{ scale: 1.08, y: -2 }}
                className={`relative h-10 rounded-xl flex items-center justify-center px-2 text-[11px] font-mono border transition-all duration-150 select-none ${k.width || 'w-10'}`}
                style={keyStyle}
                title={count > 0 ? `Key "${k.label}" — ${count} mistake${count > 1 ? 's' : ''}` : k.label}
              >
                <span className="truncate font-semibold">{k.label}</span>
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-[9px] text-white flex items-center justify-center font-black ring-2 ring-[#12131c] shadow">
                    {count}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      ))}

      {/* Heatmap Legend */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs border-t px-2" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
          <Keyboard size={14} style={{ color: 'var(--accent-light)' }} /> Developer Keystroke Heatmap
        </span>
        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }} /> Flawless
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50 border border-amber-500/80" /> 1-2 Errors
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-400" /> 3-4 Errors
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-red-400" /> 5+ Errors
          </span>
        </div>
      </div>
    </div>
  );
};

const CustomDetailTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="p-3 rounded-2xl border shadow-xl text-xs space-y-1"
        style={{
          background: 'rgba(18, 19, 28, 0.95)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p className="font-bold text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Time: {label}
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

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.getById(id),
    select: d => d.data,
  });

  const handleOpenShareModal = async () => {
    try {
      const res = await socialApi.getSessionShareCard(id);
      setShareData(res.data);
      setShareModalOpen(true);
    } catch {
      setShareData({
        wpm: report?.wpm || 0,
        accuracy: report?.accuracy || 100,
        snippetTitle: report?.snippetTitle || 'Practice Session',
        rankBadge: (report?.wpm || 0) >= 100 ? 'GRANDMASTER' : (report?.wpm || 0) >= 75 ? 'MASTER' : 'PRO',
      });
      setShareModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-28"><Spinner size="xl" /></div>
      </AppLayout>
    );
  }

  if (!report) {
    return (
      <AppLayout>
        <div className="text-center py-28 space-y-3" style={{ color: 'var(--text-muted)' }}>
          <Code2 size={36} className="mx-auto opacity-30" />
          <p className="text-sm font-medium">Session report not found.</p>
        </div>
      </AppLayout>
    );
  }

  // Calculate speed tier
  const wpm = Math.round(report.wpm || 0);
  const getRankTier = (speed) => {
    if (speed >= 120) return { label: 'GRANDMASTER', color: '#ec4899', icon: Award };
    if (speed >= 90) return { label: 'MASTER', color: '#a855f7', icon: Award };
    if (speed >= 70) return { label: 'DIAMOND', color: '#38bdf8', icon: Award };
    if (speed >= 50) return { label: 'GOLD', color: '#f59e0b', icon: Award };
    return { label: 'SILVER', color: '#94a3b8', icon: Award };
  };
  const rank = getRankTier(wpm);
  const RankIcon = rank.icon;

  const rawHistory = report.wpmHistory || report.keystrokes || [];
  const chartData = rawHistory.length > 0 ? rawHistory.map((item, idx) => {
    let displayTime = `${idx + 1}s`;
    if (typeof item.time === 'number' && item.time > 1000000) {
      displayTime = `${idx + 1}s`;
    } else if (item.time) {
      displayTime = `${item.time}s`;
    }
    return {
      time: displayTime,
      wpm: Math.round(item.wpm ?? report.wpm ?? 0),
      accuracy: Math.round(item.accuracy ?? report.accuracy ?? 100),
    };
  }) : [
    { time: '0s', wpm: 0, accuracy: 100 },
    { time: formatDuration(Math.round((report.durationMs || 1000) / 1000)), wpm: report.wpm || 0, accuracy: report.accuracy || 100 }
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate(ROUTES.REPORTS)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-150 hover:scale-105"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {report.snippetTitle || report.templateTitle || 'Practice Session'}
                </h1>
                {report.language && (
                  <span className="text-xs font-mono uppercase font-bold px-2.5 py-0.5 rounded-full border" style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)', color: 'var(--accent-light)' }}>
                    {report.language}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Recorded {formatRelativeTime(report.createdAt || report.completedAt)} · Verified Session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {report.snippetId && (
              <button
                onClick={() => navigate(`${ROUTES.TYPING}/${report.snippetId}`)}
                className="px-4 py-2.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all duration-150 hover:scale-105"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <RotateCcw size={14} />
                <span>Practice Again</span>
              </button>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenShareModal}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md shadow-violet-500/20 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--accent), #4f46e5)' }}
            >
              <Share2 size={14} />
              <span>Share Result</span>
            </motion.button>
          </div>
        </div>

        {/* Hero Scorecard Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* WPM Main Scorecard */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-5 sm:p-6 border shadow-md relative overflow-hidden flex flex-col justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.02))',
              borderColor: 'rgba(168,85,247,0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Speed Score
              </span>
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border" style={{ background: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.35)', color: '#c084fc' }}>
                <RankIcon size={11} />
                <span>{rank.label}</span>
              </div>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {wpm}
              </div>
              <div className="text-[11px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>
                Raw Speed: <span className="text-white font-mono">{report.rawWpm || wpm} WPM</span>
              </div>
            </div>
          </motion.div>

          {/* Accuracy Scorecard */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl p-5 sm:p-6 border shadow-md relative overflow-hidden flex flex-col justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.02))',
              borderColor: 'rgba(16,185,129,0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Accuracy Rate
              </span>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-emerald-400" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Target size={15} />
              </div>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight" style={{ color: (report.accuracy || 100) >= 95 ? '#34d399' : '#fbbf24' }}>
                {Math.round(report.accuracy || 100)}%
              </div>
              <div className="text-[11px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>
                Errors: <span className="font-mono" style={{ color: (report.errorCount ?? report.errors) > 0 ? '#f87171' : '#34d399' }}>{report.errorCount ?? report.errors ?? 0} mistake{(report.errorCount ?? report.errors) === 1 ? '' : 's'}</span>
              </div>
            </div>
          </motion.div>

          {/* Duration Scorecard */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-5 sm:p-6 border shadow-md relative overflow-hidden flex flex-col justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.02))',
              borderColor: 'rgba(56,189,248,0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Elapsed Time
              </span>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sky-400" style={{ background: 'rgba(56,189,248,0.15)' }}>
                <Clock size={15} />
              </div>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {formatTime(report.durationMs ? Math.round(report.durationMs / 1000) : report.duration || 0)}
              </div>
              <div className="text-[11px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>
                Completed session duration
              </div>
            </div>
          </motion.div>

          {/* XP & Rewards Scorecard */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl p-5 sm:p-6 border shadow-md relative overflow-hidden flex flex-col justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.02))',
              borderColor: 'rgba(245,158,11,0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                XP Earned
              </span>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-amber-400" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <Sparkles size={15} />
              </div>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-400">
                +{report.xpEarned || 25}
              </div>
              <div className="text-[11px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>
                Profile & Rank Experience
              </div>
            </div>
          </motion.div>
        </div>

        {/* Dual Progression Charts: Speed & Accuracy Timelines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Speed Progression Timeline */}
          <div
            className="rounded-3xl p-6 border shadow-md space-y-4"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Zap size={16} style={{ color: 'var(--accent-light)' }} />
                <span>Speed Curve (WPM over Time)</span>
              </h3>
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-light)' }}>
                Peak: {Math.max(...chartData.map(d => d.wpm), wpm)} WPM
              </span>
            </div>

            <div className="h-52 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="detailWpmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.25)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomDetailTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="wpm"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    fill="url(#detailWpmGrad)"
                    dot={{ r: 4, strokeWidth: 2, fill: '#a855f7', stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                    name="WPM"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Accuracy Timeline */}
          <div
            className="rounded-3xl p-6 border shadow-md space-y-4"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Target size={16} className="text-emerald-400" />
                <span>Accuracy Consistency (% over Time)</span>
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Avg: {Math.round(report.accuracy || 100)}%
              </span>
            </div>

            <div className="h-52 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="detailAccGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.25)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomDetailTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#detailAccGrad)"
                    dot={{ r: 4, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                    name="Accuracy"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Developer Keystroke Heatmap */}
        <div
          className="rounded-3xl p-6 sm:p-7 border shadow-md space-y-4"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Keyboard size={18} style={{ color: 'var(--accent-light)' }} />
                <span>Keyboard Mistake Heatmap</span>
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Identifies precision bottlenecks and character-specific error hotspots across the code test.
              </p>
            </div>
          </div>

          <KeyboardHeatmap
            mistakes={
              report.errorEvents
                ? report.errorEvents.map(e => e.characterExpected || e.char || e.key || '')
                : report.mistakeChars || report.mistakes || []
            }
          />
        </div>

        {/* Session Metadata & Integrity Diagnostics */}
        <div
          className="rounded-3xl p-6 border shadow-md space-y-4"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Session Diagnostics & Verification</span>
            </h3>
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full border" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }}>
              ✓ Authenticated
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Raw WPM', value: `${report.rawWpm || wpm}` },
              { label: 'Total Errors', value: `${report.errorCount ?? report.errors ?? 0}` },
              { label: 'Language', value: `${report.language || 'cpp'}` },
              { label: 'Time Spent', value: formatDuration(report.durationMs ? Math.round(report.durationMs / 1000) : report.duration || 0) },
              { label: 'XP Rewarded', value: `+${report.xpEarned || 25} XP` },
              { label: 'Status', value: report.isSuspicious ? 'Flagged' : 'Verified Valid' },
            ].map(item => (
              <div
                key={item.label}
                className="p-3.5 rounded-2xl border space-y-1"
                style={{
                  background: 'var(--bg-surface-2)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {item.label}
                </div>
                <div className="text-sm font-bold font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ShareResultModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareData={shareData}
      />
    </AppLayout>
  );
};

export default ReportDetail;
