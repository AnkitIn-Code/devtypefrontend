import { useState, useMemo } from 'react';
import { AVATAR_IDS, AVATARS, AVATAR_LABELS } from '@utils/avatars';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Target, FileCode2, Trophy, Flame, Clock, Award, History,
  Sparkles, RefreshCw, Check, Code2, UserPlus, UserCheck, UserX,
  Filter, Calendar, ChevronRight, BarChart2, ShieldCheck, ExternalLink,
  Bell, Search, X, CheckCircle2, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '@layouts/AppLayout';
import { Avatar, Spinner, Badge } from '@components/common/Badge';
import { Button } from '@components/common/Button';
import { useAuthStore } from '@store/auth.store';
import { userApi } from '@api/user.api';
import { reportsApi } from '@api/reports.api';
import { gamificationApi } from '@api/gamification.api';
import { socialApi } from '@api/social.api';
import { templatesApi } from '@api/templates.api';
import { formatDuration, formatNumber } from '@utils/format.utils';
import { ROUTES } from '@constants';

// ─── Month-Separated LeetCode Heatmap ────────────────────────────────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const LeetCodeHeatmap = ({ sessions = [], currentStreak = 0, longestStreak = 0 }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Aggregation map: 'YYYY-MM-DD' -> count
  const daysMap = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      const rawDate = s.createdAt || s.completedAt;
      if (rawDate) {
        const dt = new Date(rawDate);
        const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        map[d] = (map[d] || 0) + 1;
      }
    });
    return map;
  }, [sessions]);

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set([currentYear]);
    sessions.forEach(s => {
      const rawDate = s.createdAt || s.completedAt;
      if (rawDate) years.add(new Date(rawDate).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [sessions, currentYear]);

  // Total sessions for selected year
  const totalForYear = useMemo(() => {
    return Object.entries(daysMap)
      .filter(([date]) => date.startsWith(String(selectedYear)))
      .reduce((sum, [, c]) => sum + c, 0);
  }, [daysMap, selectedYear]);

  // Build weeks for a single month
  const buildMonthWeeks = (year, monthIdx) => {
    const start = new Date(year, monthIdx, 1);
    const end = new Date(year, monthIdx + 1, 0);
    const weeks = [];
    let week = new Array(start.getDay()).fill(null); // pad leading empty days
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      week.push({ dateStr, count: daysMap[dateStr] || 0 });
      if (d.getDay() === 6) { weeks.push(week); week = []; }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null); // pad trailing
      weeks.push(week);
    }
    return weeks;
  };

  const getColor = (count) => {
    if (count === 0) return 'bg-surface-2 border-border/30';
    if (count === 1) return 'bg-emerald-500/30 border-emerald-500/40 text-emerald-400';
    if (count === 2) return 'bg-emerald-500/60 border-emerald-500/70 text-emerald-300';
    if (count >= 3 && count <= 5) return 'bg-emerald-500 border-emerald-400 text-white';
    return 'bg-emerald-400 border-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.5)]';
  };

  return (
    <div
      className="p-5 rounded-2xl border space-y-4 shadow-md"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Flame size={18} className="text-emerald-400 animate-pulse" />
            Activity Calendar
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            <strong className="text-emerald-400">{totalForYear}</strong> sessions in {selectedYear} · Streak:{' '}
            <strong className="text-emerald-400">{currentStreak}d</strong> · Best:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{longestStreak}d</strong>
          </p>
        </div>
        {/* Year pills */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl text-xs font-semibold"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          {availableYears.map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedYear === yr
                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* 12 month blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const weeks = buildMonthWeeks(selectedYear, monthIdx);
          const monthSessions = weeks.flat().filter(Boolean).reduce((s, d) => s + (d?.count || 0), 0);
          return (
            <div key={monthName} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {monthName}
                </span>
                {monthSessions > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">{monthSessions}</span>
                )}
              </div>
              {/* Day-of-week labels */}
              <div className="flex gap-0.5">
                {DAY_LABELS.map((d, i) => (
                  <span key={i} className="w-3 text-[8px] text-center font-medium" style={{ color: 'var(--text-muted)' }}>{d}</span>
                ))}
              </div>
              {/* Grid: columns = days of week */}
              <div className="space-y-0.5">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex gap-0.5">
                    {week.map((day, di) =>
                      day ? (
                        <div
                          key={day.dateStr}
                          className={`w-3 h-3 rounded-[2px] border ${getColor(day.count)} transition-all hover:scale-125 cursor-pointer flex-shrink-0`}
                          title={`${day.dateStr}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                        />
                      ) : (
                        <div key={`empty-${di}`} className="w-3 h-3 flex-shrink-0" />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs pt-2" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <span>Sessions per day</span>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span>Less</span>
          <div className="w-3 h-3 rounded bg-surface-2 border border-border/40" />
          <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/40" />
          <div className="w-3 h-3 rounded bg-emerald-500/60 border border-emerald-500/70" />
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

// ─── Dedicated Edit Profile Modal Component ──────────────────────────────────
const EditProfileModal = ({ user, onClose, onSaveSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use our 6 cartoon developer avatars
  const PRESET_AVATARS = AVATAR_IDS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await userApi.updateMe({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        avatarUrl: formData.avatarUrl,
        password: formData.password || undefined,
      });
      toast.success('Profile details saved to database! ✨');
      if (onSaveSuccess) onSaveSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-6 border border-primary/30 max-w-lg w-full space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Edit User Profile
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selector — 6 Illustrated Cartoon Avatars */}
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
              Choose Your Avatar
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_AVATARS.map((id) => (
                <div key={id} className="flex flex-col items-center gap-1">
                  <img
                    src={AVATARS[id]}
                    alt={AVATAR_LABELS[id]}
                    onClick={() => setFormData({ ...formData, avatarUrl: id })}
                    className={`w-14 h-14 rounded-full cursor-pointer border-2 transition-all ${
                      formData.avatarUrl === id ? 'border-primary scale-110 shadow-lg ring-2 ring-primary/40' : 'border-border/40 opacity-70 hover:opacity-100 hover:opacity-100 hover:scale-105'
                    }`}
                    title={AVATAR_LABELS[id]}
                  />
                  <span className="text-[10px] text-muted text-center leading-tight max-w-[56px] truncate">{AVATAR_LABELS[id]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-text-secondary block mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First Name"
                className="w-full px-3 py-2 bg-surface-2 border border-border/50 rounded-xl text-sm text-text-primary outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-text-secondary block mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last Name"
                className="w-full px-3 py-2 bg-surface-2 border border-border/50 rounded-xl text-sm text-text-primary outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Username</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              placeholder="Username"
              className="w-full px-3 py-2 bg-surface-2 border border-border/50 rounded-xl text-sm text-text-primary outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
              className="w-full px-3 py-2 bg-surface-2 border border-border/50 rounded-xl text-sm text-text-primary outline-none focus:border-primary/50"
            />
          </div>

          <div className="pt-2 border-t border-border/30 space-y-3">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Update Password (Optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="New Password"
                  className="w-full px-3 py-2 bg-surface-2 border border-border/50 rounded-xl text-sm text-text-primary outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm Password"
                  className="w-full px-3 py-2 bg-surface-2 border border-border/50 rounded-xl text-sm text-text-primary outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="text-xs px-5">
              Save Changes
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ─── User Search Modal ────────────────────────────────────────────────────────
const UserSearchModal = ({ onClose, onVisitProfile }) => {
  const [query, setQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['user-search', query],
    queryFn: () => socialApi.searchUsers(query),
    select: d => d.data || [],
    enabled: query.trim().length >= 2,
    staleTime: 30000,
  });

  const sendRequestMutation = useMutation({
    mutationFn: (username) => socialApi.sendFriendRequest(username),
    onSuccess: (_, username) => {
      toast.success(`Friend request sent to ${username}! 🤝`);
      queryClient.invalidateQueries(['friends']);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to send request'),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-6 border border-primary/30 max-w-lg w-full space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
            <Search size={16} className="text-primary" /> Find Users
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by username (min 2 chars)..."
            className="w-full pl-8 pr-4 py-2.5 bg-surface-2 border border-border/50 rounded-xl text-sm text-text-primary placeholder:text-muted outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {isFetching && query.trim().length >= 2 && (
            <div className="text-center py-4"><Spinner size="sm" /></div>
          )}
          {!isFetching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-center py-4 text-muted text-sm">No users found for "{query}"</p>
          )}
          {results.map(u => (
            <div
              key={u.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-2/40 border border-border/40 hover:border-primary/30 transition-all"
            >
              <Avatar name={u.username} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-text-primary truncate">
                  {u.username}
                </p>
                <p className="text-xs text-muted">Level {u.level || 1} · {u.bestWpm || '--'} WPM</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { onVisitProfile(u.username); onClose(); }}
                  className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border/40 text-text-secondary text-xs font-semibold hover:text-text-primary transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => sendRequestMutation.mutate(u.username)}
                  disabled={sendRequestMutation.isPending}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  <UserPlus size={12} className="inline mr-1" />Add
                </button>
              </div>
            </div>
          ))}
          {query.trim().length < 2 && (
            <p className="text-center py-4 text-muted text-xs">Type at least 2 characters to search</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Pending Requests Panel ───────────────────────────────────────────────────
const PendingRequestsPanel = ({ requests, onAccept, onDecline }) => {
  if (!requests?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 border border-warning/30 bg-warning/5 space-y-3"
    >
      <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Bell size={14} className="text-warning" />
        Friend Requests
        <span className="ml-auto text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-bold">
          {requests.length}
        </span>
      </h4>
      {requests.map(r => (
        <div key={r.id} className="flex items-center gap-3">
          <Avatar name={r.username} size="sm" />
          <span className="flex-1 text-sm font-medium text-text-primary truncate">{r.username}</span>
          <button
            onClick={() => onAccept(r.id, r.username)}
            className="p-1.5 rounded-lg bg-success/10 border border-success/30 text-success hover:bg-success/20 transition-colors"
            title="Accept"
          >
            <CheckCircle2 size={14} />
          </button>
          <button
            onClick={() => onDecline(r.id, r.username)}
            className="p-1.5 rounded-lg bg-error/10 border border-error/30 text-error hover:bg-error/20 transition-colors"
            title="Decline"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </motion.div>
  );
};

// ─── Solved Problems Gauge Card ───────────────────────────────────────────────
const LeetCodeSolvedCard = ({ difficultyCounts, templateStats = {}, totalSessions = 0 }) => {
  const easySolved = difficultyCounts.BEGINNER || 0;
  const medSolved = difficultyCounts.INTERMEDIATE || 0;
  const hardSolved = difficultyCounts.ADVANCED || 0;
  const totalSolved = easySolved + medSolved + hardSolved;

  const easyTotal = Math.max(templateStats.BEGINNER ?? 0, easySolved);
  const medTotal = Math.max(templateStats.INTERMEDIATE ?? 0, medSolved);
  const hardTotal = Math.max(templateStats.ADVANCED ?? 0, hardSolved);
  const grandTotal = (templateStats.total && templateStats.total > 0)
    ? Math.max(templateStats.total, easyTotal + medTotal + hardTotal)
    : (easyTotal + medTotal + hardTotal);

  // 360 degree full ring calculations
  // Radius R = 48 -> Circumference C = 2 * PI * 48 = ~301.59
  const R = 48;
  const C = 2 * Math.PI * R;
  const gap = 6;
  const segmentLength = (C - 3 * gap) / 3; // ~94.5px per difficulty segment

  const easyStroke = easyTotal > 0 ? segmentLength * Math.min(1, easySolved / easyTotal) : 0;
  const medStroke = medTotal > 0 ? segmentLength * Math.min(1, medSolved / medTotal) : 0;
  const hardStroke = hardTotal > 0 ? segmentLength * Math.min(1, hardSolved / hardTotal) : 0;

  return (
    <div
      className="p-5 rounded-2xl border space-y-4 shadow-md h-full flex flex-col justify-between"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/30">
        <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
          <Award size={16} className="text-primary" />
          Solved Problems
        </h3>
      </div>

      <div className="flex items-center justify-around gap-4 flex-1">
        {/* Left: Full 360 Degree Circular Gauge */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Segment 1: Easy Faded Track (Uncompleted) */}
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke="#10b98133" strokeWidth="8"
              strokeDasharray={`${segmentLength} ${C - segmentLength}`}
              strokeDashoffset="0" strokeLinecap="round"
            />
            {/* Easy Solid Completed Fill */}
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke="#10b981" strokeWidth="8"
              strokeDasharray={`${easyStroke} ${C - easyStroke}`}
              strokeDashoffset="0" strokeLinecap="round"
            />

            {/* Segment 2: Medium Faded Track (Uncompleted) */}
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke="#f59e0b33" strokeWidth="8"
              strokeDasharray={`${segmentLength} ${C - segmentLength}`}
              strokeDashoffset={`-${segmentLength + gap}`} strokeLinecap="round"
            />
            {/* Medium Solid Completed Fill */}
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke="#f59e0b" strokeWidth="8"
              strokeDasharray={`${medStroke} ${C - medStroke}`}
              strokeDashoffset={`-${segmentLength + gap}`} strokeLinecap="round"
            />

            {/* Segment 3: Hard Faded Track (Uncompleted) */}
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke="#ef444433" strokeWidth="8"
              strokeDasharray={`${segmentLength} ${C - segmentLength}`}
              strokeDashoffset={`-${2 * (segmentLength + gap)}`} strokeLinecap="round"
            />
            {/* Hard Solid Completed Fill */}
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke="#ef4444" strokeWidth="8"
              strokeDasharray={`${hardStroke} ${C - hardStroke}`}
              strokeDashoffset={`-${2 * (segmentLength + gap)}`} strokeLinecap="round"
            />
          </svg>

          {/* Center Text Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-xl font-black text-text-primary font-mono leading-none">
              {totalSolved}
              <span className="text-xs text-muted font-normal">/{grandTotal}</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-0.5">
              <span>✓</span> Solved
            </div>
            <div className="text-[9px] text-muted mt-1 font-mono">
              {totalSessions} Sessions
            </div>
          </div>
        </div>

        {/* Right: Stacked Category Pill Boxes for 3 Difficulties (Easy, Med., Hard) */}
        <div className="flex-1 space-y-2.5 max-w-[160px]">
          <div className="p-2.5 rounded-xl bg-surface-2/60 border border-border/40 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-emerald-400">Easy</div>
              <div className="text-xs font-mono font-black text-text-primary">
                {easySolved} <span className="text-[10px] font-normal text-muted">/ {easyTotal}</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-2/60 border border-border/40 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-amber-400">Med.</div>
              <div className="text-xs font-mono font-black text-text-primary">
                {medSolved} <span className="text-[10px] font-normal text-muted">/ {medTotal}</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-2/60 border border-border/40 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-rose-500">Hard</div>
              <div className="text-xs font-mono font-black text-text-primary">
                {hardSolved} <span className="text-[10px] font-normal text-muted">/ {hardTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Profile Component ───────────────────────────────────────────────────
const Profile = () => {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser, updateUser } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // If no route parameter, load authenticated user's profile
  const isOwnProfile = !routeUsername || routeUsername === authUser?.username || routeUsername === authUser?.id;
  const targetIdentifier = isOwnProfile ? (authUser?.username || authUser?.id) : routeUsername;

  // Load User Profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', targetIdentifier],
    queryFn: () => userApi.getProfile(targetIdentifier),
    select: d => d.data,
    enabled: !!targetIdentifier,
    staleTime: 60_000,       // 1 min — avoid refetch on every nav
    gcTime: 300_000,         // 5 min cache retention
  });


  // Load User Sessions / Match History for target profile
  const { data: userSessions = [] } = useQuery({
    queryKey: ['user-sessions', targetIdentifier],
    queryFn: () => isOwnProfile ? reportsApi.getAll({ size: 200 }) : reportsApi.getAll({ username: targetIdentifier, size: 200 }),
    select: d => d.data || [],
    enabled: !!targetIdentifier,
    staleTime: 60_000,
    gcTime: 300_000,
  });


  // Load Recent Achievements for profile user (Max 3)
  const { data: recentAchievements = [] } = useQuery({
    queryKey: ['recent-achievements', targetIdentifier],
    queryFn: () => gamificationApi.getRecentAchievements(3, targetIdentifier),
    select: d => d.data || [],
    enabled: !!targetIdentifier,
    staleTime: 120_000,
    gcTime: 300_000,
  });


  // Load Template Stats Breakdown by Difficulty
  const { data: templateStats = {} } = useQuery({
    queryKey: ['template-stats'],
    queryFn: () => templatesApi.getStats(),
    select: d => d.data || {},
    staleTime: 300_000,      // 5 min — template stats rarely change
    gcTime: 600_000,
  });


  // Load Friends List for target profile user
  const { data: friendsList = [] } = useQuery({
    queryKey: ['friends', isOwnProfile ? 'me' : targetIdentifier],
    queryFn: () => isOwnProfile ? socialApi.getFriends() : socialApi.getUserFriends(targetIdentifier),
    select: d => d.data || [],
    enabled: isOwnProfile ? !!authUser : !!targetIdentifier,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  // Load viewer's own friends to check isFriend status when viewing another user's profile
  const { data: myFriendsList = [] } = useQuery({
    queryKey: ['friends', 'me'],
    queryFn: () => socialApi.getFriends(),
    select: d => d.data || [],
    enabled: !isOwnProfile && !!authUser,
    staleTime: 60_000,
    gcTime: 300_000,
  });


  // Load pending requests (own profile only)
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => socialApi.getPendingRequests(),
    select: d => d.data,
    enabled: isOwnProfile && !!authUser,
    refetchInterval: 30000,
  });

  const [activeFriendsTab, setActiveFriendsTab] = useState('connected');

  // Load Sent Requests (outgoing pending requests)
  const { data: sentRequests = [] } = useQuery({
    queryKey: ['sent-requests'],
    queryFn: () => socialApi.getSentRequests(),
    select: d => d.data || [],
    enabled: isOwnProfile && !!authUser,
    refetchInterval: 30000,
    staleTime: 15_000,
  });


  const cancelSentRequestMutation = useMutation({
    mutationFn: (id) => socialApi.removeFriend(id),
    onSuccess: () => {
      toast.success('Friend request cancelled');
      queryClient.invalidateQueries(['sent-requests']);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to cancel request'),
  });

  // Check friendship status
  const targetUserObj = profile || {};
  const isFriend = isOwnProfile ? false : myFriendsList.some(f => f.username === targetUserObj.username || f.id === targetUserObj.id);

  // Friend mutations
  const addFriendMutation = useMutation({
    mutationFn: (uname) => socialApi.sendFriendRequest(uname),
    onSuccess: () => {
      toast.success(`Friend request sent to ${targetUserObj.username}! 🤝`);
      queryClient.invalidateQueries(['friends', 'me']);
      queryClient.invalidateQueries(['sent-requests']);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to send friend request'),
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId) => socialApi.removeFriend(friendId),
    onSuccess: () => {
      toast.success('Friend removed');
      queryClient.invalidateQueries(['friends', 'me']);
      queryClient.invalidateQueries(['friends', targetIdentifier]);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to remove friend'),
  });

  const acceptMutation = useMutation({
    mutationFn: (id) => socialApi.acceptFriendRequest(id),
    onSuccess: (_, id) => {
      const req = pendingRequests.find(r => r.id === id);
      toast.success(`Now friends with ${req?.username || 'user'}! 🤝`);
      queryClient.invalidateQueries(['friends']);
      queryClient.invalidateQueries(['pending-requests']);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to accept request'),
  });

  const declineMutation = useMutation({
    mutationFn: (id) => socialApi.declineFriendRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-requests']);
      toast('Request declined', { icon: '👋' });
    },
  });

  const p = profile || {};
  const level = p.level || 1;

  // Difficulty breakdown counts from user sessions
  const difficultyCounts = useMemo(() => {
    const counts = { BEGINNER: 0, INTERMEDIATE: 0, ADVANCED: 0, EXPERT: 0 };
    userSessions.forEach(s => {
      const diff = s.difficulty || 'INTERMEDIATE';
      if (counts[diff] !== undefined) counts[diff]++;
      else counts.INTERMEDIATE++;
    });
    return counts;
  }, [userSessions]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Spinner size="xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Top Row: Profile Header Card (Left 75%) + Recent Achievements Card (Right 25%) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* Left 75% Portion: Main Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 glass-card p-6 border border-primary/20 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
              <Avatar name={p.username || 'User'} url={p.avatarUrl} size="xl" />

              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
                  <h1 className="text-2xl font-bold text-text-primary">
                    {p.firstName ? `${p.firstName} ${p.lastName || ''}` : (p.username || 'Developer')}
                  </h1>
                  <span className="text-xs text-muted font-mono bg-surface-2 px-2 py-0.5 rounded border border-border/40">
                    @{p.username}
                  </span>

                  {isOwnProfile ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowEditModal(true)}
                        className="text-xs py-1 px-3"
                      >
                        Edit Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSearch(true)}
                        className="text-xs py-1 px-3 border border-border/40"
                      >
                        <Search size={12} className="mr-1" /> Find Users
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant={isFriend ? 'danger' : 'primary'}
                      onClick={() => isFriend ? removeFriendMutation.mutate(p.id) : addFriendMutation.mutate(p.username)}
                      isLoading={addFriendMutation.isPending || removeFriendMutation.isPending}
                      className="text-xs py-1 px-3 font-semibold"
                    >
                      {isFriend ? (
                        <><UserCheck size={14} /> Friends</>
                      ) : (
                        <><UserPlus size={14} /> Add Friend</>
                      )}
                    </Button>
                  )}
                </div>

                {isOwnProfile && p.email && (
                  <p className="text-text-secondary text-sm">{p.email}</p>
                )}

                {/* Status Pills */}
                <div className="flex items-center gap-3 mt-3 flex-wrap justify-center md:justify-start">
                  <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                    <Zap size={14} className="text-primary fill-current" />
                    <span className="text-sm font-bold text-primary">Level {level}</span>
                  </div>
                  <div className="bg-surface-2 rounded-xl px-3 py-1.5 flex items-center gap-1.5 border border-border/40">
                    <Trophy size={14} className="text-warning" />
                    <span className="text-sm font-semibold">{formatNumber(p.credits || 0)} Credits</span>
                  </div>
                  <div className="bg-surface-2 rounded-xl px-3 py-1.5 flex items-center gap-1.5 border border-border/40">
                    <Flame size={14} className="text-error" />
                    <span className="text-sm font-semibold">{p.currentStreak || 0}d Streak</span>
                  </div>
                </div>

                {/* Quick Stat Badges */}
                <div className="grid grid-cols-2 gap-3 max-w-xs pt-2">
                  <div className="glass-card p-2.5 text-center border border-border/30">
                    <div className="text-[11px] text-muted font-medium">Best Speed</div>
                    <div className="text-lg font-black text-primary font-mono">{p.bestWpm || '--'} WPM</div>
                  </div>
                  <div className="glass-card p-2.5 text-center border border-border/30">
                    <div className="text-[11px] text-muted font-medium">Avg Speed</div>
                    <div className="text-lg font-black text-yellow-400 font-mono">
                      {p.avgWpm != null ? Math.round(p.avgWpm) : '--'} WPM
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right 25% Portion: Separate Recent Achievements Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 glass-card p-5 border border-amber-500/30 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Trophy size={14} className="fill-amber-400" /> Recent Achievements
              </span>
              <button
                onClick={() => navigate(ROUTES.ACHIEVEMENTS)}
                className="text-[11px] text-primary hover:underline font-bold"
              >
                All →
              </button>
            </div>

            <div className="space-y-2.5 flex-1 flex flex-col justify-center">
              {recentAchievements.slice(0, 3).map((ach) => {
                const rawIcon = ach.iconUrl || ach.icon;
                const isUrl = typeof rawIcon === 'string' && (
                  rawIcon.startsWith('http') || rawIcon.startsWith('/') || rawIcon.endsWith('.png') || rawIcon.endsWith('.svg')
                );
                return (
                  <div
                    key={ach.id || ach.code}
                    className="p-2.5 rounded-xl bg-surface-2/60 border border-border/40 flex items-center gap-3 hover:border-amber-500/40 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-base shrink-0">
                      {isUrl ? (
                        <img
                          src={rawIcon}
                          alt=""
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            if (e.target.parentNode) {
                              e.target.parentNode.innerHTML = '<span>🏆</span>';
                            }
                          }}
                        />
                      ) : (
                        <span>{rawIcon || '🏆'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-primary truncate">{ach.title || ach.name}</p>
                      <p className="text-[10px] text-text-muted truncate">{ach.description || 'Achievement Unlocked!'}</p>
                    </div>
                  </div>
                );
              })}
              {recentAchievements.length === 0 && (
                <div className="p-4 text-center text-xs text-muted border border-dashed border-border/40 rounded-xl">
                  No achievements unlocked yet. Complete sessions or create templates to earn badges!
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Pending Requests ── */}
        <AnimatePresence>
          {isOwnProfile && pendingRequests.length > 0 && (
            <PendingRequestsPanel
              requests={pendingRequests}
              onAccept={(id) => acceptMutation.mutate(id)}
              onDecline={(id) => declineMutation.mutate(id)}
            />
          )}
        </AnimatePresence>

        {/* ── Connected Friends (Left 50%) + Solved Problems Gauge (Right 50%) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

          {/* Left 50%: Friends Management Hub (Own profile) or Public Friends list (Other user) */}
          <div className="glass-card p-6 border border-border/40 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                <Users size={18} className="text-primary" />
                {isOwnProfile ? 'Friends Hub' : `${p.username || 'User'}'s Friends`}
              </h3>
              {isOwnProfile && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSearch(true)}
                  className="text-xs py-1 px-3 border border-border/40"
                >
                  <UserPlus size={13} className="mr-1" /> Add Friends
                </Button>
              )}
            </div>

            {isOwnProfile ? (
              <>
                {/* Ultra-Sleek Floating Pill Segmented Control */}
                <div className="flex items-center p-1 rounded-2xl bg-surface-2/60 border border-border/40 relative">
                  {[
                    { id: 'connected', label: 'Connected', count: friendsList.length },
                    { id: 'received', label: 'Received', count: pendingRequests.length },
                    { id: 'sent', label: 'Sent', count: sentRequests.length },
                  ].map((tab) => {
                    const isActive = activeFriendsTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveFriendsTab(tab.id)}
                        className={`relative flex-1 py-1.5 px-3 text-xs font-bold transition-colors duration-200 z-10 flex items-center justify-center gap-1.5 ${
                          isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold ${
                              isActive
                                ? 'bg-primary/20 text-primary'
                                : 'bg-surface-2 text-muted'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}

                        {/* Smooth Floating Pill with Spring Motion */}
                        {isActive && (
                          <motion.div
                            layoutId="activeFriendsSegmentPill"
                            className="absolute inset-0 rounded-xl bg-surface-1 border border-primary/40 shadow-md z-[-1]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Contents with AnimatePresence Slide-Fade Transition */}
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    {activeFriendsTab === 'connected' && (
                      <motion.div
                        key="connected"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.18 }}
                      >
                        {friendsList.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                            {friendsList.map(friend => (
                              <div
                                key={friend.id || friend.username}
                                className="p-3 rounded-2xl bg-surface-2/40 border border-border/40 hover:border-primary/30 transition-all flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Avatar name={friend.username} url={friend.avatarUrl} size="sm" />
                                  <div className="min-w-0">
                                    <p
                                      onClick={() => navigate(`/profile/${friend.username}`)}
                                      className="text-xs font-bold text-text-primary hover:text-primary cursor-pointer truncate"
                                    >
                                      {friend.username}
                                    </p>
                                    <p className="text-[10px] text-muted">
                                      Lv {friend.level || 1} · {friend.bestWpm || '--'} WPM
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => navigate(`/profile/${friend.username}`)}
                                    className="px-2 py-1 rounded-lg bg-surface-2 border border-border/40 text-text-secondary text-[11px] font-semibold hover:text-text-primary transition-colors"
                                    title="View Profile"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => removeFriendMutation.mutate(friend.id)}
                                    className="p-1 rounded-lg bg-error/10 border border-error/30 text-error hover:bg-error/20 transition-colors"
                                    title="Remove Friend"
                                  >
                                    <UserX size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted text-xs border border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center">
                            No connected friends yet. Click "Add Friends" to connect with developers!
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeFriendsTab === 'received' && (
                      <motion.div
                        key="received"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.18 }}
                      >
                        {pendingRequests.length > 0 ? (
                          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {pendingRequests.map(r => (
                              <div
                                key={r.id}
                                className="p-3 rounded-2xl bg-surface-2/50 border border-border/40 flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Avatar name={r.username} url={r.avatarUrl} size="sm" />
                                  <div className="min-w-0">
                                    <p
                                      onClick={() => navigate(`/profile/${r.username}`)}
                                      className="text-xs font-bold text-text-primary hover:text-primary cursor-pointer truncate"
                                    >
                                      {r.username}
                                    </p>
                                    <p className="text-[10px] text-muted">Wants to connect with you</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => acceptMutation.mutate(r.id)}
                                    disabled={acceptMutation.isPending}
                                    className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => declineMutation.mutate(r.id)}
                                    disabled={declineMutation.isPending}
                                    className="px-2.5 py-1 rounded-xl bg-surface-2 border border-border/40 text-muted text-xs hover:text-text-primary transition-colors"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted text-xs border border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center">
                            No incoming friend requests.
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeFriendsTab === 'sent' && (
                      <motion.div
                        key="sent"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.18 }}
                      >
                        {sentRequests.length > 0 ? (
                          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {sentRequests.map(s => (
                              <div
                                key={s.id}
                                className="p-3 rounded-2xl bg-surface-2/50 border border-border/40 flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Avatar name={s.username} url={s.avatarUrl} size="sm" />
                                  <div className="min-w-0">
                                    <p
                                      onClick={() => navigate(`/profile/${s.username}`)}
                                      className="text-xs font-bold text-text-primary hover:text-primary cursor-pointer truncate"
                                    >
                                      {s.username}
                                    </p>
                                    <p className="text-[10px] text-muted">Request sent · Pending</p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => cancelSentRequestMutation.mutate(s.id)}
                                  disabled={cancelSentRequestMutation.isPending}
                                  className="px-3 py-1 rounded-xl bg-error/10 border border-error/30 text-error text-xs font-semibold hover:bg-error/20 transition-colors shrink-0"
                                >
                                  Cancel
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted text-xs border border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center">
                            No pending sent friend requests.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Public View: Target User's Friends */
              <div className="flex-1">
                {friendsList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                    {friendsList.map(friend => (
                      <div
                        key={friend.id || friend.username}
                        className="p-3 rounded-2xl bg-surface-2/40 border border-border/40 hover:border-primary/30 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={friend.username} url={friend.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <p
                              onClick={() => navigate(`/profile/${friend.username}`)}
                              className="text-xs font-bold text-text-primary hover:text-primary cursor-pointer truncate"
                            >
                              {friend.username}
                            </p>
                            <p className="text-[10px] text-muted">
                              Lv {friend.level || 1} · {friend.bestWpm || '--'} WPM
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/profile/${friend.username}`)}
                          className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border/40 text-text-secondary text-[11px] font-semibold hover:text-text-primary transition-colors shrink-0"
                          title="View Profile"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted text-xs border border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center">
                    {p.username || 'User'} has no public friends connected yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right 50%: Solved Problems Gauge Card */}
          <LeetCodeSolvedCard
            difficultyCounts={difficultyCounts}
            templateStats={templateStats}
            totalSessions={userSessions.length}
          />
        </div>

        {/* ── Activity Calendar (Heatmap) ── */}
        <LeetCodeHeatmap
          sessions={userSessions}
          currentStreak={p.currentStreak || 0}
          longestStreak={p.longestStreak || 0}
        />

        {/* ── Recent Submissions / Match History ── */}
        <div className="glass-card p-6 border border-border/40 space-y-4">
          <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
            <History size={18} className="text-primary" />
            Recent Submissions &amp; Matches ({userSessions.length})
          </h3>

          {userSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Template / Match</th>
                    <th className="py-2.5 px-3 text-right">WPM</th>
                    <th className="py-2.5 px-3 text-right">Accuracy</th>
                    <th className="py-2.5 px-3 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25">
                  {userSessions.slice(0, 10).map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-2.5 px-3 text-muted">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-text-primary flex items-center gap-2">
                        <Code2 size={13} className="text-primary" />
                        {s.snippetTitle || s.templateTitle || 'Typing Practice'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                        {s.wpm} WPM
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-success">
                        {Math.round(s.accuracy || 100)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted">
                        {formatDuration(s.durationMs / 1000 || 30)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted text-xs">
              No recent submissions recorded yet. Complete typing tests to see history!
            </div>
          )}
        </div>

      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal
            user={p}
            onClose={() => setShowEditModal(false)}
            onSaveSuccess={(updatedUser) => {
              updateUser(updatedUser);
              queryClient.invalidateQueries(['profile', targetIdentifier]);
            }}
          />
        )}
        {showSearch && (
          <UserSearchModal
            onClose={() => setShowSearch(false)}
            onVisitProfile={(username) => navigate(`/profile/${username}`)}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default Profile;
