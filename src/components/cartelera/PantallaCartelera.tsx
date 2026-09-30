import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ticketsApi, medicalServicesApi, consultingRoomsApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { soundService } from '../../services/audio';
import { Activity, Volume2, VolumeX, Wifi, WifiOff, MapPin, X, Clock } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalledTicket {
  id: string;
  ticketCode: string;
  serviceName: string;
  roomName: string;
  location?: string;
  calledAt: string;
}

interface WaitingTicket {
  id: string;
  ticketCode: string;
  serviceName: string;
  priorityLevel: string;
  priorityPoints: number;
  issuedAt: string;
}

export interface PantallaCarteleraProps {
  onExitCartelera: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TICKER_MSG =
  (import.meta as any).env?.VITE_TICKER_MSG ??
  'Hospital Nacional · Sistema de Gestión de Colas · Atiéndase con su número de turno · Conserve su ticket y permanezca atento a la pantalla';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mapEvent = (
  payload: any,
  serviceMap: Map<string, string>,
  roomMap: Map<string, string>,
): CalledTicket => ({
  id:          payload.ticketId ?? payload.id ?? String(Date.now()),
  ticketCode:  payload.ticketCode  ?? payload.ticket_codigo  ?? '—',
  serviceName: payload.serviceName ?? payload.medicalServiceName ?? payload.medicalServiceCode
               ?? payload.servicio_nombre
               ?? serviceMap.get(payload.medicalServiceId) ?? payload.medicalServiceId ?? '—',
  roomName:    payload.roomName ?? payload.consultingRoomName ?? payload.consultingRoomCode
               ?? payload.modulo_nombre
               ?? roomMap.get(payload.consultingRoomId) ?? payload.consultingRoomId ?? '—',
  location:    payload.location    ?? payload.ubicacion,
  calledAt:    payload.calledAt    ?? payload.timestamp_llamado ?? new Date().toISOString(),
});

const getZoneFilter = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('zone');
  } catch {
    return null;
  }
};

const matchesZone = (ticket: CalledTicket, zone: string | null): boolean => {
  if (!zone) return true;
  const z = zone.toLowerCase();
  return (
    ticket.roomName?.toLowerCase().includes(z) ||
    ticket.serviceName?.toLowerCase().includes(z) ||
    ticket.location?.toLowerCase().includes(z) ||
    false
  );
};

const getSpanishDate = (): string => {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const mapWaiting = (t: any, serviceMap: Map<string, string>): WaitingTicket => ({
  id:             t.id ?? t.ticketId ?? String(Date.now()),
  ticketCode:     t.ticketCode ?? '—',
  serviceName:    t.serviceName ?? serviceMap.get(t.medicalServiceId) ?? t.medicalServiceId ?? '—',
  priorityLevel:  t.priorityLevel ?? 'NORMAL',
  priorityPoints: t.priorityPoints ?? 0,
  issuedAt:       t.issuedAt ?? t.timestamp ?? new Date().toISOString(),
});

const PRIORITY_COLOR: Record<string, string> = {
  URGENT:       'text-rose-400   border-rose-500/40   bg-rose-950/40',
  PREFERENTIAL: 'text-amber-400  border-amber-500/40  bg-amber-950/40',
  NORMAL:       'text-slate-400  border-slate-700/40  bg-slate-900/40',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PantallaCartelera: React.FC<PantallaCarteleraProps> = ({ onExitCartelera }) => {
  const [current, setCurrent]         = useState<CalledTicket | null>(null);
  const [history, setHistory]         = useState<CalledTicket[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<WaitingTicket[]>([]);
  const [audioEnabled, setAudio]      = useState(false);
  const [timeStr, setTimeStr]         = useState('');
  const [dateStr, setDateStr]         = useState('');
  const [flash, setFlash]             = useState(false);
  const [sseConnected, setSseConnected] = useState(true);
  // Key increments each time a new ticket arrives so AnimatePresence remounts
  const [ticketKey, setTicketKey]     = useState(0);

  const serviceMapRef = useRef(new Map<string, string>());
  const roomMapRef    = useRef(new Map<string, string>());
  const zoneFilter    = useRef(getZoneFilter()).current;

  // Clock
  useEffect(() => {
    const tick = () => {
      setTimeStr(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(getSpanishDate());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Initial data load
  useEffect(() => {
    const load = async () => {
      try {
        const svcs = await medicalServicesApi.list() as any[];
        svcs.forEach(s => serviceMapRef.current.set(s.id, s.name ?? s.serviceName ?? s.code));
      } catch { /* ok */ }

      try {
        const rooms = await consultingRoomsApi.list() as any[];
        rooms.forEach(r => roomMapRef.current.set(r.id, r.name ?? r.roomName ?? r.code));
      } catch { /* ok */ }

      try {
        const data = await ticketsApi.lastCalled(6) as any[];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data
            .map(t => mapEvent(t, serviceMapRef.current, roomMapRef.current))
            .filter(t => matchesZone(t, zoneFilter));
          if (mapped.length > 0) {
            setCurrent(mapped[0]);
            setHistory(mapped.slice(1, 6));
          }
        }
      } catch { /* ok */ }

      try {
        const waiting = await ticketsApi.waitingQueue(20) as any[];
        if (Array.isArray(waiting)) {
          setWaitingQueue(waiting.map(t => mapWaiting(t, serviceMapRef.current)));
        }
      } catch { /* ok */ }
    };
    load();
  }, []);

  // SSE
  useEffect(() => {
    const es = getSocket('pantalla');

    const handleTicket = (payload: any) => {
      const ticket = mapEvent(payload, serviceMapRef.current, roomMapRef.current);
      if (!matchesZone(ticket, zoneFilter)) return;

      setCurrent(ticket);
      setTicketKey(k => k + 1);
      setFlash(true);
      setTimeout(() => setFlash(false), 1800);

      setHistory(prev => [ticket, ...prev.filter(x => x.id !== ticket.id)].slice(0, 5));

      if (audioEnabled) {
        const announcement =
          payload.audioAnnouncement ??
          `Turno ${ticket.ticketCode}, diríjase a ${ticket.roomName}`;
        soundService.speakAnnouncement(announcement);
      }
    };

    const handleCompleted = (payload: any) => {
      const completedId = payload?.ticketId ?? payload?.id;
      if (!completedId) return;
      setCurrent(prev => {
        if (prev?.id === completedId) return null;
        return prev;
      });
      setHistory(prev => prev.filter(x => x.id !== completedId));
      setWaitingQueue(prev => prev.filter(x => x.id !== completedId));
    };

    const handleDispensed = (payload: any) => {
      const wt = mapWaiting(payload, serviceMapRef.current);
      setWaitingQueue(prev => {
        if (prev.some(x => x.id === wt.id)) return prev;
        const next = [wt, ...prev];
        next.sort((a, b) => b.priorityPoints - a.priorityPoints || a.issuedAt.localeCompare(b.issuedAt));
        return next.slice(0, 20);
      });
    };

    const handleCalledFromQueue = (payload: any) => {
      const calledId = payload?.ticketId ?? payload?.id;
      if (!calledId) return;
      setWaitingQueue(prev => prev.filter(x => x.id !== calledId));
    };

    const handleConnection = (data: unknown) => {
      setSseConnected((data as { connected: boolean }).connected);
    };

    es.on('TICKET_DISPENSED',    handleDispensed);
    es.on('TICKET_CALLED',        handleTicket);
    es.on('TICKET_CALLED',        handleCalledFromQueue);
    es.on('TICKET_RECALLED',      handleTicket);
    es.on('ATTENTION_COMPLETED',  handleCompleted);
    es.on('connection_status',    handleConnection);

    return () => {
      es.off('TICKET_DISPENSED',   handleDispensed);
      es.off('TICKET_CALLED',        handleTicket);
      es.off('TICKET_CALLED',        handleCalledFromQueue);
      es.off('TICKET_RECALLED',      handleTicket);
      es.off('ATTENTION_COMPLETED',  handleCompleted);
      es.off('connection_status',    handleConnection);
    };
  }, [audioEnabled, zoneFilter]);

  const toggleAudio = () => {
    setAudio(prev => {
      const next = !prev;
      if (next) soundService.playHospitalChime();
      return next;
    });
  };

  // Capitalise first letter of Spanish date
  const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div className="h-screen w-screen bg-[#070D1A] text-white flex flex-col overflow-hidden select-none font-sans">

      {/* Disconnection banner */}
      {!sseConnected && (
        <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-amber-500/95 text-amber-950 text-sm font-black py-2 px-4">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Sistema sin conexión en tiempo real — reconectando...</span>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bg-[#0A1628]/90 border-b border-sky-500/20 px-8 py-4 flex items-center justify-between shrink-0 shadow-2xl">

        {/* Left: logo + name */}
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-sky-600 to-cyan-400 p-3 rounded-2xl shadow-lg shadow-cyan-500/30">
            <Activity className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-widest text-sky-100 uppercase">
              Hospital Nacional
            </h1>
            <p className="text-xs font-bold text-sky-500 uppercase tracking-widest flex items-center gap-2">
              Sala de Espera — Llamado a Consultorios
              {zoneFilter && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono lowercase">
                  zona: {zoneFilter}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center: date + time */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm text-sky-300 font-semibold tracking-wide">{dateCap}</span>
          <span className="text-4xl font-mono font-black tracking-widest text-white tabular-nums">
            {timeStr}
          </span>
        </div>

        {/* Right: SSE indicator + audio toggle + exit */}
        <div className="flex items-center gap-3">
          {/* SSE status */}
          <div className="flex items-center gap-2 bg-[#0E1C34] border border-slate-700/60 rounded-xl px-4 py-2">
            {sseConnected ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-emerald-400 tracking-widest">EN VIVO</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <WifiOff className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-black text-rose-400 tracking-widest">OFFLINE</span>
              </>
            )}
          </div>

          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
              audioEnabled
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 hover:bg-sky-500/30'
                : 'bg-slate-800/60 border-slate-600 text-slate-400 hover:border-slate-500'
            }`}
            title={audioEnabled ? 'Silenciar audio' : 'Activar audio'}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span>{audioEnabled ? 'Sonido ON' : 'Sonido OFF'}</span>
          </button>

          {/* Exit */}
          <button
            onClick={onExitCartelera}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            title="Salir de Cartelera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">

        {/* LEFT — Current ticket (70%) */}
        <div className="w-[70%] flex flex-col items-center justify-center p-8 border-r border-slate-800/60">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={ticketKey}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-2xl flex flex-col gap-6"
              >
                {/* Flash overlay on new ticket */}
                <motion.div
                  animate={flash ? { backgroundColor: ['#1e40af40', '#07297040', '#00000000'] } : {}}
                  transition={{ duration: 1.8, ease: 'easeOut' }}
                  className="rounded-3xl border border-sky-500/20 bg-[#0A1628]/80 p-10 flex flex-col items-center gap-6 shadow-2xl"
                >
                  {/* Service badge */}
                  <span className="text-sm font-mono uppercase tracking-widest bg-sky-500/20 text-sky-300 px-6 py-2 rounded-full border border-sky-400/30">
                    {current.serviceName}
                  </span>

                  {/* TICKET CODE — hero element */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-base font-bold text-slate-400 uppercase tracking-[0.3em]">
                      TURNO
                    </span>
                    <motion.div
                      animate={
                        flash
                          ? { scale: [0.85, 1.08, 1.0], color: ['#38bdf8', '#e0f2fe', '#38bdf8'] }
                          : { scale: 1, color: '#38bdf8' }
                      }
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="font-mono font-black leading-none drop-shadow-[0_0_30px_rgba(56,189,248,0.4)]"
                      style={{ fontSize: '6rem' }}
                    >
                      {current.ticketCode}
                    </motion.div>
                  </div>

                  {/* "Pasar al Consultorio" strip */}
                  <div className="w-full bg-sky-950/50 border-2 border-sky-500/40 rounded-2xl p-5 flex items-center gap-5">
                    <div className="p-3 bg-sky-500 text-slate-950 rounded-xl shrink-0">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-0.5">
                        PASAR AL CONSULTORIO
                      </p>
                      <p
                        className="font-black text-primary-400 text-sky-300 leading-none"
                        style={{ fontSize: '4rem' }}
                      >
                        {current.roomName}
                      </p>
                    </div>
                    {current.location && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500">Ubicación</p>
                        <p className="text-lg font-bold text-sky-200">{current.location}</p>
                      </div>
                    )}
                  </div>

                  {/* Called-at timestamp */}
                  <p className="text-sm font-mono text-slate-500">
                    Llamado: {current.calledAt?.substring(11, 19) || timeStr}
                  </p>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 text-slate-600"
              >
                <Activity className="w-24 h-24 opacity-30 animate-pulse" />
                <p className="text-3xl font-bold">Esperando próximos llamados...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT — Waiting queue panel (30%) */}
        <div className="w-[30%] flex flex-col p-6 gap-4 overflow-hidden bg-[#080F1F]/60">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <h2 className="text-base font-black uppercase tracking-widest text-slate-300">
                En Espera
              </h2>
            </div>
            <span className="text-xs font-mono text-sky-500 font-bold bg-sky-950/50 border border-sky-800/40 rounded-lg px-2 py-0.5">
              {waitingQueue.length} turno{waitingQueue.length !== 1 ? 's' : ''}
            </span>
          </div>

          <ul className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 scrollbar-hide">
            <AnimatePresence initial={false}>
              {waitingQueue.length === 0 ? (
                <motion.li
                  key="empty-queue"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-2 py-10 text-slate-600"
                >
                  <Clock className="w-10 h-10 opacity-30" />
                  <span className="text-sm font-semibold">Sin turnos en espera</span>
                </motion.li>
              ) : (
                waitingQueue.map((wt, i) => {
                  const colorCls = PRIORITY_COLOR[wt.priorityLevel] ?? PRIORITY_COLOR['NORMAL'];
                  return (
                    <motion.li
                      key={wt.id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: 'easeOut' }}
                      className={`border rounded-xl p-3 flex items-center justify-between ${colorCls}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-600 w-4 text-right shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono font-black text-xl tracking-wider leading-none">
                            {wt.ticketCode}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[110px]">
                            {wt.serviceName}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col gap-0.5 shrink-0">
                        {wt.priorityLevel !== 'NORMAL' && (
                          <span className="text-[9px] font-bold uppercase tracking-widest">
                            {wt.priorityLevel === 'URGENT' ? 'URGENTE' : 'PREFER.'}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-600">
                          {wt.issuedAt?.substring(11, 16)}
                        </span>
                      </div>
                    </motion.li>
                  );
                })
              )}
            </AnimatePresence>
          </ul>

          {/* Bottom reminder */}
          <div className="shrink-0 p-4 rounded-2xl bg-sky-950/40 border border-sky-800/30 text-xs text-sky-300 text-center leading-relaxed">
            Al escuchar su número, acérquese con su DNI en mano al consultorio indicado.
          </div>
        </div>
      </main>

      {/* ── FOOTER TICKER ──────────────────────────────────────────────── */}
      <footer className="bg-sky-700 text-white py-3 px-4 overflow-hidden flex items-center gap-4 shrink-0 shadow-2xl">
        <span className="bg-sky-900 font-black text-xs uppercase tracking-widest px-3 py-1 rounded-lg whitespace-nowrap shadow">
          AVISO
        </span>
        <div className="overflow-hidden flex-1 relative">
          <p className="inline-block text-base font-bold whitespace-nowrap animate-ticker">
            {TICKER_MSG}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{TICKER_MSG}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PantallaCartelera;
