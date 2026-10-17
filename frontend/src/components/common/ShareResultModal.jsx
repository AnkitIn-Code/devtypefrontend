import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@components/common/Button';
import { Badge, Avatar } from '@components/common/Badge';

export const ShareResultModal = ({ isOpen, onClose, shareData }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !shareData) return null;

  const handleCopyText = () => {
    const text = `🚀 I just scored ${shareData.wpm} WPM with ${shareData.accuracy}% accuracy on DevType! (${shareData.snippetTitle || 'Code Practice'}) — Rank: ${shareData.rankBadge || 'PRO'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Result summary copied to clipboard!');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 16, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md rounded-3xl p-6 space-y-5 text-center shadow-2xl overflow-hidden z-10 transition-colors duration-300"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary" style={{ background: 'var(--accent-dim)' }}>
                <Share2 size={16} />
              </div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Share Session Result
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Card Preview Banner */}
          <div
            className="p-6 rounded-2xl space-y-4 relative border transition-all duration-300 text-left"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--accent-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar name={shareData.username || 'Dev'} url={shareData.userAvatarUrl} size="md" />
                <div>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {shareData.username || 'Developer'}
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Level {shareData.userLevel || 1}
                  </p>
                </div>
              </div>
              <Badge variant="primary" size="sm" className="font-bold uppercase tracking-wider">
                {shareData.rankBadge || 'PRO'}
              </Badge>
            </div>

            <div className="py-3 border-y grid grid-cols-2 gap-4 text-center" style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  Speed
                </span>
                <span className="text-3xl font-black font-mono" style={{ color: 'var(--accent-light)' }}>
                  {shareData.wpm} <span className="text-sm font-sans font-bold">WPM</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  Accuracy
                </span>
                <span className="text-3xl font-black font-mono text-emerald-500 dark:text-emerald-400">
                  {shareData.accuracy}%
                </span>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                💻 {shareData.snippetTitle || 'Code Snippet'}
              </p>
              <p className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Language: {shareData.snippetLanguage || 'javascript'}
              </p>
            </div>

            <div className="pt-2 flex justify-between items-center text-[10px] border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <span className="font-black tracking-widest uppercase" style={{ color: 'var(--accent-light)' }}>
                DevType
              </span>
              <span>{new Date(shareData.completedAt || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleCopyText}
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Summary'}
            </Button>
            <Button
              onClick={onClose}
              variant="primary"
              className="flex-1 py-2.5 text-xs font-bold"
            >
              Done
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
