import { cn } from '@utils/format.utils';

// Badge component
export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const variants = {
    default: 'bg-surface-2 text-text-secondary',
    primary: 'bg-primary/20 text-primary border border-primary/30',
    success: 'bg-success/10 text-success border border-success/30',
    error: 'bg-error/10 text-error border border-error/30',
    warning: 'bg-warning/10 text-warning border border-warning/30',
    info: 'bg-info/10 text-info border border-info/30',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-lg font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
};

// Avatar component
export const Avatar = ({ src, name, size = 'md', className = '' }) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-2xl',
  };
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return src ? (
    <img
      src={src}
      alt={name}
      className={cn('rounded-full object-cover ring-2 ring-border', sizes[size], className)}
    />
  ) : (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold bg-gradient-to-br from-primary/30 to-yellow-600/20 text-primary ring-2 ring-border',
      sizes[size], className
    )}>
      {initials}
    </div>
  );
};

// Spinner component
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10', xl: 'w-16 h-16' };
  return (
    <div className={cn(
      'border-2 border-primary/20 border-t-primary rounded-full animate-spin',
      sizes[size], className
    )} />
  );
};

// Loading overlay
export const LoadingOverlay = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-20">
    <Spinner size="lg" />
    <p className="text-text-secondary text-sm">{message}</p>
  </div>
);

// Divider
export const Divider = ({ label, className = '' }) => (
  <div className={cn('flex items-center gap-3', className)}>
    <div className="flex-1 h-px bg-border" />
    {label && <span className="text-xs text-muted px-2">{label}</span>}
    <div className="flex-1 h-px bg-border" />
  </div>
);
