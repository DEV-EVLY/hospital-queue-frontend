import type { PriorityLevel } from '../../types/api';

/** Turno que se está llamando (o se llamó hace poco) en la cartelera. */
export interface CalledTicket {
  id: string;
  ticketCode: string;
  serviceName: string;
  roomName: string;
  location?: string;
  calledAt: string;
}

/** Turno en la lista de espera. */
export interface WaitingTicket {
  id: string;
  ticketCode: string;
  serviceName: string;
  priorityLevel: PriorityLevel;
  priorityPoints: number;
  issuedAt: string;
}

/** Estado de la reconexión del tiempo real mientras está caído. */
export interface ReconnectState {
  attempt: number;
  /** Instante (ms) del siguiente intento */
  retryAt: number;
  /** Instante (ms) en que se perdió la conexión */
  since: number;
}
