import React from 'react';
import { CheckCircle2, Printer, Volume2 } from 'lucide-react';
import { Button } from '../ui';
import type { MedicalService, Ticket } from '../../types/api';
import { tr } from '../../i18n';
import { TicketReceipt } from './TicketReceipt';

interface Props {
  ticket: Ticket;
  service: MedicalService | null;
  countdown: number;
  onClose: () => void;
  onExtend: () => void;
}

/** Paso 5: ticket emitido. Imprimir, cerrar, o pedir más tiempo antes del reinicio automático. */
export const TicketStep: React.FC<Props> = ({ ticket, service, countdown, onClose, onExtend }) => (
  <div className="w-full max-w-sm flex flex-col gap-4">
    <div className="flex items-center justify-center gap-2 text-health-700 font-semibold text-sm">
      <CheckCircle2 className="w-5 h-5 text-health-500" />
      {tr('kiosk.ticket_issued')}
    </div>

    <TicketReceipt ticket={ticket} service={service} countdown={countdown} />

    <div className="flex gap-3">
      <Button variant="secondary" size="xl" fullWidth icon={<Printer className="w-5 h-5" />} onClick={() => window.print()}>
        {tr('kiosk.print_ticket')}
      </Button>
      <Button variant="primary" size="xl" fullWidth onClick={onClose}>
        {tr('kiosk.close')} ({countdown}s)
      </Button>
    </div>

    <button
      onClick={onExtend}
      style={{ minHeight: 48 }}
      className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-surface-500 hover:text-surface-800 bg-white border border-surface-200 hover:bg-surface-50 rounded-xl2 transition-all"
    >
      <Volume2 className="w-4 h-4" />
      {tr('kiosk.need_more_time')}
    </button>
  </div>
);
