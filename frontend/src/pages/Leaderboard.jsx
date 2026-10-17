import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Crown, Globe, Users, Zap, Sparkles, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@layouts/AppLayout';
import { Avatar, Badge, Spinner } from '@components/common/Badge';
import { useAuthStore } from '@store/auth.store';
import { socialApi } from '@api/social.api';

// Helper to format score numbers nicely
const formatScore = (num, metric) => {
  if (num === undefined || num === null) return '0';
  const val = Number(num).toLocaleString();
  return metric === 'wpm' ? `${val} WPM` : `${val} XP`;
};

export default function Leaderboard() {
  const navigate = useNavigate();
  const [scope, setScope] = useState('global'); // global | friends
  const [metric, setMetric] = useState('wpm'); // wpm | xp
  const [period, setPeriod] = useState('all'); // all | daily | weekly | monthly
  const [language, setLanguage] = useState('all'); // all | javascript | python | java | ...
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', scope, metric, period, language],
    queryFn: () => socialApi.getLeaderboard(scope, metric, period, language, 50),
    select: (d) => d.data,
  });

  const entries = data?.leaderboard || [];
  const userRank = data?.userRank || 0;
  const totalParticipants = data?.totalParticipants || entries.length || 0;

  // Podium Users (Top 3)
  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  // List Entries (Rank 4+)
  const listEntries = entries.length > 3 ? entries.slice(3) : entries;

  const LANGUAGES = [
    { id: 'all', label: 'All Languages' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
    { id: 'cpp', label: 'C++' },
    { id: 'go', label: 'Go' },
    { id: 'rust', label: 'Rust' },
    { id: 'sql', label: 'SQL' },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        {/* HEADER & FILTERS */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
                <Trophy className="text-amber-400" size={28} />
                Leaderboard
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Top developers ranked by typing speed and experience
              </p>
            </div>

            {/* Scope and Metric Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Scope tabs */}
              <div className="flex p-1 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-xs font-semibold">
                {[
                  { id: 'global', label: 'Global', icon: Globe },
                  { id: 'friends', label: 'Friends', icon: Users },
                ].map((s) => {
                  const Icon = s.icon;
                  const active = scope === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setScope(s.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                        active
                          ? 'bg-[var(--accent)] text-white shadow-md font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon size={14} /> {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Metric Selector */}
              <div className="flex p-1 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-xs font-semibold">
                {[
                  { id: 'wpm', label: 'WPM Speed' },
                  { id: 'xp', label: 'XP Points' },
                ].map((m) => {
                  const active = metric === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMetric(m.id)}
                      className={`px-4 py-2 rounded-lg uppercase transition-all ${
                        active
                          ? 'bg-amber-400 text-zinc-950 font-bold shadow-md'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time-Period and Language Sub-Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
            {/* Period selector */}
            <div className="flex p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-medium">
              {[
                { id: 'all', label: 'All-Time' },
                { id: 'daily', label: 'Today' },
                { id: 'weekly', label: 'This Week' },
                { id: 'monthly', label: 'This Month' },
              ].map((p) => {
                const active = period === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      active
                        ? 'bg-[var(--bg-surface-3)] text-[var(--text-primary)] font-bold shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Language filter dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Language:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[var(--bg-surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:border-[var(--accent)]"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>


        {/* YOUR RANK BANNER (AT THE TOP) */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--accent-border)',
            }}
          >
            {/* Ambient accent glow behind banner */}
            <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl opacity-20 bg-[var(--accent)] pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
              <Avatar name={user.username} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-[var(--text-primary)]">{user.username}</span>
                  <Badge variant="primary" size="sm">You</Badge>
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-2">
                  <span>Level {user.level || 1}</span>
                  <span>•</span>
                  <span>{scope === 'global' ? 'Global Standings' : 'Friends Standings'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 relative z-10 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[var(--border)] pt-3 sm:pt-0">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] block">
                  Your Rank
                </span>
                <span className="text-2xl font-black font-mono text-[var(--accent-light)] flex items-center gap-1">
                  #{userRank > 0 ? userRank : 'Unranked'}
                </span>
              </div>
              <div className="h-8 w-px bg-[var(--border)]" />
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] block">
                  Total Competitors
                </span>
                <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
                  {totalParticipants.toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${scope}_${metric}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* 3D PODIUM STAGE FOR TOP 3 */}
              {entries.length > 0 && (
                <div className="pt-6 pb-2">
                  <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-3xl mx-auto min-h-[360px]">
                    
                    {/* --- 2ND PLACE (LEFT) --- */}
                    {top2 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="flex flex-col items-center group cursor-pointer"
                        onClick={() => navigate(`/profile/${top2.username}`)}
                      >
                        <div className="relative mb-3 flex flex-col items-center">
                          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl p-1 bg-[var(--bg-surface-2)] border-2 border-slate-300 shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <Avatar name={top2.username} size="lg" />
                          </div>
                          <div className="absolute -bottom-2 bg-slate-200 text-zinc-900 rounded-full px-2 py-0.5 text-[10px] font-extrabold flex items-center gap-1 shadow">
                            <Medal size={11} className="text-zinc-600" /> #2
                          </div>
                        </div>

                        <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate max-w-[100px] sm:max-w-[130px] text-center mt-1">
                          {top2.username}
                        </h3>

                        {/* 3D Podium Block */}
                        <div
                          className="w-full rounded-t-2xl p-4 flex flex-col items-center justify-between min-h-[170px] mt-2 border-t-2 border-slate-300/40 shadow-2xl relative transition-all group-hover:border-slate-200"
                          style={{
                            background: 'linear-gradient(180deg, var(--bg-surface-2) 0%, var(--bg-surface) 100%)',
                            boxShadow: '0 10px 30px -10px rgba(148, 163, 184, 0.15)',
                          }}
                        >
                          <div className="text-xs text-[var(--text-muted)] font-medium">Level {top2.level || 1}</div>
                          <div className="text-center my-auto">
                            <div className="text-sm sm:text-base font-black font-mono text-[var(--text-primary)]">
                              {formatScore(top2.score, metric)}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                              {metric === 'wpm' ? 'Best Speed' : 'XP Points'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ) : <div />}

                    {/* --- 1ST PLACE (CENTER TALL PODIUM) --- */}
                    {top1 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center group cursor-pointer relative z-10"
                        onClick={() => navigate(`/profile/${top1.username}`)}
                      >
                        <div className="relative mb-3 flex flex-col items-center">
                          <div className="absolute -top-6 text-2xl animate-bounce">👑</div>
                          <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl p-1 bg-[var(--bg-surface-2)] border-2 border-amber-400 shadow-2xl shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
                            <Avatar name={top1.username} size="xl" />
                          </div>
                          <div className="absolute -bottom-2.5 bg-amber-400 text-zinc-950 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold flex items-center gap-1 shadow-md">
                            <Crown size={12} fill="currentColor" /> #1
                          </div>
                        </div>

                        <h3 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)] truncate max-w-[120px] sm:max-w-[150px] text-center mt-1">
                          {top1.username}
                        </h3>

                        {/* 3D Podium Block (Tallest) */}
                        <div
                          className="w-full rounded-t-2xl p-4 sm:p-5 flex flex-col items-center justify-between min-h-[220px] mt-2 border-t-4 border-amber-400 shadow-2xl relative transition-all group-hover:border-amber-300"
                          style={{
                            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, var(--bg-surface-2) 40%, var(--bg-surface) 100%)',
                            boxShadow: '0 15px 40px -10px rgba(245, 158, 11, 0.25)',
                          }}
                        >
                          <div className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                            <Sparkles size={13} /> Level {top1.level || 1}
                          </div>
                          <div className="text-center my-auto">
                            <div className="text-base sm:text-xl font-black font-mono text-amber-400">
                              {formatScore(top1.score, metric)}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                              {metric === 'wpm' ? 'Champion Speed' : 'Top XP'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ) : <div />}

                    {/* --- 3RD PLACE (RIGHT) --- */}
                    {top3 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="flex flex-col items-center group cursor-pointer"
                        onClick={() => navigate(`/profile/${top3.username}`)}
                      >
                        <div className="relative mb-3 flex flex-col items-center">
                          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl p-1 bg-[var(--bg-surface-2)] border-2 border-amber-700 shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <Avatar name={top3.username} size="lg" />
                          </div>
                          <div className="absolute -bottom-2 bg-amber-700 text-white rounded-full px-2 py-0.5 text-[10px] font-extrabold flex items-center gap-1 shadow">
                            <Medal size={11} /> #3
                          </div>
                        </div>

                        <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate max-w-[100px] sm:max-w-[130px] text-center mt-1">
                          {top3.username}
                        </h3>

                        {/* 3D Podium Block */}
                        <div
                          className="w-full rounded-t-2xl p-4 flex flex-col items-center justify-between min-h-[140px] mt-2 border-t-2 border-amber-700/50 shadow-2xl relative transition-all group-hover:border-amber-600"
                          style={{
                            background: 'linear-gradient(180deg, var(--bg-surface-2) 0%, var(--bg-surface) 100%)',
                            boxShadow: '0 10px 30px -10px rgba(180, 83, 9, 0.15)',
                          }}
                        >
                          <div className="text-xs text-[var(--text-muted)] font-medium">Level {top3.level || 1}</div>
                          <div className="text-center my-auto">
                            <div className="text-sm sm:text-base font-black font-mono text-[var(--text-primary)]">
                              {formatScore(top3.score, metric)}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                              {metric === 'wpm' ? 'Best Speed' : 'XP Points'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ) : <div />}

                  </div>
                </div>
              )}

              {/* DASHING LEADERBOARD TABLE LIST */}
              <div
                className="rounded-2xl p-4 sm:p-6 space-y-2 border"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border)',
                }}
              >
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
                  <div className="col-span-6 sm:col-span-7">Developer</div>
                  <div className="hidden sm:block sm:col-span-2 text-center">Level</div>
                  <div className="col-span-4 sm:col-span-2 text-right">
                    {metric === 'wpm' ? 'Best Speed' : 'Total XP'}
                  </div>
                </div>

                {/* Table Rows */}
                {listEntries.map((entry, index) => {
                  const actualRank = entry.rank || index + 4;
                  const isSelf = user && (entry.userId === user.id?.toString() || entry.username === user.username);

                  return (
                    <motion.div
                      key={entry.userId || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => navigate(`/profile/${entry.username}`)}
                      className={`grid grid-cols-12 gap-4 items-center px-4 py-3.5 rounded-xl transition-all cursor-pointer border ${
                        isSelf
                          ? 'bg-[var(--accent-dim)] border-[var(--accent-border)]'
                          : 'hover:bg-[var(--bg-surface-2)] border-transparent hover:border-[var(--border)]'
                      }`}
                    >
                      {/* Rank Column */}
                      <div className="col-span-2 sm:col-span-1 text-center font-mono font-bold text-sm text-[var(--text-secondary)]">
                        #{actualRank}
                      </div>

                      {/* Developer Info */}
                      <div className="col-span-6 sm:col-span-7 flex items-center gap-3 min-w-0">
                        <Avatar name={entry.username} size="sm" />
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent-light)] transition-colors truncate">
                            {entry.username}
                          </span>
                          {isSelf && <Badge variant="primary" size="sm">You</Badge>}
                        </div>
                      </div>

                      {/* Level */}
                      <div className="hidden sm:flex sm:col-span-2 justify-center">
                        <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
                          Level {entry.level || 1}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="col-span-4 sm:col-span-2 text-right font-mono font-black text-sm sm:text-base text-[var(--accent-light)]">
                        {formatScore(entry.score, metric)}
                      </div>
                    </motion.div>
                  );
                })}

                {entries.length === 0 && (
                  <div className="text-center py-12 text-[var(--text-muted)] text-sm">
                    No participants found for this leaderboard filter.
                  </div>
                )}
              </div>

            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </AppLayout>
  );
}
