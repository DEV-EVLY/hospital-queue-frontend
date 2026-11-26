import React from 'react';
import { Edit2 } from 'lucide-react';
import { Badge, Select } from '../../../ui';
import type { Doctor, DoctorStatus, Specialty } from '../../../../types/api';
import { doctorStatusOptions, tr } from '../../../../i18n';
import { TD } from '../_shared';

interface Props {
  doctor: Doctor;
  specialty: Specialty | undefined;
  onStatusChange: (status: DoctorStatus) => void;
  onToggleActive: () => void;
  onEdit: () => void;
}

/** Fila de la tabla de médicos: datos, estado editable en la misma fila, activo y editar. */
export const DoctorRow: React.FC<Props> = ({ doctor: d, specialty, onStatusChange, onToggleActive, onEdit }) => (
  <tr className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
    <TD><div className="font-semibold text-surface-900">{d.firstName} {d.lastName}</div></TD>
    <TD><code className="text-xs font-mono text-primary-700">{d.licenseNumber}</code></TD>
    <TD className="text-surface-600">{specialty?.name || <span className="text-surface-300">—</span>}</TD>
    <TD className="text-surface-600">
      <div>{d.phone || '—'}</div>
      <div className="text-xs text-surface-400">{d.email || ''}</div>
    </TD>
    <TD>
      <Select value={d.status || 'AVAILABLE'} onChange={onStatusChange} options={doctorStatusOptions()} />
    </TD>
    <TD>
      <button onClick={onToggleActive}>
        {d.active
          ? <Badge variant="success" dot>{tr('medicos.si')}</Badge>
          : <Badge variant="gray" dot>{tr('medicos.no')}</Badge>}
      </button>
    </TD>
    <TD className="text-right">
      <button onClick={onEdit} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
        <Edit2 className="w-4 h-4" />
      </button>
    </TD>
  </tr>
);
