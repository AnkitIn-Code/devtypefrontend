import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Award, CheckCircle, Sparkles, CheckCircle2, Trophy, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@layouts/AppLayout';
import { Spinner } from '@components/common/Badge';
import { gamificationApi } from '@api/gamification.api';
import { useAchievementSocket } from '@hooks/useAchievementSocket';
import { ACHIEVEMENTS_DATA } from '@constants';

const getDifficultyBadge = (achievement) => {
  const code = achievement.code || achievement.id || '';
  const val = achievement.criteriaValue || 0;

  if (code.includes('100') || code.includes('120') || code.includes('500') || code.includes('30') || val >= 100) {
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Hard</span>;
  }
  if (code.includes('75') || code.includes('50') || code.includes('7') || code.includes('15') || val >= 50) {
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Medium</span>;
  }
  return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Easy</span>;
};

const AchievementCard = ({ achievement }) => {
  const isUnlocked = achievement.unlocked || (achievement.progress >= 100);
  const progress = isUnlocked ? 100 : (achievement.progress || 0);

  const rawIcon = achievement.iconUrl || achievement.icon;
  const isUrl = typeof rawIcon === 'string' && (
    rawIcon.startsWith('http') || rawIcon.startsWith('/') || rawIcon.endsWith('.png') || rawIcon.endsWith('.svg')
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isUnlocked ? { y: -3, scale: 1.01 } : {}}
      className={`relative p-5 rounded-2xl border text-center transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        isUnlocked
          ? 'glass-card border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface'
          : 'bg-surface/40 border-border/40 opacity-75'
      }`}
    >
      <div className="absolute top-3 left-3">
        {getDifficultyBadge(achievement)}
      </div>

      {!isUnlocked && (
        <div className="absolute top-3 right-3 text-muted">
          <Lock size={14} />
        </div>
      )}

      <div className="mt-4">
        <div className={`h-12 flex items-center justify-center mb-3 ${!isUnlocked ? 'grayscale opacity-60' : ''}`}>
          {isUrl ? (
            <img
              src={rawIcon}
              alt={achievement.name}
              className="w-10 h-10 object-contain mx-auto"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                if (e.target.parentNode) {
                  e.target.parentNode.innerHTML = '<span class="text-3xl">🏆</span>';
                }
              }}
            />
          ) : (
            <span className="text-3xl">{rawIcon || '🏆'}</span>
          )}
        </div>
        <h3 className="font-bold text-text-primary text-sm mb-1 line-clamp-1 break-words">{achievement.name || achievement.title}</h3>
        <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-2 break-words">{achievement.description}</p>
      </div>

      <div>
        {isUnlocked ? (
          <div className="inline-flex items-center gap-1.5 bg-primary/20 border border-primary/40 text-primary text-xs font-bold px-3 py-1 rounded-full">
            <CheckCircle size={12} /> Unlocked · +{achievement.xp} XP
          </div>
        ) : (
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <div className="flex justify-between text-[11px] font-medium text-muted">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted block font-medium">+{achievement.xp} XP on unlock</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Achievements = () => {
  const [filter, setFilter] = useState('ALL'); // ALL | EASY | MEDIUM | HARD | UNLOCKED | LOCKED

  // Listen for real-time achievement unlocks via Socket.IO
  useAchievementSocket();

  const { data: achievements, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: gamificationApi.getAchievements,
    select: d => d.data,
    staleTime: 120_000,
    gcTime: 300_000,
  });

  // C-03: Season history from GET /api/seasons/history
  const { data: seasonHistory } = useQuery({
    queryKey: ['season-history'],
    queryFn: gamificationApi.getSeasonHistory,
    select: d => d.data,
    staleTime: 120_000,
    retry: false, // Gracefully no-op if user has no season history
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20"><Spinner size="xl" /></div>
      </AppLayout>
    );
  }

  const list = (achievements && achievements.length > 0) ? achievements : ACHIEVEMENTS_DATA;
  const unlockedList = list.filter(a => a.unlocked || a.progress >= 100);
  const unlockedCount = unlockedList.length;
  const totalCount = list.length;
  const overallPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const filteredList = list.filter(a => {
    const isUnlocked = a.unlocked || a.progress >= 100;
    if (filter === 'UNLOCKED') return isUnlocked;
    if (filter === 'LOCKED') return !isUnlocked;
    if (filter === 'EASY' || filter === 'MEDIUM' || filter === 'HARD') {
      const code = a.code || a.id || '';
      const val = a.criteriaValue || 0;
      let difficulty = 'EASY';
      if (code.includes('100') || code.includes('120') || code.includes('500') || code.includes('30') || val >= 100) {
        difficulty = 'HARD';
      } else if (code.includes('75') || code.includes('50') || code.includes('7') || code.includes('15') || val >= 50) {
        difficulty = 'MEDIUM';
      }
      return difficulty === filter;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Award size={24} className="text-primary" /> Achievements & Badges
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Unlock tiered developer badges by improving typing speed, consistency, and accuracy
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap bg-surface-2 p-1 rounded-xl border border-border/40 shrink-0 gap-1">
            {['ALL', 'EASY', 'MEDIUM', 'HARD', 'UNLOCKED'].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === t
                    ? 'bg-primary text-zinc-950 shadow-md'
                    : 'text-muted hover:text-text-primary'
                }`}
              >
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION: UNLOCKED ACHIEVEMENTS SHOWCASE (Only rendered if user has completed achievements) */}
        {unlockedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-surface to-surface-2 space-y-4 shadow-xl relative overflow-hidden"
          >
            {/* Ambient background glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-400" />
                <h2 className="font-bold text-base text-text-primary">Your Unlocked Achievements</h2>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {unlockedCount} Completed
                </span>
              </div>
              <span className="text-xs text-emerald-400 font-medium">✨ Keep leveling up!</span>
            </div>

            {/* Grid of Unlocked Achievements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {unlockedList.map(a => (
                <div
                  key={a.id || a.code}
                  className="p-3 rounded-xl bg-surface/80 border border-emerald-500/30 flex items-center gap-3 shadow-md hover:border-emerald-400 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                    {a.iconUrl || a.icon || '🏆'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-xs text-text-primary truncate">{a.name}</p>
                      <span className="text-[10px] font-extrabold text-emerald-400 shrink-0">+{a.xp} XP</span>
                    </div>
                    <p className="text-[11px] text-muted truncate mt-0.5">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Overall Progress Bar */}
        <div className="glass-card p-5 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles size={16} className="text-primary" /> Overall Unlock Progress
            </span>
            <span className="font-bold text-primary">{unlockedCount} / {totalCount} ({overallPct}%)</span>
          </div>
          <div className="h-3 bg-surface-2 rounded-full overflow-hidden border border-border/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-primary via-amber-400 to-yellow-300 rounded-full"
            />
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredList.map(a => (
            <AchievementCard key={a.id || a.code} achievement={a} />
          ))}
        </div>

        {filteredList.length === 0 && (
          <div className="text-center py-12 text-muted text-sm glass-card">
            No achievements match the selected filter.
          </div>
        )}

        {/* ── Season History (C-03) ─────────────────────────────────────────── */}
        {seasonHistory && seasonHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-primary/20 bg-surface-2/40 space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <Trophy size={18} className="text-primary" />
              <h2 className="font-bold text-base text-text-primary">Season History</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {seasonHistory.length} Season{seasonHistory.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {seasonHistory.map((entry, i) => (
                <div
                  key={entry.seasonId || i}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface/70 border border-border/30 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Calendar size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        {entry.seasonName || `Season ${i + 1}`}
                      </p>
                      {entry.snapshottedAt && (
                        <p className="text-[11px] text-muted">
                          Ended {new Date(entry.snapshottedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-primary font-mono">
                      {entry.finalElo ?? '—'} ELO
                    </div>
                    {entry.finalRank && (
                      <div className="text-[11px] text-muted">Rank #{entry.finalRank}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Achievements;
