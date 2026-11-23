/** Formato de fechas y horas según el idioma actual (Intl). */
import { getLocale } from './store';

export const formatTime = (iso?: string | null, withSeconds = false): string =>
  iso
    ? new Date(iso).toLocaleTimeString(getLocale(), {
        hour: '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}),
      })
    : '—';

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
