import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Bell, Play, CheckCircle2, Clock,
  Stethoscope, RefreshCw, UserX, ArrowRightLeft, WifiOff, PhoneCall,
} from 'lucide-react';
import {
  Button, Card, CardHeader, Select,
  StatusBadge, PriorityBadge, PageLoader, ConnectionDot, Modal,
} from '../ui';
import { consultingRoomsApi, medicalServicesApi, ticketsApi } from '../../services/api';
import { getSocket } from '../../services/socket';

const minutesWaiting = (issuedAt: string): string => {
  const diff = Math.round((Date.now() - new Date(issuedAt).getTime()) / 60000);
  return diff < 1 ? '< 1 min' : `${diff} min`;
};

const PRIORITY_BADGE: Record<string, string> = {
  URGENT:       'bg-red-100 text-red-700',
  PREFERENTIAL: 'bg-amber-100 text-amber-800',
  NORMAL:       'bg-primary-100 text-primary-700',
};

export const ModuloOperador: React.FC = () => {
  const [rooms, setRooms]               = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [services, setServices]         = useState<any[]>([]);
  const [currentTicket, setCurrentTicket] = useState<any | null>(null);
  const [waitingQueue, setWaitingQueue] = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [initLoading, setInitLoading]   = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeriveModal, setShowDeriveModal]     = useState(false);
  const [deriveServiceId, setDeriveServiceId]     = useState('');
  const [sseConnected, setSseConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async (serviceId: string) => {
    try {
      const data = await ticketsApi.activeQueue(serviceId) as any;
      setWaitingQueue(Array.isArray(data) ? data : []);
    } catch { /* empty queue ok */ }
  }, []);

  const loadCurrentTicket = useCallback(async (roomId: string) => {
    try {
      const ticket = await ticketsApi.currentRoom(roomId) as any;
      if (ticket?.id) setCurrentTicket(ticket);
    } catch { /* no active ticket for this room */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [roomData, svcData] = await Promise.all([
          consultingRoomsApi.list() as Promise<any[]>,
          medicalServicesApi.list() as Promise<any[]>,
        ]);
        setRooms(roomData);
        setServices(svcData);
        if (roomData.length > 0) {
          setSelectedRoom(roomData[0]);
          if (roomData[0].medicalServiceId) loadQueue(roomData[0].medicalServiceId);
          loadCurrentTicket(roomData[0].id);
        }
      } catch (e) { console.error(e); }
      finally { setInitLoading(false); }
    };
    init();
  }, [loadQueue]);

  useEffect(() => {
    const es = getSocket('operador');
    const reloadQueue = () => {
      if (selectedRoom?.medicalServiceId) loadQueue(selectedRoom.medicalServiceId);
    };
    es.on('TICKET_DISPENSED',    reloadQueue);
    es.on('TICKET_CALLED',       reloadQueue);
    es.on('TICKET_RECALLED',     reloadQueue);
    es.on('PRIORITY_UPDATED',    reloadQueue);
    es.on('ATTENTION_COMPLETED', reloadQueue);
    const onConn = (data: any) => setSseConnected(data.connected);
    es.on('connection_status', onConn);
    return () => {
      es.off('TICKET_DISPENSED',    reloadQueue);
      es.off('TICKET_CALLED',       reloadQueue);
      es.off('TICKET_RECALLED',     reloadQueue);
      es.off('PRIORITY_UPDATED',    reloadQueue);
      es.off('ATTENTION_COMPLETED', reloadQueue);
      es.off('connection_status', onConn);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.medicalServiceId, loadQueue]);

  const serviceName = (id: string) => services.find(s => s.id === id)?.name ?? 'Servicio';

  const handleSelectRoom = (room: any) => {
    setSelectedRoom(room);
    setCurrentTicket(null);
    setError(null);
    if (room.medicalServiceId) loadQueue(room.medicalServiceId);
    loadCurrentTicket(room.id);
  };

  const handleCallNext = async () => {
    if (!selectedRoom?.medicalServiceId) {
      setError('Este consultorio no tiene un servicio médico asignado.');
      return;
    }
    const operatorId = localStorage.getItem('userId');
    if (!operatorId) {
      setError('No se encontró usuario en sesión. Vuelva a iniciar sesión.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ticket = await ticketsApi.callNext({
        medicalServiceId: selectedRoom.medicalServiceId,
        consultingRoomId: selectedRoom.id,
        operatorId,
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
    try { await ticketsApi.recall(currentTicket.id); }
    catch (e: any) { setError(`Error al rellamar: ${e.message}`); }
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
      setShowCompleteModal(false);
      setCurrentTicket(null);
      if (selectedRoom?.medicalServiceId) loadQueue(selectedRoom.medicalServiceId);
    } catch (e: any) { setError(`Error: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleMarkAbsent = async () => {
    if (!currentTicket) return;
    setLoading(true);
    try {
      await ticketsApi.markAbsent(currentTicket.id);
      setCurrentTicket(null);
      if (selectedRoom?.medicalServiceId) loadQueue(selectedRoom.medicalServiceId);
    } catch (e: any) { setError(`Error: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleDeriveTicket = async () => {
    if (!currentTicket || !deriveServiceId) return;
    setLoading(true);
    try {
      await ticketsApi.deriveTicket(currentTicket.id, deriveServiceId);
      setShowDeriveModal(false);
      setDeriveServiceId('');
      setCurrentTicket(null);
      if (selectedRoom?.medicalServiceId) loadQueue(selectedRoom.medicalServiceId);
    } catch (e: any) { setError(`Error al derivar: ${e.message}`); }
    finally { setLoading(false); }
  };

  const isInAttention = currentTicket?.status === 'IN_ATTENTION';

  if (initLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-surface-50 p-5 flex flex-col gap-4">

      {/* SSE offline banner */}
      <AnimatePresence>
        {!sseConnected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium"
          >
            <WifiOff size={15} className="shrink-0" />
            <span>Sin conexión en tiempo real — reconectando... La cola puede no estar actualizada.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600 text-lg leading-none font-bold">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-card px-5 py-3 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
            <Stethoscope size={18} className="text-primary-700" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-surface-900">Estación del Profesional</h1>
            <p className="text-xs text-surface-500">Gestión de consultorio y turnos</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <ConnectionDot connected={sseConnected} />
            <span className="text-xs text-surface-500">{sseConnected ? 'En vivo' : 'Reconectando'}</span>
          </div>

          <Select
            value={selectedRoom?.id ?? ''}
            onChange={val => {
              const r = rooms.find(x => x.id === val);
              if (r) handleSelectRoom(r);
            }}
            options={rooms.map(r => ({ value: r.id, label: `${r.name} — ${serviceName(r.medicalServiceId)}` }))}
          />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">

        {/* Left: current ticket */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card padding="lg" className="flex-1">
            <CardHeader
              title="Turno en Consultorio"
              subtitle={selectedRoom ? `${selectedRoom.name} · ${serviceName(selectedRoom.medicalServiceId)}` : ''}
              action={currentTicket && (
                <StatusBadge status={currentTicket.status === 'IN_ATTENTION' ? 'EN_ATENCION' : 'LLAMADO'} />
              )}
            />

            <AnimatePresence mode="wait">
              {currentTicket ? (
                <motion.div
                  key={currentTicket.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-5"
                >
                  {/* Ticket header */}
                  <div className="flex items-start justify-between gap-4 p-5 rounded-xl bg-primary-50 border border-primary-100">
                    <div>
                      <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-1">Código</p>
                      <div className="ticket-code text-5xl text-primary-900">
                        {currentTicket.ticketCode}
                      </div>
                      {currentTicket.patientName && (
                        <div className="flex items-center gap-1.5 mt-2 text-surface-700">
                          <User size={14} className="text-surface-400" />
                          <span className="text-sm font-medium">{currentTicket.patientName}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-surface-500 mb-1">Prioridad</p>
                      <PriorityBadge priority={currentTicket.priorityLevel === 'URGENT' ? 'URGENTE' : currentTicket.priorityLevel === 'PREFERENTIAL' ? 'PREFERENCIAL' : 'NORMAL'} size="md" />
                      <p className="text-xs text-surface-400 mt-1 font-mono">{currentTicket.priorityPoints} pts</p>
                    </div>
                  </div>

                  {/* Primary actions */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="secondary"
                      size="lg"
                      fullWidth
                      icon={<Bell size={16} />}
                      onClick={handleRecall}
                    >
                      Rellamar
                    </Button>
                    <Button
                      variant="success"
                      size="lg"
                      fullWidth
                      disabled={isInAttention}
                      icon={<Play size={16} />}
                      onClick={handleStartAttention}
                    >
                      Iniciar
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={!isInAttention}
                      icon={<CheckCircle2 size={16} />}
                      onClick={() => setShowCompleteModal(true)}
                    >
                      Finalizar
                    </Button>
                  </div>

                  {/* Secondary actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="ghost"
                      size="md"
                      fullWidth
                      loading={loading}
                      icon={<UserX size={15} />}
                      onClick={handleMarkAbsent}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Paciente Ausente
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      fullWidth
                      loading={loading}
                      icon={<ArrowRightLeft size={15} />}
                      onClick={() => { setDeriveServiceId(''); setShowDeriveModal(true); }}
                      className="text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                    >
                      Derivar a Servicio
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center">
                    <User size={28} className="text-surface-300" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-base font-semibold text-surface-700">Sin turno activo</h3>
                    <p className="text-sm text-surface-400 mt-1 max-w-xs">
                      Llame al siguiente paciente para comenzar la atención.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="xl"
                    loading={loading}
                    icon={<PhoneCall size={20} />}
                    onClick={handleCallNext}
                  >
                    Llamar Siguiente
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Right: queue */}
        <Card padding="none" className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-surface-400" />
              <span className="text-sm font-semibold text-surface-900">Cola de Espera</span>
              <span className="text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded-full font-semibold">
                {waitingQueue.length}
              </span>
            </div>
            <button
              onClick={() => selectedRoom?.medicalServiceId && loadQueue(selectedRoom.medicalServiceId)}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-surface-100">
            <AnimatePresence initial={false}>
              {waitingQueue.length === 0 ? (
                <p className="text-surface-400 text-center py-12 text-sm px-4">
                  No hay pacientes en espera para este servicio.
                </p>
              ) : (
                waitingQueue.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center justify-between px-5 py-3 hover:bg-surface-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-surface-100 flex items-center justify-center text-[10px] font-bold text-surface-500 shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="ticket-code text-base text-surface-900">{item.ticketCode}</p>
                        {item.patientName && (
                          <p className="text-xs text-surface-400 truncate max-w-[120px]">{item.patientName}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[item.priorityLevel] ?? 'bg-surface-100 text-surface-500'}`}>
                        {item.priorityPoints}p
                      </span>
                      {item.issuedAt && (
                        <p className="text-[10px] text-surface-400 mt-0.5 font-mono">{minutesWaiting(item.issuedAt)}</p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      {/* Modal: Finalizar Atención */}
      <Modal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Finalizar Atención"
        description={`Turno: ${currentTicket?.ticketCode ?? ''}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>Cancelar</Button>
            <Button variant="primary" loading={loading} onClick={handleCompleteAttention}>
              Confirmar y Cerrar
            </Button>
          </>
        }
      >
        <p className="text-sm text-surface-600">
          Al confirmar, el ticket pasa a estado <strong>Atendido</strong> y queda registrado en el sistema.
        </p>
      </Modal>

      {/* Modal: Derivar */}
      <Modal
        open={showDeriveModal}
        onClose={() => setShowDeriveModal(false)}
        title="Derivar Paciente"
        description={`Turno: ${currentTicket?.ticketCode ?? ''}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeriveModal(false)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={loading}
              disabled={!deriveServiceId}
              onClick={handleDeriveTicket}
            >
              Confirmar Derivación
            </Button>
          </>
        }
      >
        <Select
          label="Servicio de destino"
          fullWidth
          value={deriveServiceId}
          onChange={setDeriveServiceId}
          options={[
            { value: '', label: '— Seleccionar servicio —' },
            ...services
              .filter(s => s.id !== selectedRoom?.medicalServiceId)
              .map(s => ({ value: s.id, label: s.name })),
          ]}
        />
      </Modal>
    </div>
  );
};
