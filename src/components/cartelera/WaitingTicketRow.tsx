import React from 'react';
import { motion } from 'motion/react';
import type { PriorityLevel } from '../../types/api';
import { formatTime, priorityLabel } from '../../i18n';
import type { WaitingTicket } from './types';

const PRIORITY_COLOR: Record<PriorityLevel, string> = {
  URGENT:       'text-rose-400   border-rose-500/40   bg-rose-950/40',
  PREFERENTIAL: 'text-amber-400  border-amber-500/40  bg-amber-950/40',
  NORMAL:       'text-slate-400  border-slate-700/40  bg-slate-900/40',
};

interface Props {
  ticket: WaitingTicket;
  /** Posición en la cola (1 = el siguiente) */
  position: number;
}

/** Una fila de la lista de espera: posición, código, servicio, prioridad y hora de emisión. */
export const WaitingTicketRow: React.FC<Props> = ({ ticket, position }) => (
  <motion.li
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
    transition={{ duration: 0.3, delay: Math.min((position - 1) * 0.04, 0.3), ease: 'easeOut' }}
    className={`border rounded-xl p-3 flex items-center justify-between ${PRIORITY_COLOR[ticket.priorityLevel] ?? PRIORITY_COLOR.NORMAL}`}
  >
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-slate-600 w-4 text-right shrink-0">{position}</span>
      <div className="flex flex-col gap-0.5">
        <span className="font-mono font-black text-xl tracking-wider leading-none">{ticket.ticketCode}</span>
        <span className="text-[10px] text-slate-500 truncate max-w-[110px]">{ticket.serviceName}</span>
      </div>
    </div>
    <div className="text-right flex flex-col gap-0.5 shrink-0">
      {ticket.priorityLevel !== 'NORMAL' && (
        <span className="text-[9px] font-bold uppercase tracking-widest">{priorityLabel(ticket.priorityLevel)}</span>
      )}
      <span className="text-[10px] font-mono text-slate-600">{formatTime(ticket.issuedAt)}</span>
    </div>
  </motion.li>
);
