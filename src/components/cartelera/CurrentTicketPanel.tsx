import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, MapPin } from 'lucide-react';
import { formatTime, tr } from '../../i18n';
import type { CalledTicket } from './types';

interface Props {
  current: CalledTicket | null;
  /** Cambia con cada llamado para que AnimatePresence vuelva a montar la tarjeta */
  ticketKey: number;
  flash: boolean;
}

const EmptyState: React.FC = () => (
  <motion.div
    key="empty"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center gap-4 text-slate-600"
  >
    <Activity className="w-24 h-24 opacity-30 animate-pulse" />
    <p className="text-3xl font-bold">{tr('cartelera.esperando_proximos_llamados')}</p>
  </motion.div>
);

/** Franja "Pasar al consultorio X" */
const RoomStrip: React.FC<{ ticket: CalledTicket }> = ({ ticket }) => (
  <div className="w-full bg-sky-950/50 border-2 border-sky-500/40 rounded-2xl p-5 flex items-center gap-5">
    <div className="p-3 bg-sky-500 text-slate-950 rounded-xl shrink-0">
      <MapPin className="w-7 h-7" />
    </div>
    <div className="flex-1">
      <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-0.5">{tr('cartelera.pasar_consultorio')}</p>
      <p className="font-black text-sky-300 leading-none" style={{ fontSize: '4rem' }}>{ticket.roomName}</p>
    </div>
    {ticket.location && (
      <div className="text-right shrink-0">
        <p className="text-xs text-slate-500">{tr('common.ubicacion')}</p>
        <p className="text-lg font-bold text-sky-200">{ticket.location}</p>
      </div>
    )}
  </div>
);

// La `key` (ticketKey) la pone quien lo usa, en el hijo directo de AnimatePresence, para que se animen salida y entrada
const TicketCard: React.FC<{ ticket: CalledTicket; flash: boolean }> = ({ ticket, flash }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.05 }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    className="w-full max-w-2xl flex flex-col gap-6"
  >
    <motion.div
      animate={flash ? { backgroundColor: ['#1e40af40', '#07297040', '#00000000'] } : {}}
      transition={{ duration: 1.8, ease: 'easeOut' }}
      className="rounded-3xl border border-sky-500/20 bg-[#0A1628]/80 p-10 flex flex-col items-center gap-6 shadow-2xl"
    >
      <span className="text-sm font-mono uppercase tracking-widest bg-sky-500/20 text-sky-300 px-6 py-2 rounded-full border border-sky-400/30">
        {ticket.serviceName}
      </span>

      <div className="flex flex-col items-center gap-2">
        <span className="text-base font-bold text-slate-400 uppercase tracking-[0.3em]">{tr('cartelera.turno')}</span>
        <motion.div
          animate={flash
            ? { scale: [0.85, 1.08, 1.0], color: ['#38bdf8', '#e0f2fe', '#38bdf8'] }
            : { scale: 1, color: '#38bdf8' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="font-mono font-black leading-none drop-shadow-[0_0_30px_rgba(56,189,248,0.4)]"
          style={{ fontSize: '6rem' }}
        >
          {ticket.ticketCode}
        </motion.div>
      </div>

      <RoomStrip ticket={ticket} />

      <p className="text-sm font-mono text-slate-500">
        {tr('cartelera.llamado', { time: formatTime(ticket.calledAt, true) })}
      </p>
    </motion.div>
  </motion.div>
);

/** Zona principal (70 %): el turno que se está llamando, o el mensaje de espera. */
export const CurrentTicketPanel: React.FC<Props> = ({ current, ticketKey, flash }) => (
  <div className="w-[70%] flex flex-col items-center justify-center p-8 border-r border-slate-800/60">
    <AnimatePresence mode="wait">
      {current
        ? <TicketCard key={ticketKey} ticket={current} flash={flash} />
        : <EmptyState key="empty" />}
    </AnimatePresence>
  </div>
);
