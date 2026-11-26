import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, Modal, Select } from '../../../ui';
import { getErrorMessage } from '../../../../services/api';
import type { ConsultingRoom, MedicalService } from '../../../../types/api';
import { tr } from '../../../../i18n';
import { FormError } from '../_shared';
import { BLANK_ROOM, roomFormError, toRoomForm, type RoomForm } from './catalogForms';

interface Props {
  open: boolean;
  /** Consultorio que se edita (null = crear) */
  editing: ConsultingRoom | null;
  services: MedicalService[];
  onClose: () => void;
  /** Debe lanzar el error si falla: el modal lo muestra sin cerrarse. */
  onSave: (editingId: string | null, form: RoomForm) => Promise<void>;
}

/** Crear o editar un consultorio. El formulario y sus errores son estado propio del modal. */
export const RoomFormModal: React.FC<Props> = ({ open, editing, services, onClose, onSave }) => {
  const [form, setForm]   = useState<RoomForm>({ ...BLANK_ROOM });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? toRoomForm(editing) : { ...BLANK_ROOM });
    setError(null);
  }, [open, editing]);

  const set = (patch: Partial<RoomForm>) => setForm(f => ({ ...f, ...patch }));

  const submit = async () => {
    const problem = roomFormError(form);
    if (problem) { setError(problem); return; }
    setError(null);
    try { await onSave(editing?.id ?? null, form); onClose(); }
    catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  // Solo se ofrecen servicios activos como destino
  const serviceOptions = [
    { value: '', label: tr('common.sin_asignar') },
    ...services.filter(s => s.active).map(s => ({ value: s.id, label: s.name })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('catalogo.editar_consultorio') : tr('catalogo.nuevo_consultorio')}
      description={tr('catalogo.registra_codigo_servicio_asignado_y')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('common.cancelar')}</Button>
          <Button icon={<Save className="w-4 h-4" />} onClick={submit}>
            {editing ? tr('common.guardar_cambios') : tr('catalogo.crear_consultorio')}
          </Button>
        </>
      }
    >
      <FormError msg={error} onDismiss={() => setError(null)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={tr('common.nombre_2')} maxLength={100} placeholder={tr('catalogo.consultorio_1')}
          value={form.name} onChange={e => set({ name: e.target.value })} fullWidth />
        <Input label={tr('common.codigo_2')} maxLength={20} placeholder="C-01"
          value={form.code} onChange={e => set({ code: e.target.value })} fullWidth />
        <Select label={tr('catalogo.servicio_medico')} value={form.medicalServiceId} onChange={v => set({ medicalServiceId: v })}
          options={serviceOptions} fullWidth />
        <Input label={tr('common.ubicacion')} maxLength={100} placeholder={tr('catalogo.planta_baja_ala_a')}
          value={form.location} onChange={e => set({ location: e.target.value })} fullWidth className="sm:col-span-2" />
      </div>
    </Modal>
  );
};
