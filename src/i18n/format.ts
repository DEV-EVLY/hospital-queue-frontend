/** Formato de fechas y horas según el idioma actual (Intl). */
import { getLocale } from './store';

export const formatTime = (iso?: string | null, withSeconds = false): string =>
  iso
    ? new Date(iso).toLocaleTimeString(getLocale(), {
        hour: '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}),
      })
    : '—';

/**
 * Normaliza un instante a ISO-8601. Los eventos en tiempo real lo traen a veces como epoch en segundos
 * (p. ej. "1.7955345872638311E9") en vez de ISO; las respuestas REST ya vienen en ISO.
 * Devuelve null si no se puede interpretar.
 */
export const normalizeInstant = (value: string | number | null | undefined): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value.trim()) ? Number(value) : NaN;
  const date = Number.isNaN(n) ? new Date(String(value)) : new Date(n < 1e11 ? n * 1000 : n); // segundos o milisegundos
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const formatDateTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString(getLocale()) : '—';

export const formatDate = (date: Date, options: Intl.DateTimeFormatOptions): string =>
  date.toLocaleDateString(getLocale(), options);

/** Nombre del mes (0-11) en el idioma actual, con la primera letra en mayúscula. */
export const monthName = (month: number): string => {
  const s = new Intl.DateTimeFormat(getLocale(), { month: 'long' }).format(new Date(2000, month, 1));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Abreviatura del día de la semana (0 = domingo) en el idioma actual, p. ej. "lu", "Mo". */
export const weekdayShort = (day: number): string => {
  const s = new Intl.DateTimeFormat(getLocale(), { weekday: 'short' }).format(new Date(2000, 0, 2 + day));
  return s.replace('.', '').slice(0, 2);
};
