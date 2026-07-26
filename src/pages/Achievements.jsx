import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { AppLayout } from '@layouts/AppLayout';
import { useAuthStore } from '@store/auth.store';
import { ACHIEVEMENTS_DATA } from '@constants';

const AchievementCard = ({ achievement, isUnlocked }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={isUnlocked ? { y: -4, scale: 1.02 } : {}}
    className={`relative p-5 rounded-2xl border text-center transition-all duration-300 ${
      isUnlocked
        ? 'glass-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'
        : 'bg-surface/40 border-border opacity-50 grayscale'
    }`}
  >
    {!isUnlocked && (
      <div className="absolute top-3 right-3">
        <Lock size={14} className="text-muted" />
      </div>
    )}

    <div className={`text-4xl mb-3 ${!isUnlocked ? 'grayscale' : ''}`}>
      {achievement.icon}
    </div>
    <h3 className="font-bold text-text-primary text-sm mb-1">{achievement.title}</h3>
    <p className="text-xs text-muted leading-relaxed">{achievement.description}</p>

    {isUnlocked ? (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="mt-3 inline-block bg-primary/20 border border-primary/30 text-primary text-xs font-semibold px-2.5 py-1 rounded-full"
      >
        ✓ Unlocked · +{achievement.xp} XP
      </motion.div>
    ) : (
      <div className="mt-3 inline-block bg-surface-2 text-muted text-xs px-2.5 py-1 rounded-full">
        +{achievement.xp} XP
      </div>
    )}
  </motion.div>
);

const Achievements = () => {
  const { user } = useAuthStore();
  const unlockedIds = user?.achievements || ['wpm_100', 'react_master', 'streak_30'];
  const unlockedCount = unlockedIds.length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Achievements</h1>
          <p className="text-text-secondary text-sm mt-1">
            {unlockedCount} of {ACHIEVEMENTS_DATA.length} unlocked
          </p>
        </div>

        {/* Progress Bar */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-secondary">Progress</span>
            <span className="font-semibold text-primary">{unlockedCount}/{ACHIEVEMENTS_DATA.length}</span>
          </div>
          <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedCount / ACHIEVEMENTS_DATA.length) * 100}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-yellow-300 rounded-full"
            />
          </div>
        </div>

        {/* Unlocked Section */}
        {unlockedCount > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Unlocked 🏆</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {ACHIEVEMENTS_DATA.filter(a => unlockedIds.includes(a.id)).map(a => (
                <AchievementCard key={a.id} achievement={a} isUnlocked />
              ))}
            </div>
          </div>
        )}

        {/* Locked Section */}
        {unlockedCount < ACHIEVEMENTS_DATA.length && (
          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Locked</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {ACHIEVEMENTS_DATA.filter(a => !unlockedIds.includes(a.id)).map(a => (
                <AchievementCard key={a.id} achievement={a} isUnlocked={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Achievements;
