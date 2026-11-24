import React from 'react';
import { Button, Spinner } from '../ui';
import type { MedicalService } from '../../types/api';
import { tr } from '../../i18n';
import { getServiceIcon } from './serviceIcons';

const ServiceButton: React.FC<{ service: MedicalService; disabled: boolean; onSelect: () => void }> = ({ service, disabled, onSelect }) => (
  <button
    disabled={disabled}
    onClick={onSelect}
    style={{ minHeight: 120 }}
    className={[
      'group text-left bg-white border-2 border-surface-200 rounded-xl2',
      'p-5 flex flex-col gap-3 transition-all duration-150',
      'hover:border-primary-400 hover:shadow-card-md hover:bg-primary-50',
      'active:scale-[0.98] active:bg-primary-100',
      'disabled:opacity-60 disabled:cursor-not-allowed',
    ].join(' ')}
  >
    <div className="bg-surface-100 group-hover:bg-white rounded-xl p-3 w-fit transition-colors">
      {getServiceIcon(service.iconName)}
    </div>
    <div>
      <h3 className="text-lg font-black text-surface-900 group-hover:text-primary-700 transition-colors leading-snug">
        {service.name}
      </h3>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-surface-500 font-medium">{tr('kiosk.est_time')}: ~{service.estimatedMinutes} min</span>
        <span className="font-mono font-bold text-xs bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-lg">
          [{service.ticketPrefix}]
        </span>
      </div>
    </div>
  </button>
);

interface Props {
  services: MedicalService[];
  /** Se muestra el indicador de carga mientras no hay servicios ni error */
  showLoading: boolean;
  loading: boolean;
  onSelect: (service: MedicalService) => void;
  onBack: () => void;
}

/** Paso 3: catálogo de servicios disponibles en este kiosko. */
export const ServicesStep: React.FC<Props> = ({ services, showLoading, loading, onSelect, onBack }) => (
  <div className="w-full max-w-4xl flex flex-col gap-6">
    <div className="text-center">
      <h2 className="text-2xl font-black text-surface-900 mb-1">{tr('kiosk.seleccione_servicio_que_necesita')}</h2>
      <p className="text-sm text-surface-500">{tr('kiosk.select_service')}</p>
    </div>

    {showLoading && (
      <div className="flex flex-col items-center gap-3 py-16">
        <Spinner size="lg" />
        <p className="text-surface-500 text-sm">{tr('kiosk.cargando_servicios_disponibles')}</p>
      </div>
    )}

    {services.length > 0 && (
      <div className="grid grid-cols-2 gap-4">
        {services.map(s => <ServiceButton key={s.id} service={s} disabled={loading} onSelect={() => onSelect(s)} />)}
      </div>
    )}

    <div className="flex justify-center">
      <Button variant="ghost" size="lg" onClick={onBack}>{tr('kiosk.back_to_start')}</Button>
    </div>
  </div>
);
