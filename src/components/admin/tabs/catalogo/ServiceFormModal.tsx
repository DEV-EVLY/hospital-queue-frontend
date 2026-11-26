import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, Modal, Select } from '../../../ui';
import { getErrorMessage } from '../../../../services/api';
import type { MedicalService } from '../../../../types/api';
import { iconOptions, tr } from '../../../../i18n';
import { FormError } from '../_shared';
import { BLANK_SERVICE, serviceFormError, toServiceForm, type ServiceForm } from './catalogForms';

interface Props {
  open: boolean;
  /** Servicio que se edita (null = crear) */
  editing: MedicalService | null;
  onClose: () => void;
  /** Debe lanzar el error si falla: el modal lo muestra sin cerrarse. */
  onSave: (editingId: string | null, form: ServiceForm) => Promise<void>;
}

/** Crear o editar un servicio médico. El formulario y sus errores son estado propio del modal. */
export const ServiceFormModal: React.FC<Props> = ({ open, editing, onClose, onSave }) => {
  const [form, setForm]   = useState<ServiceForm>({ ...BLANK_SERVICE });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? toServiceForm(editing) : { ...BLANK_SERVICE });
    setError(null);
  }, [open, editing]);

  const set = (patch: Partial<ServiceForm>) => setForm(f => ({ ...f, ...patch }));

  const submit = async () => {
    const problem = serviceFormError(form);
    if (problem) { setError(problem); return; }
    setError(null);
    try { await onSave(editing?.id ?? null, form); onClose(); }
    catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('catalogo.editar_servicio') : tr('catalogo.nuevo_servicio')}
      description={tr('catalogo.configura_servicio_prefijo_ticket_y')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('common.cancelar')}</Button>
          <Button icon={<Save className="w-4 h-4" />} onClick={submit}>
            {editing ? tr('common.guardar_cambios') : tr('catalogo.crear_servicio')}
          </Button>
        </>
      }
    >
      <FormError msg={error} onDismiss={() => setError(null)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={tr('common.nombre_2')} maxLength={100} placeholder={tr('common.cardiologia')}
          value={form.name} onChange={e => set({ name: e.target.value })} fullWidth />
        <Input label={tr('catalogo.prefijo_ticket')} placeholder="C" maxLength={3}
          value={form.ticketPrefix} onChange={e => set({ ticketPrefix: e.target.value.toUpperCase() })} fullWidth />
        <Input label={tr('catalogo.tiempo_estimado_min')} type="number" min={1} max={480}
          value={form.estimatedMinutes} onChange={e => set({ estimatedMinutes: +e.target.value })} fullWidth />
        <Select label={tr('catalogo.icono')} value={form.iconName} onChange={v => set({ iconName: v })}
          options={iconOptions()} fullWidth />
      </div>
    </Modal>
  );
};
