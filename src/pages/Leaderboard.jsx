import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Crown, Globe, Users, Calendar } from 'lucide-react';
import { AppLayout } from '@layouts/AppLayout';
import { Avatar, Badge, Spinner } from '@components/common/Badge';
import { useAuthStore } from '@store/auth.store';
import { leaderboardApi } from '@api/leaderboard.api';
import { LEADERBOARD_TABS } from '@constants';
import { formatNumber } from '@utils/format.utils';

const RankIcon = ({ rank }) => {
  if (rank === 1) return <Crown size={18} className="text-yellow-400" />;
  if (rank === 2) return <Medal size={18} className="text-zinc-400" />;
  if (rank === 3) return <Medal size={18} className="text-amber-600" />;
  return <span className="text-sm font-mono text-muted w-4 text-center">#{rank}</span>;
};

const LeaderboardRow = ({ entry, index, isCurrentUser }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.03 }}
    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
      isCurrentUser
        ? 'bg-primary/10 border border-primary/20'
        : index < 3
        ? 'bg-surface-2/30 hover:bg-surface-2/50'
        : 'hover:bg-surface-2/30'
    }`}
  >
    <div className="w-8 flex items-center justify-center shrink-0">
      <RankIcon rank={entry.rank} />
    </div>

    <Avatar name={entry.name} size="sm" />

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium text-text-primary text-sm truncate">{entry.name}</span>
        {isCurrentUser && <Badge variant="primary" size="sm">You</Badge>}
        <span className="text-xs text-muted">{entry.country}</span>
      </div>
      <div className="flex items-center gap-3 mt-0.5">
        <span className="text-xs text-muted">{formatNumber(entry.tests)} tests</span>
        <span className="text-xs text-muted">🔥 {entry.streak}d streak</span>
      </div>
    </div>

    <div className="flex items-center gap-8 shrink-0">
      <div className="text-right hidden sm:block">
        <div className="text-xs text-muted">Accuracy</div>
        <div className={`text-sm font-semibold ${entry.accuracy >= 98 ? 'text-success' : 'text-text-secondary'}`}>
          {entry.accuracy}%
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted">WPM</div>
        <div className={`text-xl font-black font-mono ${entry.rank <= 3 ? 'text-primary' : 'text-text-primary'}`}>
          {entry.wpm}
        </div>
      </div>
    </div>
  </motion.div>
);

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('Global');
  const { user } = useAuthStore();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['leaderboard', activeTab],
    queryFn: () => leaderboardApi.get(activeTab),
    select: d => d.data,
  });

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3, 50);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black flex items-center justify-center gap-2">
            <Trophy size={28} className="text-primary" /> Leaderboard
          </h1>
          <p className="text-text-secondary mt-2 text-sm">Top developers ranked by typing speed</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 glass-card p-1.5">
          {LEADERBOARD_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-primary text-zinc-900 shadow-glow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Top 3 Podium */}
              {topThree.length >= 3 && (
                <div className="flex items-end justify-center gap-4 mb-8">
                  {/* 2nd */}
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-4 text-center w-32 h-32 flex flex-col items-center justify-center"
                  >
                    <Avatar name={topThree[1].name} size="md" />
                    <p className="text-xs font-medium mt-2 truncate w-full text-center">{topThree[1].name}</p>
                    <p className="text-primary font-bold font-mono text-sm">{topThree[1].wpm}</p>
                    <span className="text-lg">🥈</span>
                  </motion.div>

                  {/* 1st */}
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-4 text-center w-36 h-40 flex flex-col items-center justify-center border-primary/30 shadow-glow"
                  >
                    <Avatar name={topThree[0].name} size="lg" />
                    <p className="text-xs font-medium mt-2 truncate w-full text-center">{topThree[0].name}</p>
                    <p className="text-primary font-black font-mono text-lg">{topThree[0].wpm}</p>
                    <span className="text-2xl">👑</span>
                  </motion.div>

                  {/* 3rd */}
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card p-4 text-center w-32 h-28 flex flex-col items-center justify-center"
                  >
                    <Avatar name={topThree[2].name} size="md" />
                    <p className="text-xs font-medium mt-2 truncate w-full text-center">{topThree[2].name}</p>
                    <p className="text-primary font-bold font-mono text-sm">{topThree[2].wpm}</p>
                    <span className="text-lg">🥉</span>
                  </motion.div>
                </div>
              )}

              {/* Full List */}
              <div className="glass-card p-4 space-y-1">
                {entries.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.userId}
                    entry={entry}
                    index={i}
                    isCurrentUser={entry.isCurrentUser}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
