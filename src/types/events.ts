/**
 * Eventos en tiempo real (SSE) emitidos por notification-service.
 * El cliente (services/socket.ts) entrega solo el `payload` interno de cada evento.
 */
import type { ISODateTime, PriorityLevel, TicketStatus, UUID } from './api';

export interface TicketDispensedEvent {
  ticketId: UUID;
  ticketCode: string;
  medicalServiceId: UUID;
  priorityLevel: PriorityLevel;
  priorityPoints: number;
  channel: string;
  issuedAt: ISODateTime;
  timestamp: ISODateTime;
}

/** TICKET_CALLED y TICKET_RECALLED comparten forma */
export interface TicketCalledEvent {
  ticketId: UUID;
  ticketCode: string;
  consultingRoomId: UUID;
  medicalServiceId: UUID;
  priorityLevel: PriorityLevel;
  calledAt: ISODateTime;
  timestamp: ISODateTime;
  /** Texto para síntesis de voz, si el backend lo envía */
  audioAnnouncement?: string;
}

export interface AttentionStartedEvent {
  ticketId: UUID;
  ticketCode: string;
  medicalServiceId: UUID;
  status: TicketStatus;
  timestamp: ISODateTime;
}

export interface AttentionCompletedEvent {
  ticketId: UUID;
  ticketCode: string;
  finalStatus: TicketStatus;
  medicalServiceId: UUID;
  timestamp: ISODateTime;
}

export interface PriorityUpdatedEvent {
  ticketId: UUID;
  priorityLevel: PriorityLevel;
  timestamp: ISODateTime;
}

/** Evento local del cliente (no viene del servidor) */
export interface ConnectionStatusEvent {
  room: string;
  connected: boolean;
  /** connected = true: la conexión vuelve tras una caída; el servidor no reenvía lo perdido, hay que recargar. */
  recovered?: boolean;
  /** connected = false: nº de intento de reconexión y espera hasta el siguiente. */
  attempt?: number;
  retryInMs?: number;
}

/** Nombre del evento → tipo de su payload */
export interface RealtimeEventMap {
  TICKET_DISPENSED: TicketDispensedEvent;
  TICKET_CALLED: TicketCalledEvent;
  TICKET_RECALLED: TicketCalledEvent;
  ATTENTION_STARTED: AttentionStartedEvent;
  ATTENTION_COMPLETED: AttentionCompletedEvent;
  PRIORITY_UPDATED: PriorityUpdatedEvent;
  connection_status: ConnectionStatusEvent;
}

export type RealtimeEventName = keyof RealtimeEventMap;
