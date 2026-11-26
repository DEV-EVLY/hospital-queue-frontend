import React from 'react';
import { Edit2, Plus, RefreshCw } from 'lucide-react';
import { Badge, Button, Card } from '../../../ui';
import type { ConsultingRoom, MedicalService } from '../../../../types/api';
import { roomStatusLabel, tr, trp } from '../../../../i18n';
import { FormError, TD, TH } from '../_shared';
import { ROOM_VARIANT } from './catalogForms';
import type { ConsultingRoomsList } from './useConsultingRooms';

interface Props {
  list: ConsultingRoomsList;
  /** Servicios del catálogo (para mostrar el nombre del servicio de cada consultorio) */
  services: MedicalService[];
  onNew: () => void;
  onEdit: (room: ConsultingRoom) => void;
}

const Dash = () => <span className="text-surface-300">—</span>;

/** Pestaña "Consultorios": tabla con estado (clic = abrir/cerrar) y alta/edición. */
export const RoomsPanel: React.FC<Props> = ({ list, services, onNew, onEdit }) => (
  <Card padding="none">
    <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
      <div>
        <h3 className="text-sm font-semibold text-surface-900">{tr('catalogo.consultorios')}</h3>
        <p className="text-xs text-surface-500 mt-0.5">{trp('catalogo.n_consultorios_registrados', list.rooms.length)}</p>
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
            <TH>{tr('common.nombre')}</TH><TH>{tr('common.codigo')}</TH><TH>{tr('common.servicio')}</TH>
            <TH>{tr('common.ubicacion')}</TH><TH>{tr('common.estado')}</TH><TH className="text-right">{tr('common.acciones')}</TH>
          </tr>
        </thead>
        <tbody>
          {list.rooms.map(r => (
            <tr key={r.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
              <TD><span className="font-semibold text-surface-900">{r.name}</span></TD>
              <TD><code className="text-xs font-mono text-primary-700">{r.code}</code></TD>
              <TD className="text-surface-600">{services.find(s => s.id === r.medicalServiceId)?.name || <Dash />}</TD>
              <TD className="text-surface-500">{r.location || <Dash />}</TD>
              <TD>
                <button onClick={() => list.toggleOpen(r.id)}
                  title={r.status === 'CLOSED' ? tr('catalogo.reabrir_consultorio') : tr('catalogo.cerrar_consultorio')}>
                  <Badge variant={ROOM_VARIANT[r.status] ?? 'gray'} dot>{roomStatusLabel(r.status)}</Badge>
                </button>
              </TD>
              <TD className="text-right">
                <button onClick={() => onEdit(r)} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </TD>
            </tr>
          ))}
          {list.rooms.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-surface-400 text-sm">{tr('catalogo.no_hay_consultorios_registrados')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Card>
);
