import { useEffect, useRef, useState } from 'react';
import { consultingRoomsApi, medicalServicesApi, ticketsApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import type { DeviceProfile } from '../../types/api';
import type {
  AttentionCompletedEvent, ConnectionStatusEvent, TicketCalledEvent, TicketDispensedEvent,
} from '../../types/events';
import {
  insertWaiting, matchesZone, serviceFilterKeyOf, toCalledTicket, toWaitingTicket,
} from './mappers';
import type { CalledTicket, ReconnectState, WaitingTicket } from './types';

const FLASH_MS = 1800;
const LAST_CALLED_LIMIT = 6;
const WAITING_LIMIT = 20;

interface Options {
  /** Perfil del equipo: limita los servicios que se muestran (null o sin servicios = todos). */
  profile: DeviceProfile | null;
  zoneFilter: string | null;
  /** Se invoca por cada llamado nuevo que se muestra (p. ej. para anunciarlo por voz). */
  onCalled: (ticket: CalledTicket) => void;
}

export interface CarteleraFeed {
  current: CalledTicket | null;
  waitingQueue: WaitingTicket[];
  /** true unos instantes tras un llamado nuevo (animación de destaque) */
  flash: boolean;
  /** Cambia con cada llamado nuevo para que la animación vuelva a montarse */
  ticketKey: number;
  connected: boolean;
  reconnect: ReconnectState | null;
}

/**
 * Datos de la cartelera: carga inicial, eventos en tiempo real y recuperación tras una caída de conexión.
 * El servidor no reenvía lo ocurrido durante una caída: al reconectar se vuelve a pedir el estado actual.
 */
export function useCarteleraFeed({ profile, zoneFilter, onCalled }: Options): CarteleraFeed {
  const [current, setCurrent]           = useState<CalledTicket | null>(null);
  const [waitingQueue, setWaitingQueue] = useState<WaitingTicket[]>([]);
  const [flash, setFlash]               = useState(false);
  const [ticketKey, setTicketKey]       = useState(0);
  const [connected, setConnected]       = useState(true);
  const [reconnect, setReconnect]       = useState<ReconnectState | null>(null);

  const serviceNames = useRef(new Map<string, string>());
  const roomNames    = useRef(new Map<string, string>());
  const flashTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Recarga los datos (carga inicial y recuperación tras una caída). */
  const reloadRef    = useRef<(() => Promise<void>) | null>(null);

  // Servicios que muestra esta pantalla (vacío = todos). La clave estable evita recargas innecesarias.
  const serviceFilterKey = serviceFilterKeyOf(profile?.serviceIds);
  const serviceFilter    = serviceFilterKey ? serviceFilterKey.split(',') : [];
  const serviceFilterRef = useRef<string[]>(serviceFilter);
  serviceFilterRef.current = serviceFilter;
  const allowsService = (id: string): boolean =>
    serviceFilterRef.current.length === 0 || serviceFilterRef.current.includes(id);

  const onCalledRef = useRef(onCalled);
  onCalledRef.current = onCalled;

  // Carga inicial (y al cambiar los servicios del perfil)
  useEffect(() => {
    const load = async () => {
      try {
        (await medicalServicesApi.list()).forEach(s => serviceNames.current.set(s.id, s.name));
      } catch { /* se muestran los ids */ }
      try {
        (await consultingRoomsApi.list()).forEach(r => roomNames.current.set(r.id, r.name));
      } catch { /* se muestran los ids */ }

      try {
        const data = await ticketsApi.lastCalled(LAST_CALLED_LIMIT, serviceFilter);
        const called = data
          .map(t => toCalledTicket(t, serviceNames.current, roomNames.current))
          .filter(t => matchesZone(t, zoneFilter));
        setCurrent(called[0] ?? null);
      } catch { /* se mantiene lo que había */ }

      try {
        const waiting = await ticketsApi.waitingQueue(WAITING_LIMIT, serviceFilter);
        if (Array.isArray(waiting)) setWaitingQueue(waiting.map(t => toWaitingTicket(t, serviceNames.current)));
      } catch { /* se mantiene lo que había */ }
    };
    reloadRef.current = load;
    setCurrent(null);
    setWaitingQueue([]);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceFilterKey]);

  // Eventos en tiempo real
  useEffect(() => {
    const es = getSocket('pantalla');

    const handleCalled = (payload: TicketCalledEvent) => {
      if (!allowsService(payload.medicalServiceId)) return;
      const ticket = toCalledTicket(payload, serviceNames.current, roomNames.current);
      if (!matchesZone(ticket, zoneFilter)) return;

      setCurrent(ticket);
      setTicketKey(k => k + 1);
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), FLASH_MS);
      onCalledRef.current(ticket);
    };

    /** Un turno llamado deja de estar en espera (se dispara en TICKET_CALLED, no en TICKET_RECALLED). */
    const handleLeftWaiting = (payload: TicketCalledEvent) => {
      if (!payload.ticketId) return;
      setWaitingQueue(prev => prev.filter(x => x.id !== payload.ticketId));
    };

    const handleCompleted = (payload: AttentionCompletedEvent) => {
      const id = payload.ticketId;
      if (!id) return;
      setCurrent(prev => (prev?.id === id ? null : prev));
      setWaitingQueue(prev => prev.filter(x => x.id !== id));
    };

    const handleDispensed = (payload: TicketDispensedEvent) => {
      if (!allowsService(payload.medicalServiceId)) return;
      const ticket = toWaitingTicket(payload, serviceNames.current);
      setWaitingQueue(prev => insertWaiting(prev, ticket));
    };

    const handleConnection = (data: ConnectionStatusEvent) => {
      setConnected(data.connected);
      if (!data.connected) {
        setReconnect(prev => ({
          attempt: data.attempt ?? 0,
          retryAt: Date.now() + (data.retryInMs ?? 0),
          since:   prev?.since ?? Date.now(),
        }));
        return;
      }
      setReconnect(null);
      if (data.recovered) void reloadRef.current?.();
    };

    es.on('TICKET_DISPENSED',   handleDispensed);
    es.on('TICKET_CALLED',      handleCalled);
    es.on('TICKET_CALLED',      handleLeftWaiting);
    es.on('TICKET_RECALLED',    handleCalled);
    es.on('ATTENTION_COMPLETED', handleCompleted);
    es.on('connection_status',  handleConnection);

    return () => {
      es.off('TICKET_DISPENSED',   handleDispensed);
      es.off('TICKET_CALLED',      handleCalled);
      es.off('TICKET_CALLED',      handleLeftWaiting);
      es.off('TICKET_RECALLED',    handleCalled);
      es.off('ATTENTION_COMPLETED', handleCompleted);
      es.off('connection_status',  handleConnection);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneFilter]);

  return { current, waitingQueue, flash, ticketKey, connected, reconnect };
}
