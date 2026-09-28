import React from 'react';
import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export const Spinner = ({ size = 'md', className }: SpinnerProps) => (
  <svg
    className={clsx('animate-spin text-primary-600', sizeClasses[size], className)}
    fill="none" viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

export const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
    <Spinner size="lg" />
    <p className="text-sm text-surface-500">Cargando...</p>
  </div>
);

export const ConnectionDot = ({ connected }: { connected: boolean }) => (
  <span className="relative inline-flex">
    <span className={clsx(
      'w-2.5 h-2.5 rounded-full',
      connected ? 'bg-health-500' : 'bg-red-400',
    )} />
    {connected && (
      <span className="absolute inset-0 rounded-full bg-health-500 animate-ping opacity-60" />
    )}
  </span>
);
