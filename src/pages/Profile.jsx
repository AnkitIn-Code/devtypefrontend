import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Target, FileCode2, Trophy, Flame, Clock } from 'lucide-react';
import { AppLayout } from '@layouts/AppLayout';
import { Avatar, Spinner } from '@components/common/Badge';
import { Button } from '@components/common/Button';
import { useAuthStore } from '@store/auth.store';
import { userApi } from '@api/user.api';
import { ACHIEVEMENTS_DATA, ROUTES } from '@constants';
import { formatDuration, formatNumber } from '@utils/format.utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Profile = () => {
  const { user: authUser } = useAuthStore();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', authUser?.id],
    queryFn: () => userApi.getProfile(authUser?.id),
    select: d => d.data,
    enabled: !!authUser,
  });

  const { data: userStats } = useQuery({
    queryKey: ['user-detail-stats'],
    queryFn: userApi.getStats,
    select: d => d.data,
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Spinner size="xl" /></div></AppLayout>;

  const p = profile || {};
  const stats = p.stats || {};
  const unlockedAchievements = (p.achievements || []);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar name={p.name} size="xl" />
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-text-primary">{p.name}</h1>
              <p className="text-text-secondary text-sm mt-0.5">{p.email}</p>
              {p.bio && <p className="text-muted text-sm mt-2">{p.bio}</p>}
              <div className="flex items-center gap-3 mt-3 flex-wrap justify-center sm:justify-start">
                <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <Zap size={14} className="text-primary" />
                  <span className="text-sm font-semibold text-primary">Level {p.level}</span>
                </div>
                <div className="bg-surface-2 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <Trophy size={14} className="text-warning" />
                  <span className="text-sm font-semibold">{formatNumber(p.credits || 0)} Credits</span>
                </div>
                <div className="bg-surface-2 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <Flame size={14} className="text-error" />
                  <span className="text-sm font-semibold">{p.streak}d Streak</span>
                </div>
              </div>

              {/* XP Bar */}
              <div className="mt-4 max-w-xs">
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>{formatNumber(p.xp || 0)} XP</span>
                  <span>{formatNumber(p.xpToNext || 10000)} XP</span>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((p.xp || 0) / (p.xpToNext || 10000)) * 100, 100)}%` }}
                    transition={{ delay: 0.3, duration: 1 }}
                    className="h-full bg-gradient-to-r from-primary to-yellow-300 rounded-full"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ROUTES.SETTINGS)}
            >
              Edit Profile
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Best WPM', value: stats.bestWpm || '--', icon: Zap, color: 'text-primary' },
            { label: 'Avg WPM', value: stats.avgWpm || '--', icon: Zap, color: 'text-yellow-300' },
            { label: 'Accuracy', value: stats.avgAccuracy ? `${stats.avgAccuracy}%` : '--', icon: Target, color: 'text-success' },
            { label: 'Total Tests', value: formatNumber(stats.totalTests || 0), icon: FileCode2, color: 'text-info' },
            { label: 'Time Coded', value: formatDuration(stats.totalTime || 0), icon: Clock, color: 'text-warning' },
            { label: 'MP Wins', value: stats.multiplayerWins || 0, icon: Trophy, color: 'text-purple-400' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="glass-card p-4 text-center"
            >
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* WPM History */}
        {userStats?.wpmHistory && (
          <div className="glass-card p-5">
            <h3 className="font-semibold text-text-primary mb-4 text-sm">WPM History (30 Days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={userStats.wpmHistory} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                <XAxis dataKey="date" tick={{ fill: '#71717A', fontSize: 10 }} />
                <YAxis tick={{ fill: '#71717A', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#27272A', border: '1px solid #3F3F46', borderRadius: 8 }} />
                <Line type="monotone" dataKey="wpm" stroke="#EAB308" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Achievements */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary text-sm">Achievements ({unlockedAchievements.length})</h3>
            <button onClick={() => navigate(ROUTES.ACHIEVEMENTS)} className="text-xs text-primary hover:underline">
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ACHIEVEMENTS_DATA.filter(a => unlockedAchievements.includes(a.id)).slice(0, 4).map(a => (
              <div key={a.id} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <span className="text-3xl">{a.icon}</span>
                <p className="text-xs font-medium text-text-primary">{a.title}</p>
                <p className="text-xs text-primary">+{a.xp} XP</p>
              </div>
            ))}
            {unlockedAchievements.length === 0 && (
              <div className="col-span-4 text-center py-6 text-muted text-sm">
                No achievements yet. Start practicing to earn some!
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
