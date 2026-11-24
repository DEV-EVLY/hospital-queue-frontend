import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export type ConditionColor = 'pink' | 'amber' | 'purple';

const COLORS: Record<ConditionColor, { border: string; text: string }> = {
  pink:   { border: 'border-pink-400 bg-pink-50',     text: 'text-pink-700' },
  amber:  { border: 'border-amber-400 bg-amber-50',   text: 'text-amber-700' },
  purple: { border: 'border-purple-400 bg-purple-50', text: 'text-purple-700' },
};

interface Props {
  active: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  color: ConditionColor;
}

/** Tarjeta táctil grande para marcar una condición preferencial (gestante, adulto mayor, discapacidad). */
export const ConditionCard: React.FC<Props> = ({ active, onToggle, icon, label, color }) => {
  const c = COLORS[color];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      style={{ minHeight: 72 }}
      className={[
        'flex flex-col items-center justify-center gap-2 rounded-xl2 border-2 px-4 py-5 font-semibold text-sm',
        'transition-all duration-150 select-none cursor-pointer w-full',
        active
          ? `${c.border} ${c.text} shadow-card-md`
          : 'border-surface-200 bg-white text-surface-500 hover:border-surface-300 hover:bg-surface-50',
      ].join(' ')}
    >
      <span className={active ? c.text : 'text-surface-400'}>{icon}</span>
      <span className="text-center leading-tight">{label}</span>
      {active && <CheckCircle2 className={`w-4 h-4 ${c.text}`} />}
    </button>
  );
};
