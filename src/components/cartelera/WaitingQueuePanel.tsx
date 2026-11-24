import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock } from 'lucide-react';
import { tr, trp } from '../../i18n';
import type { WaitingTicket } from './types';
import { WaitingTicketRow } from './WaitingTicketRow';

const EmptyQueue: React.FC = () => (
  <motion.li
    key="empty-queue"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center justify-center gap-2 py-10 text-slate-600"
  >
    <Clock className="w-10 h-10 opacity-30" />
    <span className="text-sm font-semibold">{tr('cartelera.sin_turnos_espera')}</span>
  </motion.li>
);

/** Panel lateral (30 %): turnos en espera por orden de atención. */
export const WaitingQueuePanel: React.FC<{ queue: WaitingTicket[] }> = ({ queue }) => (
  <div className="w-[30%] flex flex-col p-6 gap-4 overflow-hidden bg-[#080F1F]/60">
    <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-sky-400" />
        <h2 className="text-base font-black uppercase tracking-widest text-slate-300">{tr('common.espera')}</h2>
      </div>
      <span className="text-xs font-mono text-sky-500 font-bold bg-sky-950/50 border border-sky-800/40 rounded-lg px-2 py-0.5">
        {trp('metricas.turnos_n', queue.length)}
      </span>
    </div>

    <ul className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 scrollbar-hide">
      <AnimatePresence initial={false}>
        {queue.length === 0
          ? <EmptyQueue key="empty-queue" />
          : queue.map((ticket, i) => <WaitingTicketRow key={ticket.id} ticket={ticket} position={i + 1} />)}
      </AnimatePresence>
    </ul>

    <div className="shrink-0 p-4 rounded-2xl bg-sky-950/40 border border-sky-800/30 text-xs text-sky-300 text-center leading-relaxed">
      {tr('cartelera.escuchar_su_numero_acerquese_con')}
    </div>
  </div>
);
