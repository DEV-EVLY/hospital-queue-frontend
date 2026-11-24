import { useCallback, useEffect, useState } from 'react';
import { consultingRoomsApi, medicalServicesApi, ticketsApi, getErrorMessage } from '../../services/api';
import { getSocket } from '../../services/socket';
import { getAllowedServiceIds } from '../../services/auth';
import type { ConsultingRoom, MedicalService, Ticket } from '../../types/api';
import { tr } from '../../i18n';

export interface OperatorStation {
  rooms: ConsultingRoom[];
  selectedRoom: ConsultingRoom | null;
  services: MedicalService[];
  currentTicket: Ticket | null;
  waitingQueue: Ticket[];
  /** Una acción (llamar, cerrar, derivar...) está en curso */
  busy: boolean;
  /** Carga inicial de consultorios y servicios */
  initializing: boolean;
  connected: boolean;
  error: string | null;
  /** Servicios que el usuario puede atender (null = sin restricción) */
  allowedServices: string[] | null;
  clearError: () => void;
  serviceName: (serviceId: string | null) => string;
  selectRoom: (roomId: string) => void;
  refreshQueue: () => void;
  callNext: () => Promise<void>;
  recall: () => Promise<void>;
  startAttention: () => Promise<void>;
  /** Devuelven true si la acción se completó (para que la pantalla cierre su modal). */
  completeAttention: () => Promise<boolean>;
  markAbsent: () => Promise<void>;
  deriveTo: (serviceId: string) => Promise<boolean>;
}

/**
 * Estación de trabajo del profesional: consultorio elegido, turno actual, cola y acciones.
 * La pantalla solo pinta; todo el estado y las llamadas al servidor viven aquí.
 */
export function useOperatorStation(): OperatorStation {
  const [rooms, setRooms]                 = useState<ConsultingRoom[]>([]);
  const [selectedRoom, setSelectedRoom]   = useState<ConsultingRoom | null>(null);
  const [services, setServices]           = useState<MedicalService[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [waitingQueue, setWaitingQueue]   = useState<Ticket[]>([]);
  const [busy, setBusy]                   = useState(false);
  const [initializing, setInitializing]   = useState(true);
  const [connected, setConnected]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  const loadQueue = useCallback(async (serviceId: string) => {
    try {
      const data = await ticketsApi.activeQueue(serviceId);
      setWaitingQueue(Array.isArray(data) ? data : []);
    } catch { /* cola vacía */ }
  }, []);

  const loadCurrentTicket = useCallback(async (roomId: string) => {
    try {
      const ticket = await ticketsApi.currentRoom(roomId);
      if (ticket) setCurrentTicket(ticket);
    } catch { /* el consultorio no tiene turno activo */ }
  }, []);

  const serviceId = selectedRoom?.medicalServiceId ?? null;
  const refreshQueue = useCallback(() => { if (serviceId) void loadQueue(serviceId); }, [serviceId, loadQueue]);

  // Carga inicial: solo los consultorios de los servicios de sus grupos (el servidor lo vuelve a comprobar en cada acción)
  useEffect(() => {
    const init = async () => {
      try {
        const [allRooms, svcData] = await Promise.all([consultingRoomsApi.list(), medicalServicesApi.list()]);
        const allowed = getAllowedServiceIds();
        const roomData = allRooms.filter(
          r => allowed === null || (r.medicalServiceId !== null && allowed.includes(r.medicalServiceId)));
        setRooms(roomData);
        setServices(svcData);
        if (roomData.length > 0) {
          setSelectedRoom(roomData[0]);
          if (roomData[0].medicalServiceId) void loadQueue(roomData[0].medicalServiceId);
          void loadCurrentTicket(roomData[0].id);
        }
      } catch (e) { console.error(e); }
      finally { setInitializing(false); }
    };
    void init();
  }, [loadQueue, loadCurrentTicket]);

  // Tiempo real: cualquier cambio en la cola la recarga; tras una caída el servidor no reenvía lo perdido
  useEffect(() => {
    const es = getSocket('operador');
    const reload = () => refreshQueue();
    const onConnection = (data: { connected: boolean; recovered?: boolean }) => {
      setConnected(data.connected);
      if (data.connected && data.recovered) refreshQueue();
    };
    es.on('TICKET_DISPENSED', reload);
    es.on('TICKET_CALLED', reload);
    es.on('TICKET_RECALLED', reload);
    es.on('PRIORITY_UPDATED', reload);
    es.on('ATTENTION_COMPLETED', reload);
    es.on('connection_status', onConnection);
    return () => {
      es.off('TICKET_DISPENSED', reload);
      es.off('TICKET_CALLED', reload);
      es.off('TICKET_RECALLED', reload);
      es.off('PRIORITY_UPDATED', reload);
      es.off('ATTENTION_COMPLETED', reload);
      es.off('connection_status', onConnection);
    };
  }, [refreshQueue]);

  const serviceName = useCallback(
    (id: string | null) => services.find(s => s.id === id)?.name ?? tr('common.servicio'),
    [services],
  );

  const selectRoom = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    setSelectedRoom(room);
    setCurrentTicket(null);
    setError(null);
    if (room.medicalServiceId) void loadQueue(room.medicalServiceId);
    void loadCurrentTicket(room.id);
  }, [rooms, loadQueue, loadCurrentTicket]);

  /** Ejecuta una acción mostrando `busy` y traduciendo el error; devuelve true si salió bien. */
  const run = async (action: () => Promise<void>, errorKey: 'common.error_error' | 'operator.error_derivar_error' | 'operator.error_rellamar_error',
                     { showBusy = true }: { showBusy?: boolean } = {}): Promise<boolean> => {
    if (showBusy) setBusy(true);
    try {
      await action();
      return true;
    } catch (e: unknown) {
      setError(tr(errorKey, { error: getErrorMessage(e) }));
      return false;
    } finally {
      if (showBusy) setBusy(false);
    }
  };

  /** Termina un turno: sin turno actual y cola recargada. */
  const releaseTicket = () => { setCurrentTicket(null); refreshQueue(); };

  const callNext = async () => {
    if (!selectedRoom?.medicalServiceId) { setError(tr('operator.este_consultorio_no_tiene_servicio')); return; }
    const operatorId = localStorage.getItem('userId');
    if (!operatorId) { setError(tr('operator.no_se_encontro_usuario_sesion')); return; }
    setBusy(true);
    setError(null);
    try {
      const ticket = await ticketsApi.callNext({
        medicalServiceId: selectedRoom.medicalServiceId, consultingRoomId: selectedRoom.id, operatorId,
      });
      setCurrentTicket(ticket);
      void loadQueue(selectedRoom.medicalServiceId);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || tr('operator.no_hay_mas_pacientes'));
    } finally {
      setBusy(false);
    }
  };

  const recall = async () => {
    if (!currentTicket) return;
    await run(async () => { await ticketsApi.recall(currentTicket.id); }, 'operator.error_rellamar_error', { showBusy: false });
  };

  const startAttention = async () => {
    if (!currentTicket) return;
    await run(async () => { setCurrentTicket(await ticketsApi.startAttention(currentTicket.id)); },
      'common.error_error', { showBusy: false });
  };

  const completeAttention = async (): Promise<boolean> => {
    if (!currentTicket) return false;
    return run(async () => { await ticketsApi.completeAttention(currentTicket.id); releaseTicket(); }, 'common.error_error');
  };

  const markAbsent = async () => {
    if (!currentTicket) return;
    await run(async () => { await ticketsApi.markAbsent(currentTicket.id); releaseTicket(); }, 'common.error_error');
  };

  const deriveTo = async (targetServiceId: string): Promise<boolean> => {
    if (!currentTicket || !targetServiceId) return false;
    return run(async () => { await ticketsApi.deriveTicket(currentTicket.id, targetServiceId); releaseTicket(); },
      'operator.error_derivar_error');
  };

  return {
    rooms, selectedRoom, services, currentTicket, waitingQueue, busy, initializing, connected, error,
    allowedServices: getAllowedServiceIds(),
    clearError: () => setError(null),
    serviceName, selectRoom, refreshQueue, callNext, recall, startAttention, completeAttention, markAbsent, deriveTo,
  };
}
