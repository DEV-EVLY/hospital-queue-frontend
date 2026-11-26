import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, Modal } from '../../../ui';
import { getErrorMessage } from '../../../../services/api';
import { tr } from '../../../../i18n';
import { FormError } from '../_shared';
import { BLANK_SPECIALTY, specialtyFormError, type SpecialtyForm } from './doctorForm';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Debe lanzar el error si falla: el modal lo muestra sin cerrarse. */
  onSave: (form: SpecialtyForm) => Promise<void>;
}

/** Alta de una especialidad médica. */
export const SpecialtyFormModal: React.FC<Props> = ({ open, onClose, onSave }) => {
  const [form, setForm]   = useState<SpecialtyForm>({ ...BLANK_SPECIALTY });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setForm({ ...BLANK_SPECIALTY }); setError(null); } }, [open]);

  const set = (patch: Partial<SpecialtyForm>) => setForm(f => ({ ...f, ...patch }));

  const submit = async () => {
    const problem = specialtyFormError(form);
    if (problem) { setError(problem); return; }
    setError(null);
    try { await onSave(form); onClose(); }
    catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tr('medicos.nueva_especialidad')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('common.cancelar')}</Button>
          <Button icon={<Save className="w-4 h-4" />} onClick={submit}>{tr('medicos.crear_especialidad')}</Button>
        </>
      }
    >
      <FormError msg={error} onDismiss={() => setError(null)} />
      <div className="space-y-4">
        <Input label={tr('common.codigo_2')} placeholder="CARD" value={form.code}
          onChange={e => set({ code: e.target.value.toUpperCase() })} fullWidth />
        <Input label={tr('common.nombre_2')} placeholder={tr('common.cardiologia')} value={form.name}
          onChange={e => set({ name: e.target.value })} fullWidth />
        <Input label={tr('common.descripcion')} maxLength={500} placeholder={tr('common.descripcion_opcional')} value={form.description}
          onChange={e => set({ description: e.target.value })} fullWidth />
      </div>
    </Modal>
  );
};
