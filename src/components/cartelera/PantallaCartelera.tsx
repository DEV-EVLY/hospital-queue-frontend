import React, { useState, useEffect, useRef } from 'react';
import { ticketsApi, medicalServicesApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { soundService } from '../../services/audio';
import { Volume2, VolumeX, Clock, Activity, MapPin, WifiOff, X } from 'lucide-react';

interface CalledTicket {
  id: string;
  ticketCode: string;
  serviceName: string;
  roomName: string;
  location?: string;
  calledAt: string;
}

// B-06: ticker message from env var with fallback
const TICKER_MSG = (import.meta as any).env?.VITE_TICKER_MSG
  ?? 'Bienvenido al Hospital Nacional. Por favor, conserve su ticket y permanezca atento a las pantallas. La atención preferencial se otorga según la Ley 28683.';

const mapEvent = (payload: any, serviceMap: Map<string, string>): CalledTicket => ({
  id:          payload.id,
  ticketCode:  payload.ticketCode  ?? payload.ticket_codigo  ?? '—',
  serviceName: payload.serviceName ?? payload.servicio_nombre
               ?? serviceMap.get(payload.medicalServiceId)   ?? payload.medicalServiceId ?? '—',
  roomName:    payload.roomName    ?? payload.modulo_nombre   ?? payload.consultingRoomId ?? '—',
  location:    payload.location    ?? payload.ubicacion,
  calledAt:    payload.calledAt    ?? payload.timestamp_llamado ?? new Date().toISOString(),
});

interface Props {
  onExitCartelera?: () => void;
}

// A-01: read ?zone= from URL — matches ticket.roomName or ticket.serviceName (case-insensitive partial)
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

export const PantallaCartelera: React.FC<Props> = ({ onExitCartelera }) => {
  const [current, setCurrent]         = useState<CalledTicket | null>(null);
  const [history, setHistory]         = useState<CalledTicket[]>([]);
  const [audioEnabled, setAudio]      = useState(true);
  const [horaActual, setHora]         = useState('');
  const [isBlinking, setBlinking]     = useState(false);
  // C-07: track SSE connection state
  const [sseConnected, setSseConnected] = useState(true);
  const serviceMapRef                 = useRef(new Map<string, string>());
  // A-01: zone filter from URL param — stable for the lifetime of the page
  const zoneFilter                    = useRef(getZoneFilter()).current;

  useEffect(() => {
    const tick = () => {
      setHora(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const svcs = await medicalServicesApi.list() as any[];
        svcs.forEach(s => serviceMapRef.current.set(s.id, s.name));
      } catch { /* ok */ }

      try {
        const data = await ticketsApi.lastCalled(6) as any[];
        if (Array.isArray(data) && data.length > 0) {
          // A-01: filter by zone if set
          const mapped = data.map(t => mapEvent(t, serviceMapRef.current))
            .filter(t => matchesZone(t, zoneFilter));
          if (mapped.length > 0) {
            setCurrent(mapped[0]);
            setHistory(mapped.slice(1));
          }
        }
      } catch { /* ok */ }
    };
    loadInitial();
  }, []);

  useEffect(() => {
    const es = getSocket('pantalla');

    const handler = (payload: any) => {
      const ticket = mapEvent(payload, serviceMapRef.current);
      // A-01: ignore events that don't match the zone filter
      if (!matchesZone(ticket, zoneFilter)) return;
      setCurrent(ticket);
      setBlinking(true);
      setTimeout(() => setBlinking(false), 6000);
      if (audioEnabled) {
        const announcement = payload.audioAnnouncement ?? payload.audio_anuncio
          ?? `Turno ${ticket.ticketCode}, diríjase a ${ticket.roomName}`;
        soundService.speakAnnouncement(announcement);
      }
      setHistory(prev => [ticket, ...prev.filter(x => x.id !== ticket.id)].slice(0, 5));
    };

    // C-07: track connection for visual indicator
    const onConnectionStatus = (data: { connected: boolean }) => {
      setSseConnected(data.connected);
    };

    es.on('ticket_called', handler);
    es.on('connection_status', onConnectionStatus);

    return () => {
      es.off('ticket_called', handler);
      es.off('connection_status', onConnectionStatus);
    };
  }, [audioEnabled]);

  const toggleAudio = () => {
    setAudio(prev => {
      if (!prev) soundService.playHospitalChime();
      return !prev;
    });
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">

      {/* C-07: disconnection overlay banner */}
      {!sseConnected && (
        <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-center space-x-3 bg-amber-500/95 text-amber-950 text-sm font-black py-2 px-4">
          <WifiOff className="w-4 h-4" />
          <span>Sistema sin conexión en tiempo real — reconectando...</span>
        </div>
      )}

      <header className="bg-slate-900/90 border-b border-sky-500/30 px-10 py-5 flex justify-between items-center shadow-2xl">
        <div className="flex items-center space-x-6">
          <div className="bg-gradient-to-tr from-sky-600 to-cyan-400 p-4 rounded-2xl shadow-lg shadow-cyan-500/30 animate-pulse">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-widest text-sky-100">HOSPITAL NACIONAL DOCENTE</h1>
            <p className="text-sm font-bold text-sky-400 uppercase tracking-widest">
              SALA DE ESPERA GENERAL — LLAMADO A CONSULTORIOS
              {/* A-01: show zone filter badge if active */}
              {zoneFilter && (
                <span className="ml-3 bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg text-xs font-mono lowercase">
                  zona: {zoneFilter}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* M-07 (via App.tsx): exit button to go back to internal nav */}
          {onExitCartelera && (
            <button onClick={onExitCartelera}
              className="p-3 rounded-2xl border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white transition-all"
              title="Salir de Cartelera">
              <X className="w-5 h-5" />
            </button>
          )}
          <button onClick={toggleAudio}
            className={`p-3 rounded-2xl border transition-all flex items-center space-x-2 text-sm font-bold ${
              audioEnabled ? 'bg-sky-500/20 border-sky-400 text-sky-300' : 'bg-rose-500/20 border-rose-500 text-rose-400'
            }`}>
            {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            <span>{audioEnabled ? 'Sonido Activado' : 'Audio Silenciado'}</span>
          </button>
          <div className="bg-slate-900 border border-sky-500/30 px-6 py-2 rounded-2xl flex items-center space-x-3 text-sky-300">
            <Clock className="w-6 h-6 text-sky-400" />
            <span className="text-3xl font-mono font-black tracking-wider">{horaActual}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-8 p-8 overflow-hidden">

        {/* Panel principal (8 cols) */}
        <div className="col-span-8 flex flex-col justify-center items-center">
          {current ? (
            <div className={`w-full h-full rounded-3xl border-4 p-10 flex flex-col justify-between transition-all duration-500 shadow-2xl ${
              isBlinking
                ? 'bg-gradient-to-br from-sky-950 via-blue-900 to-slate-900 border-cyan-400 shadow-cyan-500/50 scale-[1.01]'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-700/80 shadow-black'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-mono uppercase tracking-widest bg-sky-500/20 text-sky-300 px-6 py-2 rounded-full border border-sky-400/30">
                  {current.serviceName}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Llamado: {current.calledAt?.substring(11, 19) || horaActual}
                </span>
              </div>

              <div className="text-center my-auto">
                <span className="text-lg font-bold text-slate-400 uppercase tracking-widest block mb-2">TURNO</span>
                <div className={`text-[120px] font-black font-mono tracking-wider transition-all leading-none ${
                  isBlinking
                    ? 'text-cyan-300 scale-105 drop-shadow-[0_10px_25px_rgba(6,182,212,0.6)]'
                    : 'text-sky-400 drop-shadow-[0_10px_20px_rgba(14,165,233,0.3)]'
                }`}>
                  {current.ticketCode}
                </div>
              </div>

              <div className="bg-slate-950/80 border-2 border-sky-500/40 rounded-3xl p-6 flex items-center justify-between shadow-inner">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-sky-500 text-slate-950 rounded-2xl">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">DIRÍJASE AL</span>
                    <div className="text-3xl font-black text-white">{current.roomName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Ubicación</span>
                  <div className="text-lg font-bold text-sky-200">{current.location || 'Pabellón Central'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600">
              <Activity className="w-20 h-20 mb-4 opacity-40 animate-pulse" />
              <h2 className="text-2xl font-bold">Esperando próximos llamados...</h2>
            </div>
          )}
        </div>

        {/* Historial (4 cols) */}
        <div className="col-span-4 bg-slate-900/60 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-lg font-black text-slate-300 uppercase tracking-widest pb-4 border-b border-slate-800 mb-4 flex items-center justify-between">
              <span>ÚLTIMOS LLAMADOS</span>
              <span className="text-xs text-sky-400 font-mono">EN ATENCIÓN</span>
            </h3>
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={h.id || i}
                  className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center hover:border-slate-700 transition-all">
                  <div>
                    <div className="font-mono font-black text-2xl text-sky-300 tracking-wider">{h.ticketCode}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{h.serviceName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{h.roomName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{h.calledAt?.substring(11, 16)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center p-4 bg-sky-950/40 rounded-2xl border border-sky-800/30 text-xs text-sky-300">
            Al escuchar el timbre y su código en pantalla, acérquese con su DNI en mano.
          </div>
        </div>
      </main>

      <footer className="bg-sky-600 text-white py-3 px-6 overflow-hidden flex items-center shadow-2xl">
        <span className="bg-sky-800 font-black text-xs uppercase tracking-widest px-3 py-1 rounded-lg mr-4 whitespace-nowrap shadow">
          COMUNICADO
        </span>
        <div className="whitespace-nowrap overflow-hidden flex-1">
          <p className="inline-block text-base font-bold animate-marquee">{TICKER_MSG}</p>
        </div>
      </footer>
    </div>
  );
};
