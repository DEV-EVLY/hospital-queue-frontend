import type { PriorityLevel } from '../../types/api';

/** Tiempo que lleva esperando un turno, en minutos ("< 1 min", "12 min"). */
export const minutesWaiting = (issuedAt: string, now: number = Date.now()): string => {
  const diff = Math.round((now - new Date(issuedAt).getTime()) / 60000);
  return diff < 1 ? '< 1 min' : `${diff} min`;
};

/** Color de la insignia de puntos según la prioridad. */
export const PRIORITY_BADGE: Record<PriorityLevel, string> = {
  URGENT:       'bg-red-100 text-red-700',
  PREFERENTIAL: 'bg-amber-100 text-amber-800',
  NORMAL:       'bg-primary-100 text-primary-700',
};
