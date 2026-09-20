import { forwardRef } from 'react';
import { cn } from '@utils/format.utils';

export const Input = forwardRef(({
  label,
  error,
  hint,
  icon: Icon,
  rightElement,
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
      <div className="relative flex items-center">
        {Icon && (
          <span className="absolute left-3.5 text-muted pointer-events-none z-10">
            <Icon size={16} />
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'input-field w-full',
            Icon && 'pl-10',
            rightElement && 'pr-10',
            error && 'border-error/60 focus:border-error focus:ring-error/20',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center z-10">
            {rightElement}
          </div>
        )}
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
