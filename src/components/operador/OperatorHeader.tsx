import React from 'react';
import { Stethoscope } from 'lucide-react';
import { ConnectionDot, Select } from '../ui';
import type { ConsultingRoom } from '../../types/api';
import { tr } from '../../i18n';

interface Props {
  rooms: ConsultingRoom[];
  selectedRoomId: string | null;
  serviceName: (serviceId: string | null) => string;
  connected: boolean;
  onSelectRoom: (roomId: string) => void;
}

/** Barra superior: título de la estación, estado del tiempo real y selector de consultorio. */
export const OperatorHeader: React.FC<Props> = ({ rooms, selectedRoomId, serviceName, connected, onSelectRoom }) => (
  <div className="bg-white rounded-xl border border-surface-200 shadow-card px-5 py-3 flex flex-wrap justify-between items-center gap-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
        <Stethoscope size={18} className="text-primary-700" />
      </div>
      <div>
        <h1 className="text-sm font-bold text-surface-900">{tr('operator.estacion_profesional')}</h1>
        <p className="text-xs text-surface-500">{tr('operator.gestion_consultorio_y_turnos')}</p>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <ConnectionDot connected={connected} />
        <span className="text-xs text-surface-500">{connected ? tr('app.vivo') : tr('operator.reconectando')}</span>
      </div>
      <Select
        value={selectedRoomId ?? ''}
        onChange={onSelectRoom}
        options={rooms.map(r => ({ value: r.id, label: `${r.name} — ${serviceName(r.medicalServiceId)}` }))}
      />
    </div>
  </div>
);
