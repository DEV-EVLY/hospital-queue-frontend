import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Card, CardHeader, StatusBadge } from '../ui';
import type { ConsultingRoom, Ticket } from '../../types/api';
import { tr } from '../../i18n';
import { ActiveTicketView } from './ActiveTicketView';
import { NoActiveTicketView } from './NoActiveTicketView';

interface Props {
  room: ConsultingRoom | null;
  serviceName: (serviceId: string | null) => string;
  ticket: Ticket | null;
  busy: boolean;
  onCallNext: () => void;
  onRecall: () => void;
  onStart: () => void;
  onFinish: () => void;
  onAbsent: () => void;
  onDerive: () => void;
}

/** Tarjeta principal: el turno del consultorio (o el botón para llamar al siguiente). */
export const CurrentTicketCard: React.FC<Props> = ({ room, serviceName, ticket, busy, onCallNext, ...actions }) => (
  <Card padding="lg" className="flex-1">
    <CardHeader
      title={tr('operator.turno_consultorio')}
      subtitle={room ? `${room.name} · ${serviceName(room.medicalServiceId)}` : ''}
      action={ticket && <StatusBadge status={ticket.status} />}
    />
    {/* La `key` va en el hijo directo de AnimatePresence para que se animen la salida y la entrada de cada turno */}
    <AnimatePresence mode="wait">
      {ticket
        ? <ActiveTicketView key={ticket.id} ticket={ticket} busy={busy} {...actions} />
        : <NoActiveTicketView key="empty" busy={busy} onCallNext={onCallNext} />}
    </AnimatePresence>
  </Card>
);
