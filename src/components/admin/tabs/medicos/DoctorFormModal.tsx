import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, Modal, Select } from '../../../ui';
import { getErrorMessage } from '../../../../services/api';
import type { Doctor, DoctorRequest, Specialty } from '../../../../types/api';
import { tr } from '../../../../i18n';
import { FormError } from '../_shared';
import { BLANK_DOCTOR, doctorFormError, toDoctorForm, toDoctorPayload, type DoctorForm } from './doctorForm';

interface Props {
  open: boolean;
  /** Médico que se edita (null = crear) */
  editing: Doctor | null;
  specialties: Specialty[];
  onClose: () => void;
  /** Debe lanzar el error si falla: el modal lo muestra sin cerrarse. */
  onSave: (editingId: string | null, payload: DoctorRequest) => Promise<void>;
}

/** Crear o editar un médico. El formulario y sus errores son estado propio del modal. */
export const DoctorFormModal: React.FC<Props> = ({ open, editing, specialties, onClose, onSave }) => {
  const [form, setForm]   = useState<DoctorForm>({ ...BLANK_DOCTOR });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? toDoctorForm(editing) : { ...BLANK_DOCTOR });
    setError(null);
  }, [open, editing]);

  const set = (patch: Partial<DoctorForm>) => setForm(f => ({ ...f, ...patch }));

  const submit = async () => {
    const problem = doctorFormError(form);
    if (problem) { setError(problem); return; }
    setError(null);
    try {
      await onSave(editing?.id ?? null, toDoctorPayload(form));
      onClose();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('medicos.editar_medico') : tr('medicos.nuevo_medico')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('common.cancelar')}</Button>
          <Button icon={<Save className="w-4 h-4" />} onClick={submit}>
            {editing ? tr('common.guardar_cambios') : tr('medicos.crear_medico')}
          </Button>
        </>
      }
    >
      <FormError msg={error} onDismiss={() => setError(null)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={tr('medicos.cmp_nro_licencia')} maxLength={20} placeholder="CMP-12345"
          value={form.licenseNumber} onChange={e => set({ licenseNumber: e.target.value })} fullWidth />
        <Select label={tr('medicos.especialidad')} value={form.specialtyId} onChange={v => set({ specialtyId: v })}
          placeholder={tr('medicos.selecciona_especialidad')}
          options={specialties.map(s => ({ value: s.id, label: s.name }))} fullWidth />
        <Input label={tr('common.nombres')} maxLength={100} placeholder={tr('medicos.maria')}
          value={form.firstName} onChange={e => set({ firstName: e.target.value })} fullWidth />
        <Input label={tr('common.apellidos')} maxLength={100} placeholder={tr('medicos.gonzalez_torres')}
          value={form.lastName} onChange={e => set({ lastName: e.target.value })} fullWidth />
        <Input label={tr('common.telefono')} maxLength={20} placeholder="+51 999 999 999"
          value={form.phone} onChange={e => set({ phone: e.target.value })} fullWidth />
        <Input label={tr('common.correo_electronico')} maxLength={150} type="email" placeholder="medico@hospital.pe"
          value={form.email} onChange={e => set({ email: e.target.value })} fullWidth />
      </div>
    </Modal>
  );
};
