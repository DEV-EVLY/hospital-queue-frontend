import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, RefreshCw } from 'lucide-react';
import { Card } from '../ui';
import type { Ticket } from '../../types/api';
import { tr } from '../../i18n';
import { PRIORITY_BADGE, minutesWaiting } from './queueFormat';

const QueueRow: React.FC<{ ticket: Ticket; position: number }> = ({ ticket, position }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: (position - 1) * 0.04 }}
    className="flex items-center justify-between px-5 py-3 hover:bg-surface-50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <span className="w-6 h-6 rounded-full bg-surface-100 flex items-center justify-center text-[10px] font-bold text-surface-500 shrink-0">
        {position}
      </span>
      <p className="ticket-code text-base text-surface-900">{ticket.ticketCode}</p>
    </div>
    <div className="text-right shrink-0">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[ticket.priorityLevel] ?? 'bg-surface-100 text-surface-500'}`}>
        {ticket.priorityPoints}p
      </span>
      {ticket.issuedAt && (
        <p className="text-[10px] text-surface-400 mt-0.5 font-mono">{minutesWaiting(ticket.issuedAt)}</p>
      )}
    </div>
  </motion.div>
);

interface Props {
  queue: Ticket[];
  onRefresh: () => void;
}

/** Cola de espera del servicio del consultorio, por orden de atención. */
export const WaitingQueueCard: React.FC<Props> = ({ queue, onRefresh }) => (
  <Card padding="none" className="flex flex-col overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-surface-400" />
        <span className="text-sm font-semibold text-surface-900">{tr('operator.cola_espera')}</span>
        <span className="text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded-full font-semibold">{queue.length}</span>
      </div>
      <button
        onClick={onRefresh}
        className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
      >
        <RefreshCw size={14} />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto divide-y divide-surface-100">
      <AnimatePresence initial={false}>
        {queue.length === 0
          ? <p className="text-surface-400 text-center py-12 text-sm px-4">{tr('operator.no_hay_pacientes_espera_para')}</p>
          : queue.map((ticket, i) => <QueueRow key={ticket.id} ticket={ticket} position={i + 1} />)}
      </AnimatePresence>
    </div>
  </Card>
);
