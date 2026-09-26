import React, { useState, useEffect, useCallback } from 'react';
import {
  consultingRoomsApi, medicalServicesApi, ticketsApi
} from '../../services/api';
import { getSocket } from '../../services/socket';
import {
  User, Bell, Play, CheckCircle, Clock,
  Stethoscope, RefreshCw, ShieldCheck, UserX, ArrowRightLeft, WifiOff
} from 'lucide-react';

// B-02: human-readable status labels
const STATUS_LABELS: Record<string, string> = {
  CALLED:       'Llamado',
  IN_ATTENTION: 'En Atención',
  WAITING:      'En Espera',
  ATTENDED:     'Atendido',
  NO_SHOW:      'No se Presentó',
  DERIVED:      'Derivado',
  CANCELLED:    'Cancelado',
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT:       'Urgente',
  PREFERENTIAL: 'Preferencial',
  NORMAL:       'Normal',
};

const priorityBadge = (level: string) => {
  if (level === 'URGENT')       return 'bg-rose-100 text-rose-700';
  if (level === 'PREFERENTIAL') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-200 text-slate-700';
};

// B-04: time elapsed since ticket was issued
const minutesWaiting = (issuedAt: string): string => {
  const diff = Math.round((Date.now() - new Date(issuedAt).getTime()) / 60000);
  return diff < 1 ? '<1 min' : `${diff} min`;
};

export const ModuloOperador: React.FC = () => {
  const [rooms, setRooms]               = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [services, setServices]         = useState<any[]>([]);
  const [currentTicket, setCurrentTicket] = useState<any | null>(null);
  const [waitingQueue, setWaitingQueue] = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [showModal, setShowModal]       = useState(false);
  // A-03: derive modal
  const [showDeriveModal, setShowDeriveModal] = useState(false);
  const [deriveServiceId, setDeriveServiceId] = useState('');
  // C-05: SSE connection state
  const [sseConnected, setSseConnected] = useState(true);
  // inline error (replaces alert)
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async (serviceId: string) => {
    try {
      const data = await ticketsApi.activeQueue(serviceId) as any;
      setWaitingQueue(Array.isArray(data) ? data : []);
    } catch { /* empty queue is fine */ }
  }, []);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await consultingRoomsApi.list() as any[];
        setRooms(data);
        if (data.length > 0) {
          setSelectedRoom(data[0]);
          if (data[0].medicalServiceId) loadQueue(data[0].medicalServiceId);
        }
      } catch (e) { console.error(e); }
    };
    const loadServices = async () => {
      try {
        const data = await medicalServicesApi.list() as any[];
        setServices(data);
      } catch (e) { console.error(e); }
    };

    loadRooms();
    loadServices();
  }, [loadQueue]);

  // A-07 + C-05: subscribe to all relevant SSE events
  useEffect(() => {
    const es = getSocket('operador');

    const reloadQueue = () => {
      if (selectedRoom?.medicalServiceId) loadQueue(selectedRoom.medicalServiceId);
    };

    // A-07: listen to all queue-changing events, not just ticket_created
    es.on('ticket_created', reloadQueue);
    es.on('ticket_called',  reloadQueue);
    es.on('queue_updated',  reloadQueue);

    // C-05: track connection state
    const onConnectionStatus = (data: { connected: boolean }) => {
      setSseConnected(data.connected);
    };
    es.on('connection_status', onConnectionStatus);

    return () => {
      es.off('ticket_created', reloadQueue);
      es.off('ticket_called',  reloadQueue);
      es.off('queue_updated',  reloadQueue);
      es.off('connection_status', onConnectionStatus);
    };
  }, [selectedRoom, loadQueue]);

  const serviceName = (id: string) =>
    services.find(s => s.id === id)?.name || 'Servicio';

  const handleSelectRoom = (room: any) => {
    setSelectedRoom(room);
    setCurrentTicket(null);
    setError(null);
    if (room.medicalServiceId) loadQueue(room.medicalServiceId);
  };

  const handleCallNext = async () => {
    if (!selectedRoom?.medicalServiceId) {
      setError('Este consultorio no tiene un servicio médico asignado.');
      return;
    }
    // C-06: block if no userId — never fall back to a phantom ID
    const operatorId = localStorage.getItem('userId');
    if (!operatorId) {
      setError('No se encontró usuario en sesión. Por favor vuelve a iniciar sesión.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ticket = await ticketsApi.callNext({
        medicalServiceId: selectedRoom.medicalServiceId,
        consultingRoomId: selectedRoom.id,
        operatorId
      }) as any;
      setCurrentTicket(ticket);
      loadQueue(selectedRoom.medicalServiceId);
    } catch (e: any) {
      setError(e.message || 'No hay más pacientes en espera');
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = async () => {
    if (!currentTicket) return;
    try {
      await ticketsApi.recall(currentTicket.id);
    } catch (e: any) { setError(`Error al rellamar: ${e.message}`); }
  };

  const handleStartAttention = async () => {
    if (!currentTicket) return;
    try {
      const updated = await ticketsApi.startAttention(currentTicket.id) as any;
      setCurrentTicket(updated);
    } catch (e: any) { setError(`Error: ${e.message}`); }
  };

  const handleCompleteAttention = async () => {
    if (!currentTicket) return;
    setLoading(true);
    try {
      await ticketsApi.completeAttention(currentTicket.id);
      setShowModal(false);
      setCurrentTicket(null);
      if (selectedRoom?.medicalServiceId) loadQueue(selectedRoom.medicalServiceId);
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // A-02: mark patient as absent / no-show
  const handleMarkAbsent = async () => {
    if (!currentTicket) return;
    setLoading(true);
    try {
      await ticketsApi.markAbsent(currentTicket.id);
      setCurrentTicket(null);
      if (selectedRoom?.medicalServiceId) loadQueue(selectedRoom.medicalServiceId);
    } catch (e: any) {
      setError(`Error al marcar ausente: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // A-03: derive ticket to another service
  const handleDeriveTicket = async () => {
    if (!currentTicket || !deriveServiceId) return;
    setLoading(true);
    try {
      await ticketsApi.deriveTicket(currentTicket.id, deriveServiceId);
      setShowDeriveModal(false);
      setDeriveServiceId('');
      setCurrentTicket(null);
      if (selectedRoom?.medicalServiceId) loadQueue(selectedRoom.medicalServiceId);
    } catch (e: any) {
      setError(`Error al derivar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isInAttention = currentTicket?.status === 'IN_ATTENTION';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6 flex flex-col font-sans">

      {/* C-05: SSE reconnecting banner */}
      {!sseConnected && (
        <div className="mb-4 flex items-center space-x-2 bg-amber-100 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm font-semibold">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Sin conexión en tiempo real — reconectando... La cola puede no estar actualizada.</span>
        </div>
      )}

      {/* Inline error banner */}
      {error && (
        <div className="mb-4 flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-sky-100 text-sky-700 rounded-xl">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Estación del Profesional Médico</h1>
            <p className="text-sm text-slate-500 font-medium">Gestión de Consultorio, Llamados y Cierre de Turnos</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm font-bold text-slate-600">Consultorio Activo:</span>
          <select
            value={selectedRoom?.id || ''}
            onChange={(e) => {
              const r = rooms.find(x => x.id === e.target.value);
              if (r) handleSelectRoom(r);
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
          >
            {rooms.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} — {serviceName(r.medicalServiceId)}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

        {/* Panel izquierdo: Turno activo */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">

            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                TURNO ACTUALMENTE EN CONSULTORIO
              </span>
              {currentTicket && (
                <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isInAttention ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-amber-100 text-amber-800'
                }`}>
                  {/* B-02: translated status */}
                  {STATUS_LABELS[currentTicket.status] ?? currentTicket.status}
                </span>
              )}
            </div>

            {currentTicket ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-sky-50 p-6 rounded-2xl border border-sky-100">
                  <div>
                    <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">Código de Ticket</span>
                    <div className="text-6xl font-black font-mono text-sky-900 mt-1">
                      {currentTicket.ticketCode}
                    </div>
                    {/* A-05: show patient name when available */}
                    {currentTicket.patientName && (
                      <div className="mt-2 flex items-center space-x-2 text-slate-700">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-base font-bold">{currentTicket.patientName}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Consultorio</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                      {selectedRoom?.name}
                    </div>
                    <span className={`inline-block mt-1 text-xs font-black px-3 py-0.5 rounded-full ${priorityBadge(currentTicket.priorityLevel)}`}>
                      {PRIORITY_LABELS[currentTicket.priorityLevel] ?? currentTicket.priorityLevel} · {currentTicket.priorityPoints} pts
                    </span>
                  </div>
                </div>

                {/* Action buttons — 2 rows: primary actions + secondary actions */}
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={handleRecall}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-amber-500/20 active:scale-95"
                  >
                    <Bell className="w-5 h-5" />
                    <span>Rellamar</span>
                  </button>

                  <button
                    onClick={handleStartAttention}
                    disabled={isInAttention}
                    className={`font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 ${
                      isInAttention
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <Play className="w-5 h-5" />
                    <span>Iniciar Atención</span>
                  </button>

                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-sky-600/20 active:scale-95"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Finalizar</span>
                  </button>
                </div>

                {/* A-02 + A-03: secondary actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleMarkAbsent}
                    disabled={loading}
                    className="bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-bold py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 text-sm border border-slate-300 hover:border-rose-300"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Paciente Ausente</span>
                  </button>

                  <button
                    onClick={() => { setDeriveServiceId(''); setShowDeriveModal(true); }}
                    disabled={loading}
                    className="bg-slate-200 hover:bg-violet-100 hover:text-violet-700 text-slate-600 font-bold py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 text-sm border border-slate-300 hover:border-violet-300"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Derivar a otro Servicio</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <User className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No hay paciente en atención</h3>
                <p className="text-slate-500 text-sm max-w-sm mb-6">
                  Presione el botón para extraer al siguiente paciente en cola con mayor prioridad.
                </p>
                <button
                  disabled={loading}
                  onClick={handleCallNext}
                  className="bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-black text-xl py-5 px-10 rounded-2xl shadow-xl shadow-sky-600/30 flex items-center space-x-3 active:scale-95 transition-all disabled:opacity-60"
                >
                  <Bell className="w-6 h-6 animate-bounce" />
                  <span>{loading ? 'Extrayendo...' : 'LLAMAR SIGUIENTE PACIENTE'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3 text-slate-600">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span><strong>Modo de Operación:</strong> 100% Autónomo con Fallback a HIS</span>
            </div>
            <span className={`text-xs font-mono px-3 py-1 rounded-full ${sseConnected ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
              {sseConnected ? 'SSE / Tiempo Real Activo' : '⚠ SSE Reconectando...'}
            </span>
          </div>
        </div>

        {/* Panel derecho: Cola de espera */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-lg flex items-center space-x-2">
              <Clock className="w-5 h-5 text-sky-600" />
              <span>En Espera ({waitingQueue.length})</span>
            </h3>
            <button
              onClick={() => selectedRoom?.medicalServiceId && loadQueue(selectedRoom.medicalServiceId)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[550px] pr-1">
            {waitingQueue.length === 0 ? (
              <p className="text-slate-400 text-center py-10 text-sm">
                No hay pacientes esperando en este servicio.
              </p>
            ) : (
              waitingQueue.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-slate-50 hover:bg-sky-50/50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center font-mono font-bold text-xs text-slate-700">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-mono font-black text-lg text-slate-900">
                        {item.ticketCode}
                      </div>
                      {/* A-05: patient name in queue */}
                      {item.patientName && (
                        <div className="text-xs text-slate-500">{item.patientName}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${priorityBadge(item.priorityLevel)}`}>
                      {item.priorityPoints} pts
                    </span>
                    {/* B-04: time waiting instead of raw issuedAt */}
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      {item.issuedAt ? minutesWaiting(item.issuedAt) : '—'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Finalizar Atención */}
      {showModal && currentTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Finalizar Atención Médica</h3>
            <p className="text-sm text-slate-500 mb-8">
              Turno: <strong className="font-mono text-sky-700">{currentTicket.ticketCode}</strong>
            </p>
            <p className="text-slate-600 text-sm mb-8">
              Al confirmar, el ticket pasa a estado <strong>ATENDIDO</strong> y queda registrado en el sistema.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button
                disabled={loading}
                onClick={handleCompleteAttention}
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-sky-600/30"
              >
                {loading ? 'Guardando...' : 'Confirmar y Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A-03: Modal: Derivar a otro servicio */}
      {showDeriveModal && currentTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Derivar Paciente</h3>
            <p className="text-sm text-slate-500 mb-6">
              Turno: <strong className="font-mono text-sky-700">{currentTicket.ticketCode}</strong>
            </p>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Servicio de Destino
            </label>
            <select
              value={deriveServiceId}
              onChange={e => setDeriveServiceId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 font-bold text-slate-800 mb-8 focus:ring-2 focus:ring-violet-500"
            >
              <option value="">— Seleccionar servicio —</option>
              {services
                .filter(s => s.id !== selectedRoom?.medicalServiceId)
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeriveModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button
                disabled={loading || !deriveServiceId}
                onClick={handleDeriveTicket}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-violet-600/30"
              >
                {loading ? 'Derivando...' : 'Confirmar Derivación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
