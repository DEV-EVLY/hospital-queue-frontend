import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconEnd?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconEnd, fullWidth, className, id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={clsx('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-surface-700 select-none">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'block rounded-lg border bg-white text-sm text-surface-900 placeholder-surface-400 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
              icon ? 'pl-9' : 'pl-3',
              iconEnd ? 'pr-9' : 'pr-3',
              'py-2.5',
              error ? 'border-red-400 focus:ring-red-500' : 'border-surface-200 hover:border-surface-300',
              fullWidth && 'w-full',
              className,
            )}
            {...rest}
          />
          {iconEnd && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
              {iconEnd}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-600 flex items-center gap-1">{error}</p>}
        {!error && hint && <p className="text-xs text-surface-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

