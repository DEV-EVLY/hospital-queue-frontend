import React from 'react';
import { Button } from '../ui';
import type { MedicalService } from '../../types/api';
import { tr } from '../../i18n';
import { ConditionToggles } from './ConditionToggles';
import { InlineError } from './KioskNotices';
import { getServiceIcon } from './serviceIcons';
import type { ConditionKey, Conditions } from './types';

interface Props {
  service: MedicalService | null;
  conditions: Conditions;
  errorMsg: string | null;
  loading: boolean;
  onToggleCondition: (key: ConditionKey) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** Paso 4: ¿alguna condición especial? Define la prioridad preferencial y emite el ticket. */
export const ConditionsStep: React.FC<Props> = ({
  service, conditions, errorMsg, loading, onToggleCondition, onBack, onContinue,
}) => (
  <div className="w-full max-w-md flex flex-col gap-6">
    <div className="text-center">
      <h2 className="text-2xl font-black text-surface-900 mb-1">{tr('kiosk.tiene_alguna_condicion_especial')}</h2>
      <p className="text-sm text-surface-500">{tr('kiosk.preferential_conditions')}</p>
    </div>

    {service && (
      <div className="flex items-center gap-3 bg-primary-50 border border-primary-100 rounded-xl2 px-4 py-3">
        <div className="text-primary-600">{getServiceIcon(service.iconName)}</div>
        <div>
          <p className="text-xs text-primary-500 font-medium uppercase tracking-wider">{tr('kiosk.servicio_seleccionado')}</p>
          <p className="text-sm font-bold text-primary-800">{service.name}</p>
        </div>
      </div>
    )}

    <ConditionToggles conditions={conditions} onToggle={onToggleCondition} size="lg" />

    <InlineError message={errorMsg} />

    <div className="flex gap-3">
      <Button variant="secondary" size="xl" fullWidth onClick={onBack}>{tr('kiosk.atras')}</Button>
      <Button variant="primary" size="xl" fullWidth loading={loading} onClick={onContinue}>
        {loading ? tr('kiosk.generando') : tr('kiosk.continuar')}
      </Button>
    </div>

    <div className="text-center">
      <button
        className="text-sm text-surface-400 hover:text-surface-600 underline underline-offset-2 transition-colors"
        onClick={onContinue}
        disabled={loading}
      >
        {tr('kiosk.ninguna_continuar_sin_condicion_especial')}
      </button>
    </div>
  </div>
);
