import React from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size    = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconEnd?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-900 shadow-sm disabled:bg-primary-300',
  secondary: 'bg-white text-surface-700 border border-surface-200 hover:bg-surface-50 hover:border-surface-300 active:bg-surface-100 shadow-sm disabled:opacity-50',
  ghost:     'text-surface-600 hover:bg-surface-100 hover:text-surface-900 active:bg-surface-200 disabled:opacity-50',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm disabled:bg-red-300',
  success:   'bg-health-600 text-white hover:bg-health-700 active:bg-health-800 shadow-sm disabled:bg-health-300',
};

const sizeClasses: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md:  'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg:  'px-5 py-3 text-base rounded-xl gap-2',
  xl:  'px-7 py-4 text-lg rounded-xl gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconEnd, fullWidth, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed select-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {iconEnd && !loading && <span className="shrink-0">{iconEnd}</span>}
    </button>
  )
);
Button.displayName = 'Button';
