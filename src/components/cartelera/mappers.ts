// Funciones puras de la cartelera: convierten tickets del API o eventos en tiempo real al modelo de pantalla.
// Sin React ni red, para poder probarlas aisladas.

import type { TicketCalledEvent, TicketDispensedEvent } from '../../types/events';
import { normalizeInstant } from '../../i18n';
import type { CalledTicket, WaitingTicket } from './types';

/** Lo mínimo que necesitamos de un ticket llamado: viene del API (Ticket) o del evento SSE. */
export type CalledSource = Pick<TicketCalledEvent, 'ticketCode' | 'medicalServiceId'> & {
  id?: string;
  ticketId?: string;
  consultingRoomId: string | null;
  calledAt: string | null;
};

/** Ticket del API o evento TICKET_DISPENSED */
export type WaitingSource =
  Pick<TicketDispensedEvent, 'ticketCode' | 'medicalServiceId' | 'priorityLevel' | 'priorityPoints'> & {
    id?: string;
    ticketId?: string;
    issuedAt: string;
  };

export const MAX_WAITING = 20;

export const toCalledTicket = (
  src: CalledSource,
  serviceNames: Map<string, string>,
  roomNames: Map<string, string>,
): CalledTicket => ({
  id:          src.ticketId ?? src.id ?? String(Date.now()),
  ticketCode:  src.ticketCode || '—',
  serviceName: serviceNames.get(src.medicalServiceId) ?? src.medicalServiceId ?? '—',
  roomName:    (src.consultingRoomId ? roomNames.get(src.consultingRoomId) ?? src.consultingRoomId : null) ?? '—',
  // El evento en tiempo real trae el instante como epoch en segundos, la API REST como ISO
  calledAt:    normalizeInstant(src.calledAt) ?? new Date().toISOString(),
});

export const toWaitingTicket = (src: WaitingSource, serviceNames: Map<string, string>): WaitingTicket => ({
  id:             src.ticketId ?? src.id ?? String(Date.now()),
  ticketCode:     src.ticketCode || '—',
  serviceName:    serviceNames.get(src.medicalServiceId) ?? src.medicalServiceId ?? '—',
  priorityLevel:  src.priorityLevel ?? 'NORMAL',
  priorityPoints: src.priorityPoints ?? 0,
  issuedAt:       normalizeInstant(src.issuedAt) ?? new Date().toISOString(),
});

/** Más prioridad primero; a igual prioridad, el que llegó antes. */
export const compareWaiting = (a: WaitingTicket, b: WaitingTicket): number =>
  b.priorityPoints - a.priorityPoints || a.issuedAt.localeCompare(b.issuedAt);

/** Agrega un turno a la lista de espera (sin duplicados), ordenada y acotada. */
export const insertWaiting = (queue: WaitingTicket[], ticket: WaitingTicket): WaitingTicket[] => {
  if (queue.some(x => x.id === ticket.id)) return queue;
  return [ticket, ...queue].sort(compareWaiting).slice(0, MAX_WAITING);
};

/** Filtro opcional `?zone=` de la URL: la pantalla solo muestra llamados de esa zona. */
export const getZoneFilter = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('zone');
  } catch {
    return null;
  }
};

export const matchesZone = (ticket: CalledTicket, zone: string | null): boolean => {
  if (!zone) return true;
  const z = zone.toLowerCase();
  return (
    ticket.roomName?.toLowerCase().includes(z) ||
    ticket.serviceName?.toLowerCase().includes(z) ||
    ticket.location?.toLowerCase().includes(z) ||
    false
  );
};

/** Clave estable de los servicios del perfil (evita recargar la pantalla por un array nuevo con el mismo contenido). */
export const serviceFilterKeyOf = (serviceIds: readonly string[] | undefined): string =>
  (serviceIds ?? []).slice().sort().join(',');
