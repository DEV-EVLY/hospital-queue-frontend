import React from 'react';
import { clsx } from 'clsx';
import type { TicketStatus, PriorityLevel } from '../../types/api';
import { statusLabel, priorityLabel } from '../../i18n';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'gray';
type BadgeSize    = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-700',
  primary: 'bg-primary-100 text-primary-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger:  'bg-red-100 text-red-800',
  purple:  'bg-purple-100 text-purple-800',
  gray:    'bg-gray-100 text-gray-600',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-surface-400',
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  purple:  'bg-purple-500',
  gray:    'bg-gray-400',
};

export const Badge = ({ children, variant = 'default', size = 'sm', dot, className }: BadgeProps) => (
  <span className={clsx(
    'inline-flex items-center gap-1.5 font-medium rounded-full',
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
    variantClasses[variant],
    className,
  )}>
    {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
    {children}
  </span>
);

// ─── Semantic badge for ticket status ────────────────────────────────────────

const STATUS_VARIANT: Record<TicketStatus, BadgeVariant> = {
  WAITING: 'warning', CALLED: 'primary', IN_ATTENTION: 'success', ATTENDED: 'gray',
  NOT_ATTENDED: 'danger', REFERRED: 'purple', CANCELLED: 'gray',
};

export const StatusBadge = ({ status, size }: { status: TicketStatus; size?: BadgeSize }) => {
  return <Badge variant={STATUS_VARIANT[status] ?? 'default'} size={size} dot>{statusLabel(status)}</Badge>;
};

// ─── Semantic badge for priority ─────────────────────────────────────────────

const PRIORITY_VARIANT: Record<PriorityLevel, BadgeVariant> = {
  URGENT: 'danger', PREFERENTIAL: 'warning', NORMAL: 'primary',
};

export const PriorityBadge = ({ priority, size }: { priority: PriorityLevel; size?: BadgeSize }) => {
  return <Badge variant={PRIORITY_VARIANT[priority] ?? 'default'} size={size}>{priorityLabel(priority)}</Badge>;
};
