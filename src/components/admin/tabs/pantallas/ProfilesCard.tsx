import React from 'react';
import { MonitorSmartphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card } from '../../../ui';
import type { DeviceProfile, MedicalService } from '../../../../types/api';
import { tr, trp } from '../../../../i18n';
import { TD, TH } from '../_shared';
import { languageLabel } from './profileForm';

interface Props {
  profiles: DeviceProfile[];
  services: MedicalService[];
  onNew: () => void;
  onEdit: (profile: DeviceProfile) => void;
  onDelete: (profile: DeviceProfile) => void;
}

/** Perfiles de pantalla (kiosko / cartelera): tabla con alta, edición y borrado. */
export const ProfilesCard: React.FC<Props> = ({ profiles, services, onNew, onEdit, onDelete }) => {
  const serviceName = (id: string) => services.find(s => s.id === id)?.name ?? id;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-50 text-primary-700 rounded-xl border border-primary-100">
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-surface-900">{tr('devices.perfiles_titulo')}</h2>
            <p className="text-xs text-surface-500 max-w-2xl">{tr('devices.perfiles_desc')}</p>
          </div>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={onNew}>{tr('devices.nuevo_perfil')}</Button>
      </div>

      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{tr('devices.modo_abierto')}</p>

      {profiles.length === 0 ? (
        <p className="text-sm text-surface-500 py-6 text-center">{tr('devices.sin_perfiles')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                <TH>{tr('common.nombre')}</TH><TH>{tr('devices.tipo')}</TH><TH>{tr('devices.idioma')}</TH>
                <TH>{tr('devices.servicios')}</TH><TH>{tr('common.estado')}</TH><TH className="text-right">{tr('common.acciones')}</TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {profiles.map(p => (
                <tr key={p.id} className="hover:bg-surface-50">
                  <TD className="font-semibold text-surface-900">{p.name}</TD>
                  <TD>{tr(`devices.tipo.${p.type}`)}</TD>
                  <TD>{languageLabel(p.language)}</TD>
                  <TD>
                    {p.serviceIds.length === 0
                      ? tr('devices.todos_servicios')
                      : <span title={p.serviceIds.map(serviceName).join(', ')}>{trp('devices.n_servicios', p.serviceIds.length)}</span>}
                  </TD>
                  <TD>
                    <Badge variant={p.active ? 'success' : 'gray'}>{p.active ? tr('common.activo') : tr('common.inactivo')}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => onEdit(p)}>{tr('devices.editar')}</Button>
                      <Button size="sm" variant="ghost" icon={<Trash2 className="w-4 h-4 text-red-600" />} onClick={() => onDelete(p)}>{tr('devices.eliminar')}</Button>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
