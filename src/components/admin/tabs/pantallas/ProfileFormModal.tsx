import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Modal, Select } from '../../../ui';
import { getErrorMessage } from '../../../../services/api';
import type { DeviceProfile, DeviceProfileRequest, DeviceType, MedicalService, UserGroup } from '../../../../types/api';
import { LANGUAGES, tr, trp } from '../../../../i18n';
import { FormError } from '../_shared';
import { emptyProfileForm, isLastActive, mergeGroupServices, toProfileForm, toggleServiceId } from './profileForm';

const TYPES: DeviceType[] = ['KIOSK', 'DISPLAY'];

interface Props {
  open: boolean;
  /** Perfil que se edita (null = crear) */
  editing: DeviceProfile | null;
  profiles: DeviceProfile[];
  services: MedicalService[];
  groups: UserGroup[];
  onClose: () => void;
  /** Debe lanzar el error si falla: el modal lo muestra sin cerrarse. */
  onSave: (editing: DeviceProfile | null, body: DeviceProfileRequest) => Promise<void>;
}

/** Crear o editar un perfil de pantalla. El formulario y sus errores son estado propio del modal. */
export const ProfileFormModal: React.FC<Props> = ({ open, editing, profiles, services, groups, onClose, onSave }) => {
  const [form, setForm]     = useState<DeviceProfileRequest>(emptyProfileForm());
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? toProfileForm(editing) : emptyProfileForm());
    setError(null);
  }, [open, editing]);

  const set = (patch: Partial<DeviceProfileRequest>) => setForm(f => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.name.trim()) { setError(tr('devices.nombre_obligatorio')); return; }
    // Desactivar o cambiar de tipo el último perfil activo devuelve esas pantallas al modo abierto: se confirma
    if (editing && isLastActive(profiles, editing) && (!form.active || form.type !== editing.type)) {
      if (!confirm(tr('devices.ultimo_perfil_confirm', { type: tr(`devices.tipo.${editing.type}`) }))) return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(editing, { ...form, name: form.name.trim() });
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  /** Copia los servicios del grupo elegido al perfil (el perfil no queda ligado al grupo). */
  const addGroupServices = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) set({ serviceIds: mergeGroupServices(form.serviceIds, group) });
  };

  const groupsWithServices = groups.filter(g => g.serviceIds.length > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('devices.editar_perfil') : tr('devices.nuevo_perfil')}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tr('common.cancelar')}</Button>
          <Button loading={saving} onClick={submit}>{tr('devices.guardar')}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <FormError msg={error} onDismiss={() => setError(null)} />
        <Input label={tr('common.nombre')} value={form.name} maxLength={100} fullWidth onChange={e => set({ name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label={tr('devices.tipo')} value={form.type}
            options={TYPES.map(t => ({ value: t, label: tr(`devices.tipo.${t}`) }))} onChange={v => set({ type: v as DeviceType })} />
          <Select label={tr('devices.idioma')} value={form.language}
            options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))} onChange={v => set({ language: v })} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700">{tr('devices.servicios')}</span>
            <span className="text-xs text-surface-500">
              {form.serviceIds.length === 0 ? tr('devices.todos_servicios') : trp('devices.n_servicios', form.serviceIds.length)}
            </span>
          </div>
          <p className="text-xs text-surface-500">{tr('devices.servicios_ayuda')}</p>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border border-surface-200 rounded-lg p-2">
            {services.filter(s => s.active || form.serviceIds.includes(s.id)).map(s => (
              <Checkbox key={s.id} variant="card" label={s.name} checked={form.serviceIds.includes(s.id)}
                onChange={() => set({ serviceIds: toggleServiceId(form.serviceIds, s.id) })} />
            ))}
          </div>
          {groupsWithServices.length > 0 && (
            <Select label={tr('devices.agregar_grupo')} value="" placeholder={tr('devices.elegir_grupo')}
              options={groupsWithServices.map(g => ({ value: g.id, label: g.name }))} onChange={addGroupServices} />
          )}
        </div>

        <Checkbox label={tr('common.activo')} checked={form.active} onChange={e => set({ active: e.target.checked })} />
      </div>
    </Modal>
  );
};
