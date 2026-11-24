import React from 'react';
import { Button, Modal } from '../ui';
import { statusLabel, tr } from '../../i18n';

interface Props {
  open: boolean;
  ticketCode: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirmación para finalizar la atención del turno actual. */
export const CompleteAttentionModal: React.FC<Props> = ({ open, ticketCode, busy, onClose, onConfirm }) => (
  <Modal
    open={open}
    onClose={onClose}
    title={tr('operator.finalizar_atencion')}
    description={tr('operator.turno_codigo', { code: ticketCode })}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>{tr('common.cancelar')}</Button>
        <Button variant="primary" loading={busy} onClick={onConfirm}>{tr('operator.confirmar_y_cerrar')}</Button>
      </>
    }
  >
    <p className="text-sm text-surface-600">{tr('operator.confirmar_cierre', { status: statusLabel('ATTENDED') })}</p>
  </Modal>
);
