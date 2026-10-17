import { useState, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Zap, TrendingUp, Target, Clock, Flame, Trophy, FileCode2,
  BarChart3, Play, ArrowRight, Sparkles, ChevronRight,
  Code2, Cpu, Users, Medal, Calendar
} from 'lucide-react';
import { AppLayout } from '@layouts/AppLayout';
import { useAuthStore } from '@store/auth.store';
import { reportsApi } from '@api/reports.api';
import { templatesApi } from '@api/templates.api';
import { gamificationApi } from '@api/gamification.api';
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

const LANG_CONFIG = {
  javascript: { label: 'JS', name: 'JavaScript', color: '#f7df1e', bg: 'rgba(247, 223, 30, 0.12)', border: 'rgba(247, 223, 30, 0.3)' },
  typescript: { label: 'TS', name: 'TypeScript', color: '#3178c6', bg: 'rgba(49, 120, 198, 0.12)', border: 'rgba(49, 120, 198, 0.3)' },
  python: { label: 'PY', name: 'Python', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
  java: { label: 'JAVA', name: 'Java', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)', border: 'rgba(234, 88, 12, 0.3)' },
  cpp: { label: 'C++', name: 'C++', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)', border: 'rgba(14, 165, 233, 0.3)' },
  rust: { label: 'RS', name: 'Rust', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)' },
  go: { label: 'GO', name: 'Go', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)' },
  html: { label: 'HTML', name: 'HTML', color: '#e34f26', bg: 'rgba(227, 79, 38, 0.12)', border: 'rgba(227, 79, 38, 0.3)' },
  css: { label: 'CSS', name: 'CSS', color: '#264de4', bg: 'rgba(38, 77, 228, 0.12)', border: 'rgba(38, 77, 228, 0.3)' },
  sql: { label: 'SQL', name: 'SQL', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)' },
};



const SeasonCard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: season } = useQuery({
    queryKey: ['current-season'],
    queryFn: gamificationApi.getCurrentSeason,
    select: (d) => d.data,
  });

  if (!season) return null;

  const daysLeft = season.endDate ? Math.max(0, Math.ceil((new Date(season.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 30;
  const elo = user?.eloRating || 1200;
  const tier = elo >= 2000 ? 'GRANDMASTER' : elo >= 1600 ? 'MASTER' : elo >= 1400 ? 'DIAMOND' : elo >= 1200 ? 'GOLD' : 'SILVER';

  return (
    <motion.div
      {...fadeUp(0.12)}
      className="glass-card p-5 sm:p-6 border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-surface to-surface rounded-3xl h-full flex flex-col justify-between space-y-4 shadow-md relative overflow-hidden"
    >
      <div className="space-y-3 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-black uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
            <Trophy size={14} /> Ranked Season #{season.seasonNumber || 1}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live ({daysLeft}d left)
          </span>
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-black text-text-primary leading-snug">
            {season.name || 'Season 1: Genesis'}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Compete in 1v1 Ranked Duels to climb divisions and earn exclusive rewards.
          </p>
        </div>

        <div
          className="p-3.5 rounded-2xl border flex items-center justify-between gap-4"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
        >
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted block">Your Tier</span>
            <span className="text-sm font-black text-violet-400">{tier}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted block">Current ELO</span>
            <span className="text-sm font-black font-mono text-text-primary">{elo} <span className="text-[10px] text-muted">pts</span></span>
          </div>
        </div>

        <button
          onClick={() => navigate(`${ROUTES.MULTIPLAYER}?mode=DUEL&action=queue`)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 transition-all cursor-pointer"
        >
          <Zap size={14} /> Start 1v1 Ranked Match
        </button>
      </div>
    </motion.div>
  );
};

const DailyChallengeCard = () => {
  const navigate = useNavigate();
  const { data: dailyChallenge } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: gamificationApi.getTodayChallenge,
    select: (d) => d.data,
  });

  if (!dailyChallenge || !dailyChallenge.snippet) return null;

  const { snippet, hasCompleted, userWpm, userRank } = dailyChallenge;

  return (
    <motion.div
      {...fadeUp(0.12)}
      className="glass-card p-5 sm:p-6 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface to-surface rounded-3xl h-full flex flex-col justify-between space-y-4 shadow-md relative overflow-hidden"
    >
      <div className="space-y-3 flex flex-col h-full">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sparkles size={14} /> Today's Challenge
          </span>
          {hasCompleted ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              ✓ Done ({userWpm} WPM · Rank #{userRank || 1})
            </span>
          ) : (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-extrabold border border-amber-500/30 animate-pulse">
              +150 XP Bonus
            </span>
          )}
        </div>

        {/* Title & Language details */}
        <div>
          <h3 className="text-lg sm:text-xl font-black text-text-primary leading-snug">
            {snippet.title || 'Daily Code Challenge'}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Language: <span className="font-bold text-primary">{snippet.language || 'JavaScript'}</span> · Difficulty: <span className="font-bold text-amber-400">{snippet.difficulty || 'INTERMEDIATE'}</span>
          </p>
        </div>

        {/* Dynamic Code Viewer - Theme Adaptive */}
        <div
          className="flex-1 min-h-[190px] max-h-[260px] p-3.5 rounded-2xl font-mono text-xs overflow-y-auto relative shadow-inner space-y-1.5 flex flex-col justify-between"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-between pb-2 text-[10px] uppercase tracking-wider font-sans font-bold"
            style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <div className="flex items-center gap-1.5">
              <Code2 size={13} style={{ color: 'var(--accent-light)' }} />
              <span>{snippet.title || 'today_challenge.code'}</span>
            </div>
            <span
              className="px-2 py-0.5 rounded font-mono text-[9.5px] font-bold"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}
            >
              {snippet.language || 'javascript'}
            </span>
          </div>

          <div className="flex gap-3 text-xs leading-relaxed overflow-hidden">
            {/* Line numbers column */}
            <div
              className="select-none text-right pr-2.5 font-mono text-[11px] space-y-0.5 shrink-0"
              style={{ borderRight: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              {(snippet.code || '').split('\n').slice(0, 10).map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>

            {/* Dynamic Code Content */}
            <pre
              className="font-mono text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap flex-1"
              style={{ color: 'var(--text-primary)' }}
            >
              <code>{snippet.code || '// Complete today\'s challenge to earn +150 XP!'}</code>
            </pre>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={() => {
            if (snippet?.id) {
              navigate(`/type/${snippet.id}`);
            } else {
              navigate(ROUTES.TYPING);
            }
          }}
          className="w-full py-3 rounded-xl font-black text-sm text-zinc-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          {hasCompleted ? 'Practice Again' : 'Take Daily Challenge'} <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Monthly Challenge Calendar ───────────────────────────────────────────────
const MonthlyCalendarCard = () => {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-based

  const { data: response } = useQuery({
    queryKey: ['daily-challenge-monthly', viewYear, viewMonth],
    queryFn: () => gamificationApi.getMonthlyCalendar(viewYear, viewMonth),
    staleTime: 60000,
  });

  const rawCalendarData = useMemo(() => {
    return Array.isArray(response?.data) ? response.data : [];
  }, [response]);

  const MONTH_NAMES_FULL = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Number of days in the selected month
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  // 0-indexed day of week for the 1st of the month (0=Sun, 1=Mon, ..., 6=Sat)
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();

  // Create lookup map: 'YYYY-MM-DD' -> API data item
  const apiMap = useMemo(() => {
    const map = {};
    rawCalendarData.forEach(item => {
      if (item && item.date) map[item.date] = item;
    });
    return map;
  }, [rawCalendarData]);

  // Always generate all 1..daysInMonth day objects
  const daysList = useMemo(() => {
    const list = [];
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = apiMap[dateStr] || {};
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;

      list.push({
        dayNum: d,
        date: dateStr,
        isToday,
        isPast,
        isFuture,
        hasCompleted: entry.hasCompleted || false,
        hasChallengeToday: entry.hasChallengeToday || false,
        snippetTitle: entry.snippetTitle || null,
        wpm: entry.wpm || null,
      });
    }
    return list;
  }, [viewYear, viewMonth, daysInMonth, apiMap, now]);

  const completedCount = daysList.filter(d => d.hasCompleted).length;
  const totalWithChallenge = daysList.filter(d => d.hasChallengeToday && d.isPast).length || daysList.filter(d => d.isPast).length;

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const canGoNext = viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth() + 1);

  const pastDaysCount = useMemo(() => {
    return daysList.filter(d => d.isPast || d.isToday).length;
  }, [daysList]);

  const handleCellClick = (day) => {
    if (day && (day.hasChallengeToday || day.isToday || day.isPast)) {
      toast(`Opening ${day.snippetLanguage || 'code'} challenge for ${day.date}... ⚡`, { icon: '🎯' });
      if (day.snippetId) {
        navigate(`${ROUTES.TYPING}/${day.snippetId}`);
      } else {
        navigate(ROUTES.TYPING, { state: { date: day.date, title: day.snippetTitle } });
      }
    }
  };

  return (
    <motion.div
      {...fadeUp(0.1)}
      className="glass-card p-4 sm:p-5 border border-amber-500/30 rounded-3xl w-full h-full flex flex-col justify-between space-y-3 shadow-md"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      {/* Clear Component Title Header */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-amber-400 fill-amber-400 shrink-0 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Daily Challenge Calendar
          </span>
        </div>
        <div className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/35 text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm shrink-0">
          <Trophy size={11} className="text-amber-400 shrink-0" />
          <span>+1K XP</span>
        </div>
      </div>

      {/* Month Navigation Header */}
      <div className="flex items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="px-1.5 py-0.5 rounded text-muted hover:text-text-primary hover:bg-surface-2 transition-colors font-bold"
          >
            ‹
          </button>
          <span className="font-extrabold text-text-primary min-w-[70px] text-center">
            {MONTH_NAMES_FULL[viewMonth - 1]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            className="px-1.5 py-0.5 rounded text-muted hover:text-text-primary hover:bg-surface-2 transition-colors font-bold disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <span className="text-xs text-muted font-medium">
          Done: <strong className="text-emerald-400 font-bold">{completedCount}</strong>/{pastDaysCount}
        </span>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS_SHORT.map((d, i) => (
          <div key={i} className="text-[10px] font-black text-muted uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Calendar grid - Rectangular Cells with Red Outline for Missed Days */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Leading empty cells for month padding */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8 sm:h-9" />
        ))}
        {/* All day cells 1..daysInMonth */}
        {daysList.map((day) => {
          let cellClass = 'h-8 sm:h-9 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer hover:scale-105 hover:z-10 ';
          let content = null;
          let textClass = 'text-xs sm:text-sm font-bold font-mono ';

          // IMPORTANT: Check hasCompleted FIRST — even for today, completed = ✓ not →
          if (day.hasCompleted) {
            if (day.isToday) {
              // Completed today: green with amber ring
              cellClass += 'border-2 border-emerald-400 ring-1 ring-amber-400/50 bg-emerald-500/15 text-emerald-400 shadow-sm';
            } else {
              cellClass += 'border-2 border-emerald-500/80 bg-emerald-500/10 text-emerald-400';
            }
            textClass += 'text-emerald-400 font-extrabold';
            content = '✓';
          } else if (day.isToday) {
            cellClass += 'border-2 border-amber-400 bg-amber-400/10 text-amber-400 shadow-sm';
            textClass += 'text-amber-400 font-extrabold';
            content = '→';
          } else if (day.isPast) {
            // RED OUTLINE ONLY — no background fill
            cellClass += 'border-2 border-rose-500/60 bg-transparent text-rose-500 hover:border-rose-500';
            textClass += 'text-rose-500 font-bold';
            content = '✗';
          } else {
            cellClass += 'border border-border/30 bg-surface-2/20 text-text-primary hover:border-primary/50';
            textClass += 'text-text-primary';
            content = null;
          }

          return (
            <div
              key={day.date}
              onClick={() => handleCellClick(day)}
              className={cellClass}
              title={day.snippetTitle ? `${day.date}: ${day.snippetTitle} (${day.snippetLanguage || 'code'}) — Click to practice` : `${day.date} (Click to launch)`}
            >
              <span className={textClass}>{day.dayNum}</span>
              {content && <span className="text-[9px] font-black leading-none mt-0.5">{content}</span>}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-muted pt-1.5 border-t border-border/20">
        <span className="flex items-center gap-1"><span className="text-emerald-400 font-bold">✓</span> Done</span>
        <span className="flex items-center gap-1"><span className="text-amber-400 font-bold">→</span> Today</span>
        <span className="flex items-center gap-1"><span className="text-rose-500 font-bold">✗</span> Missed</span>
        <span className="flex items-center gap-1"><span className="text-muted/40 font-bold">□</span> Future</span>
      </div>
    </motion.div>
  );
};

const WelcomeBonusModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="glass-card p-8 max-w-md w-full text-center space-y-6 border-2 border-warning/40 shadow-glow"
          >
            <div className="w-16 h-16 rounded-full bg-warning/20 border border-warning/30 flex items-center justify-center mx-auto text-3xl animate-bounce">
              🎁
            </div>
            <div>
              <span className="bg-warning/20 text-warning text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                New User Bonus
              </span>
              <h2 className="text-2xl font-black text-text-primary mt-3">
                Welcome Bonus Unlocked!
              </h2>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                Congratulations! As a new developer on DevType, you've received <strong className="text-warning font-mono">50 FREE AI Credits</strong>!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-2/60 border border-border/50 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Gifted Credits</span>
                <span className="text-sm font-black text-warning font-mono">+50 Credits</span>
              </div>
              <p className="text-[11px] text-muted leading-tight">
                Use your credits to generate custom AI coding challenges powered by <strong className="text-warning">DeepSeek-V4-Pro</strong> on any language or framework.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  onClose();
                  navigate(ROUTES.AI_TEMPLATE);
                }}
                className="btn-primary flex-1 py-3 font-bold justify-center"
              >
                <Sparkles size={16} /> Try AI Generator
              </button>
              <button
                onClick={onClose}
                className="btn-ghost flex-1 border border-border py-3 justify-center text-sm"
              >
                Start Practice
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return sessionStorage.getItem('show_welcome_bonus_modal') === 'true';
  });

  const handleCloseWelcomeModal = () => {
    sessionStorage.removeItem('show_welcome_bonus_modal');
    setShowWelcomeModal(false);
  };

  const { data: statsData } = useQuery({
    queryKey: ['user-stats'],
    queryFn: reportsApi.getStats,
    select: (d) => d.data,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: templates } = useQuery({
    queryKey: ['templates-recent'],
    queryFn: () => templatesApi.getAll(),
    select: (d) => d.data?.slice(0, 5) || [],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: reports } = useQuery({
    queryKey: ['reports-recent'],
    queryFn: reportsApi.getAll,
    select: (d) => d.data?.slice(0, 5) || [],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // C-02 fix: use server-authoritative level curve instead of client-side approximation
  const { data: levelCurveData } = useQuery({
    queryKey: ['level-curve'],
    queryFn: () => gamificationApi.getLevelCurve(100),
    select: (d) => d.data, // array of { level, xpRequired }
    staleTime: 300_000,   // 5 min — curve rarely changes
    gcTime: 600_000,
  });

  // Build a fast level -> xpRequired lookup from the server curve.
  // Falls back to the local quadratic approximation if the fetch hasn't resolved.
  const getLevelXpBounds = (lvl) => {
    if (levelCurveData && Array.isArray(levelCurveData)) {
      const entry     = levelCurveData.find(e => e.level === lvl);
      const nextEntry = levelCurveData.find(e => e.level === lvl + 1);
      if (entry && nextEntry) {
        return { currentMin: entry.xpRequired, nextMax: nextEntry.xpRequired };
      }
    }
    // Fallback: local formula (same shape as before)
    const getXpThreshold = (l) => {
      if (l <= 1) return 0;
      const n = l - 1;
      return 100 * n + 150 * n * (n - 1);
    };
    return { currentMin: getXpThreshold(lvl), nextMax: getXpThreshold(lvl + 1) };
  };

  // Derive the user's level from the server curve (or fallback formula)
  const derivedLevel = (() => {
    const totalXp = user?.xp || 0;
    if (levelCurveData && Array.isArray(levelCurveData)) {
      let lvl = 1;
      for (const entry of levelCurveData) {
        if (totalXp >= entry.xpRequired) lvl = entry.level;
        else break;
      }
      return lvl;
    }
    // Fallback
    const getXpThreshold = (l) => {
      if (l <= 1) return 0;
      const n = l - 1;
      return 100 * n + 150 * n * (n - 1);
    };
    let lvl = 1;
    while (lvl < 100 && totalXp >= getXpThreshold(lvl + 1)) lvl++;
    return lvl;
  })();

  const stats = statsData || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Developer';
  const xpProgress = Math.min(((user?.xp || 0) / (user?.xpToNext || 10000)) * 100, 100);

  const totalSessionsCount = stats.totalSessions ?? stats.totalTests ?? (reports?.length || 0);
  const totalTimeSeconds = stats.totalTimeMs ? Math.round(stats.totalTimeMs / 1000) : (stats.totalTime || 0);

  const quickStats = [
    { icon: Zap, label: 'Best WPM', value: stats.bestWpm ? `${stats.bestWpm}` : '--', sublabel: 'All-time record', glowColor: '#a78bfa' },
    { icon: Target, label: 'Avg Accuracy', value: stats.avgAccuracy ? `${Number(stats.avgAccuracy).toFixed(1)}%` : '--', sublabel: 'All-time avg', glowColor: '#34d399' },
    { icon: TrendingUp, label: 'Avg WPM', value: stats.avgWpm ? `${Math.round(stats.avgWpm)}` : '--', sublabel: 'Last 30 days', glowColor: '#60a5fa' },
    { icon: Flame, label: 'Streak', value: stats.currentStreak !== undefined && stats.currentStreak !== null ? `${stats.currentStreak}d` : '--', sublabel: `Best: ${stats.longestStreak || 0}d`, glowColor: '#f97316' },
    { icon: FileCode2, label: 'Sessions', value: totalSessionsCount > 0 ? formatNumber(totalSessionsCount) : '0', sublabel: 'Completed', glowColor: '#e879f9' },
    { icon: Clock, label: 'Practice Time', value: totalTimeSeconds > 0 ? formatDuration(totalTimeSeconds) : '0s', sublabel: 'Total', glowColor: '#fbbf24' },
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

        {/* ── Hero Welcome Banner (Full Width) ── */}
        <motion.div
          {...fadeUp(0)}
          className="w-full relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col justify-between"
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

            <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent-light)' }}>
                  {greeting} 👋
                </p>
                <h1 className="text-2xl sm:text-3xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>
                  Welcome back,{' '}
                  <span style={{ color: 'var(--accent-light)' }}>{firstName}</span>
                </h1>
                <p className="mt-2 text-xs sm:text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
                  Ready to set a new personal record today? Your last session was great — keep pushing!
                </p>

                {/* Dynamic XP Progress — server-authoritative level curve (C-02) */}
                {user && (() => {
                  const totalXp = user.xp || 0;
                  const lvl = derivedLevel;
                  const { currentMin, nextMax } = getLevelXpBounds(lvl);
                  const rangeSpan = Math.max(1, nextMax - currentMin);
                  const progressPercent = Math.min(100, Math.max(0, ((totalXp - currentMin) / rangeSpan) * 100));

                  return (
                    <div className="mt-4 flex items-center gap-3 max-w-sm">
                      <span className="text-xs font-extrabold shrink-0" style={{ color: 'var(--accent-light)' }}>
                        Lv {lvl}
                      </span>
                      <div
                        className="flex-1 h-2 rounded-full overflow-hidden"
                        style={{ background: 'var(--border)' }}
                        title={`Level ${lvl} Range: ${currentMin} - ${nextMax} XP`}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, var(--accent), #4f46e5)' }}
                        />
                      </div>
                      <div className="text-xs shrink-0 text-right font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                        {totalXp.toLocaleString()} / {nextMax.toLocaleString()} XP
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(ROUTES.AI_TEMPLATE)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent-light)',
                    background: 'var(--accent-dim)',
                  }}
                >
                  <Sparkles size={14} /> AI Generate
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(ROUTES.TYPING)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                    boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
                  }}
                >
                  <Play size={14} /> Start Typing
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

        {/* ── Ranked Season + Daily Challenge Section ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          <SeasonCard />
          <DailyChallengeCard />
          <MonthlyCalendarCard />
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
                {reports?.map((r) => {
                  const langKey = (r.language || 'cpp').toLowerCase();
                  const langConfig = LANG_CONFIG[langKey] || {
                    label: langKey.slice(0, 4).toUpperCase(),
                    name: r.language || 'Code',
                    color: 'var(--accent-light)',
                    bg: 'var(--accent-dim)',
                    border: 'var(--border)',
                  };
                  const title = r.snippetTitle || r.templateTitle || 'Practice Session';
                  const timestamp = r.createdAt || r.completedAt;

                  return (
                    <motion.div
                      key={r.id}
                      onClick={() => navigate(`${ROUTES.REPORTS}/${r.id}`)}
                      className="flex items-center gap-4 px-6 py-4 cursor-pointer group transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      whileHover={{ backgroundColor: 'var(--accent-dim)' }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 border"
                        style={{
                          background: langConfig.bg,
                          borderColor: langConfig.border,
                          color: langConfig.color,
                        }}
                      >
                        {langConfig.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate transition-colors group-hover:text-primary"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {title}
                        </p>
                        <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                          <span>{formatRelativeTime(timestamp)}</span>
                          <span
                            className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border"
                            style={{
                              borderColor: langConfig.border,
                              color: langConfig.color,
                              background: langConfig.bg,
                            }}
                          >
                            {langConfig.name || r.language || 'Code'}
                          </span>
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-sm font-black font-mono" style={{ color: 'var(--accent-light)' }}>
                          {r.wpm} WPM
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {r.accuracy ? Number(r.accuracy).toFixed(0) : 100}% acc
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="group-hover:translate-x-1 transition-all shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </motion.div>
                  );
                })}

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
      <WelcomeBonusModal isOpen={showWelcomeModal} onClose={handleCloseWelcomeModal} />
    </AppLayout>
  );
};

export default Dashboard;
