import React, { useEffect, useState } from 'react';
import { Button, Modal, Select } from '../ui';
import type { MedicalService } from '../../types/api';
import { tr } from '../../i18n';

interface Props {
  open: boolean;
  ticketCode: string;
  /** Servicio del consultorio actual: no se ofrece como destino */
  currentServiceId: string | null;
  services: MedicalService[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (targetServiceId: string) => void;
}

/** Elegir el servicio al que se deriva el turno. La selección es estado propio del modal. */
export const DeriveTicketModal: React.FC<Props> = ({
  open, ticketCode, currentServiceId, services, busy, onClose, onConfirm,
}) => {
  const [targetId, setTargetId] = useState('');

  // Cada vez que se abre empieza sin selección
  useEffect(() => { if (open) setTargetId(''); }, [open]);

  // Solo servicios activos y distintos del actual: derivar a uno inactivo deja el turno sin quien lo atienda
  const options = services.filter(s => s.id !== currentServiceId && s.active).map(s => ({ value: s.id, label: s.name }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tr('operator.derivar_paciente')}
      description={tr('operator.turno_codigo', { code: ticketCode })}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('common.cancelar')}</Button>
          <Button variant="primary" loading={busy} disabled={!targetId} onClick={() => onConfirm(targetId)}>
            {tr('operator.confirmar_derivacion')}
          </Button>
        </>
      }
    >
      <Select
        label={tr('operator.servicio_destino')}
        fullWidth
        value={targetId}
        onChange={setTargetId}
        options={[{ value: '', label: tr('operator.seleccionar_servicio') }, ...options]}
      />
    </Modal>
  );
};
