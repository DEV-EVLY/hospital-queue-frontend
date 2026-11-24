import React from 'react';
import { AlertCircle, Heart, UserCheck } from 'lucide-react';
import { tr } from '../../i18n';
import { ConditionCard, type ConditionColor } from './ConditionCard';
import type { ConditionKey, Conditions } from './types';

const OPTIONS: { key: ConditionKey; color: ConditionColor; Icon: typeof Heart; label: () => string }[] = [
  { key: 'pregnant',   color: 'pink',   Icon: Heart,       label: () => tr('kiosk.pregnant') },
  { key: 'elderly',    color: 'amber',  Icon: UserCheck,   label: () => tr('kiosk.senior') },
  { key: 'disability', color: 'purple', Icon: AlertCircle, label: () => tr('kiosk.disability') },
];

interface Props {
  conditions: Conditions;
  onToggle: (key: ConditionKey) => void;
  /** `md`: compacto (dentro de la tarjeta de cita). `lg`: pantalla propia de condiciones. */
  size?: 'md' | 'lg';
}

/** Las tres condiciones preferenciales como tarjetas táctiles. */
export const ConditionToggles: React.FC<Props> = ({ conditions, onToggle, size = 'lg' }) => (
  <div className={`grid grid-cols-3 ${size === 'lg' ? 'gap-4' : 'gap-3'}`}>
    {OPTIONS.map(({ key, color, Icon, label }) => (
      <ConditionCard
        key={key}
        active={conditions[key]}
        onToggle={() => onToggle(key)}
        color={color}
        icon={<Icon className={size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'} />}
        label={label()}
      />
    ))}
  </div>
);
