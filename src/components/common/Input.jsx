import { forwardRef } from 'react';
import { cn } from '@utils/format.utils';

export const Input = forwardRef(({
  label,
  error,
  hint,
  icon: Icon,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <Icon size={16} />
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'input-field',
            Icon && 'pl-10',
            error && 'border-error/60 focus:border-error focus:ring-error/20',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef(({
  label,
  error,
  className = '',
  rows = 4,
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'input-field resize-none font-mono text-sm leading-relaxed',
          error && 'border-error/60',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export const Select = forwardRef(({
  label,
  error,
  options = [],
  className = '',
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'input-field appearance-none cursor-pointer',
          error && 'border-error/60',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-surface">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
