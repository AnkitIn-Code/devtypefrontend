import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Zap } from 'lucide-react';
import { Button } from '@components/common/Button';

export const LevelUpToast = ({ isOpen, onClose, newLevel, xpEarned }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.5, y: 50, rotate: -5 }}
          animate={{ scale: 1, y: 0, rotate: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="relative max-w-sm w-full glass-card p-8 text-center border-2 border-primary/50 shadow-[0_0_50px_rgba(234,179,8,0.3)] bg-gradient-to-b from-primary/10 via-surface to-surface overflow-hidden"
        >
          {/* Confetti particles simulation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -20, x: Math.random() * 300 - 150, opacity: 1 }}
                animate={{ y: 400, opacity: 0, rotate: 360 }}
                transition={{ duration: 2 + Math.random(), repeat: Infinity, delay: Math.random() }}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#EAB308', '#22D3EE', '#A78BFA', '#10B981'][i % 4],
                  left: `${(i / 12) * 100}%`,
                }}
              />
            ))}
          </div>

          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-zinc-950 flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Zap size={40} className="fill-current" />
          </motion.div>

          <span className="text-xs font-bold uppercase tracking-widest text-primary flex items-center justify-center gap-1">
            <Sparkles size={14} /> Level Up! <Sparkles size={14} />
          </span>

          <h2 className="text-4xl font-black text-text-primary mt-1 mb-2">
            Level {newLevel}
          </h2>

          <p className="text-sm text-text-secondary mb-6">
            Congratulations! You earned <span className="font-bold text-primary">+{xpEarned} XP</span> and unlocked new rewards!
          </p>

          <Button onClick={onClose} variant="primary" size="lg" className="w-full font-bold">
            Continue Practice
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
