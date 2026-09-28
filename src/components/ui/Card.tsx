import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

const paddingClasses = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
};

export const Card = ({ children, className, padding = 'md' }: CardProps) => (
  <div className={clsx('bg-white rounded-xl border border-surface-200 shadow-card', paddingClasses[padding], className)}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, className }: CardHeaderProps) => (
  <div className={clsx('flex items-start justify-between gap-4 mb-4', className)}>
    <div>
      <h3 className="text-sm font-semibold text-surface-900 leading-tight">{title}</h3>
      {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardDivider = ({ className }: { className?: string }) => (
  <hr className={clsx('border-surface-100 my-4', className)} />
);

export const CardFooter = ({ children, className }: CardSectionProps) => (
  <div className={clsx('flex items-center justify-end gap-2 pt-4 mt-4 border-t border-surface-100', className)}>
    {children}
  </div>
);
