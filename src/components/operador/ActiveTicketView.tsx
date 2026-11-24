import React from 'react';
import { motion } from 'motion/react';
import { ArrowRightLeft, Bell, CheckCircle2, Play, UserX } from 'lucide-react';
import { Button, PriorityBadge } from '../ui';
import type { Ticket } from '../../types/api';
import { tr } from '../../i18n';

interface Props {
  ticket: Ticket;
  busy: boolean;
  onRecall: () => void;
  onStart: () => void;
  onFinish: () => void;
  onAbsent: () => void;
  onDerive: () => void;
}

/** Turno en curso: código, prioridad y acciones (rellamar, iniciar, finalizar, ausente, derivar). */
export const ActiveTicketView: React.FC<Props> = ({ ticket, busy, onRecall, onStart, onFinish, onAbsent, onDerive }) => {
  const inAttention = ticket.status === 'IN_ATTENTION';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-5"
    >
      <div className="flex items-start justify-between gap-4 p-5 rounded-xl bg-primary-50 border border-primary-100">
        <div>
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-1">{tr('common.codigo')}</p>
          <div className="ticket-code text-5xl text-primary-900">{ticket.ticketCode}</div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-surface-500 mb-1">{tr('common.prioridad')}</p>
          <PriorityBadge priority={ticket.priorityLevel} size="md" />
          <p className="text-xs text-surface-400 mt-1 font-mono">{ticket.priorityPoints} pts</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button variant="secondary" size="lg" fullWidth icon={<Bell size={16} />} onClick={onRecall}>
          {tr('operator.rellamar')}
        </Button>
        <Button variant="success" size="lg" fullWidth disabled={inAttention} icon={<Play size={16} />} onClick={onStart}>
          {tr('operator.iniciar')}
        </Button>
        <Button variant="primary" size="lg" fullWidth disabled={!inAttention} icon={<CheckCircle2 size={16} />} onClick={onFinish}>
          {tr('operator.finalizar')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="ghost" size="md" fullWidth loading={busy} icon={<UserX size={15} />} onClick={onAbsent}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          {tr('operator.paciente_ausente')}
        </Button>
        <Button
          variant="ghost" size="md" fullWidth loading={busy} icon={<ArrowRightLeft size={15} />} onClick={onDerive}
          className="text-purple-600 hover:bg-purple-50 hover:text-purple-700"
        >
          {tr('operator.derivar_a_servicio')}
        </Button>
      </div>
    </motion.div>
  );
};
