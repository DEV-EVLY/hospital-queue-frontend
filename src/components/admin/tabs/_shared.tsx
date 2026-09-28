import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../../ui';

// ── KPI card ──────────────────────────────────────────────────────────────────
export const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  trend?: 'up' | 'down' | null;
}> = ({ icon, label, value, sub, trend }) => (
  <Card className="flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">{label}</span>
      <span className="p-2 bg-surface-50 rounded-lg text-surface-600">{icon}</span>
    </div>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-bold text-surface-900 font-mono leading-none">{value}</span>
      {trend === 'up'   && <TrendingUp   className="w-4 h-4 text-green-500 mb-0.5" />}
      {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mb-0.5"   />}
    </div>
    <p className="text-xs text-surface-500">{sub}</p>
  </Card>
);

// ── Inline error banner ───────────────────────────────────────────────────────
export const FormError: React.FC<{ msg: string | null; onDismiss: () => void }> = ({ msg, onDismiss }) =>
  msg ? (
    <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-xs font-semibold mb-4">
      <span>{msg}</span>
      <button onClick={onDismiss} className="ml-4 text-red-400 hover:text-red-600 font-bold text-sm leading-none">&times;</button>
    </div>
  ) : null;

// ── Table helpers ─────────────────────────────────────────────────────────────
export const TH: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider bg-surface-50 ${className}`}>
    {children}
  </th>
);

export const TD: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-4 py-3 ${className}`}>{children}</td>
);

// ── Shared label maps ─────────────────────────────────────────────────────────
export const STATUS_LABELS: Record<string, string> = {
  WAITING: 'En Espera', CALLED: 'Llamado', IN_ATTENTION: 'En Atención',
  ATTENDED: 'Atendido', NO_SHOW: 'No se Presentó', DERIVED: 'Derivado', CANCELLED: 'Cancelado',
};

export const CHANNEL_LABELS: Record<string, string> = {
  KIOSK: 'Kiosko', OPERATOR: 'Operador', WEB: 'Web', HIS_AUTO: 'HIS Automático',
};

export const fmtSeconds = (s?: number | null) =>
  s != null ? `${Math.round(s / 60)} min` : '—';
