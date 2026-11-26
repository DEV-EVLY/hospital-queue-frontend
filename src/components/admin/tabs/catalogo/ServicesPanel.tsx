import React from 'react';
import { Edit2, Plus, RefreshCw } from 'lucide-react';
import { Badge, Button, Card } from '../../../ui';
import type { MedicalService } from '../../../../types/api';
import { tr, trp } from '../../../../i18n';
import { FormError, TD, TH } from '../_shared';
import type { MedicalServicesList } from './useMedicalServices';

interface Props {
  list: MedicalServicesList;
  onNew: () => void;
  onEdit: (service: MedicalService) => void;
}

/** Pestaña "Servicios médicos": tabla con estado activo editable y alta/edición. */
export const ServicesPanel: React.FC<Props> = ({ list, onNew, onEdit }) => (
  <Card padding="none">
    <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
      <div>
        <h3 className="text-sm font-semibold text-surface-900">{tr('catalogo.servicios_medicos')}</h3>
        <p className="text-xs text-surface-500 mt-0.5">{trp('catalogo.n_servicios_registrados', list.services.length)}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={list.reload}>{tr('common.recargar')}</Button>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNew}>{tr('common.agregar')}</Button>
      </div>
    </div>

    {list.error && <div className="px-6 pt-3"><FormError msg={list.error} onDismiss={() => list.setError(null)} /></div>}

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100">
            <TH>{tr('common.nombre')}</TH><TH>{tr('catalogo.prefijo')}</TH><TH className="text-right">{tr('catalogo.t_est')}</TH>
            <TH>{tr('common.estado')}</TH><TH className="text-right">{tr('common.acciones')}</TH>
          </tr>
        </thead>
        <tbody>
          {list.services.map(s => (
            <tr key={s.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
              <TD><span className="font-semibold text-surface-900">{s.name}</span></TD>
              <TD><Badge variant="primary">[{s.ticketPrefix}]</Badge></TD>
              <TD className="text-right text-surface-600 font-mono">{s.estimatedMinutes} min</TD>
              <TD>
                <button onClick={() => list.toggleActive(s.id)}>
                  {s.active
                    ? <Badge variant="success" dot>{tr('common.activo')}</Badge>
                    : <Badge variant="gray" dot>{tr('common.inactivo')}</Badge>}
                </button>
              </TD>
              <TD className="text-right">
                <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </TD>
            </tr>
          ))}
          {list.services.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-surface-400 text-sm">{tr('catalogo.no_hay_servicios_medicos_registrados')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Card>
);
