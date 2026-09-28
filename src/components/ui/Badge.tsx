import React from 'react';
import { clsx } from 'clsx';
import type { EstadoTurno, NivelPrioridad } from '../../types';

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

const STATUS_CONFIG: Record<EstadoTurno, { label: string; variant: BadgeVariant }> = {
  EN_ESPERA:   { label: 'En espera',   variant: 'warning' },
  LLAMADO:     { label: 'Llamado',     variant: 'primary' },
  EN_ATENCION: { label: 'En atención', variant: 'success' },
  ATENDIDO:    { label: 'Atendido',    variant: 'gray'    },
  NO_ATENDIDO: { label: 'Ausente',     variant: 'danger'  },
  DERIVADO:    { label: 'Derivado',    variant: 'purple'  },
  CANCELADO:   { label: 'Cancelado',   variant: 'gray'    },
};

export const StatusBadge = ({ status, size }: { status: EstadoTurno; size?: BadgeSize }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'default' as BadgeVariant };
  return <Badge variant={cfg.variant} size={size} dot>{cfg.label}</Badge>;
};

// ─── Semantic badge for priority ─────────────────────────────────────────────

const PRIORITY_CONFIG: Record<NivelPrioridad, { label: string; variant: BadgeVariant }> = {
  URGENTE:      { label: 'Urgente',      variant: 'danger'  },
  PREFERENCIAL: { label: 'Preferencial', variant: 'warning' },
  NORMAL:       { label: 'Normal',       variant: 'primary' },
};

export const PriorityBadge = ({ priority, size }: { priority: NivelPrioridad; size?: BadgeSize }) => {
  const cfg = PRIORITY_CONFIG[priority] ?? { label: priority, variant: 'default' as BadgeVariant };
  return <Badge variant={cfg.variant} size={size}>{cfg.label}</Badge>;
};
