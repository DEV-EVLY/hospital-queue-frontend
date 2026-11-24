import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import type { MedicalService, Ticket } from '../../types/api';
import { tr } from '../../i18n';
import { priorityClasses, priorityText } from './ticketPriority';
import { COUNTDOWN_SECONDS } from './useTicketCountdown';

interface Props {
  ticket: Ticket;
  service: MedicalService | null;
  countdown: number;
}

/** Comprobante del turno (lo que se imprime): código, prioridad, servicio, código de barras y cuenta atrás. */
export const TicketReceipt: React.FC<Props> = ({ ticket, service, countdown }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!barcodeRef.current || !ticket.ticketCode) return;
    try {
      JsBarcode(barcodeRef.current, ticket.ticketCode, {
        format: 'CODE128', width: 2, height: 44, displayValue: false, background: '#ffffff', lineColor: '#1e293b', margin: 6,
      });
    } catch { /* valor no soportado: se deja vacío */ }
  }, [ticket.ticketCode]);

  return (
    <div id="ticket-print-area" className="w-full bg-white border-2 border-surface-200 rounded-xl2 shadow-card-lg overflow-hidden">
      <div className="bg-primary-700 px-6 py-3 text-center">
        <p className="text-xs font-bold text-primary-200 tracking-widest uppercase">{tr('kiosk.hospital_title')}</p>
        <p className="text-[10px] text-primary-300 tracking-wider">{tr('kiosk.comprobante_turno')}</p>
      </div>

      <div className="px-6 py-6 flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1">{tr('kiosk.your_ticket')}</p>
          <div className="ticket-code text-7xl text-primary-700 leading-none">{ticket.ticketCode}</div>
        </div>

        <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${priorityClasses(ticket.priorityLevel)}`}>
          {tr('kiosk.priority_prefix')} {priorityText(ticket.priorityLevel)}
        </span>

        <div className="w-full bg-surface-50 border border-surface-200 rounded-xl p-4 space-y-2 text-sm">
          {service && (
            <div className="flex justify-between">
              <span className="text-surface-500">{tr('kiosk.service_label')}</span>
              <span className="font-semibold text-surface-800">{service.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-surface-500">{tr('kiosk.priority_points')}</span>
            <span className="font-semibold text-primary-700">{ticket.priorityPoints} pts</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 w-full">
          <svg ref={barcodeRef} className="w-48 h-auto" />
          <span className="text-[9px] font-mono text-surface-400 tracking-wider">{ticket.id?.substring(0, 18)?.toUpperCase()}</span>
        </div>

        <div className="w-full border-t-2 border-dashed border-surface-200" />

        <div className="w-full">
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (countdown / COUNTDOWN_SECONDS) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-surface-400 text-center mt-1">{tr('kiosk.reinicio', { n: countdown })}</p>
        </div>
      </div>
    </div>
  );
};
