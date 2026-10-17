import { motion } from 'framer-motion';
import { cn } from '@utils/format.utils';

const variants = {
  primary: 'bg-primary text-zinc-900 hover:bg-yellow-400 shadow-glow-sm',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-2/50',
  outline: 'border border-border text-text-secondary hover:border-primary/50 hover:text-primary bg-transparent',
  danger: 'bg-error/10 text-error border border-error/30 hover:bg-error/20',
  glass: 'glass text-text-primary hover:bg-white/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
  icon: 'p-2.5',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) => {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl',
        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : children}
    </motion.button>
  );
};
