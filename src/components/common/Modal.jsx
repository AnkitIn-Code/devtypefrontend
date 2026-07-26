import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative glass-card w-full ${sizes[size]} shadow-glass z-10`}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-border">
                {title && <h2 className="text-lg font-semibold text-text-primary">{title}</h2>}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-muted hover:text-text-primary hover:bg-surface-2 transition-colors ml-auto"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Login Required Modal
export const LoginRequiredModal = ({ isOpen, onClose, onLogin, feature = 'this feature' }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Login Required" size="sm">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <span className="text-3xl">🔒</span>
      </div>
      <div>
        <p className="text-text-secondary text-sm">
          You need to be logged in to access <strong className="text-text-primary">{feature}</strong>.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 btn-ghost border border-border rounded-xl py-2.5 text-sm"
        >
          Continue as Guest
        </button>
        <button
          onClick={onLogin}
          className="flex-1 btn-primary rounded-xl py-2.5 text-sm"
        >
          Login
        </button>
      </div>
    </div>
  </Modal>
);
