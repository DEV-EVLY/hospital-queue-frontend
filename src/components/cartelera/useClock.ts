import { useEffect, useState } from 'react';
import { formatDate, formatTime } from '../../i18n';

export interface Clock {
  /** Instante actual en ms; cambia cada segundo (los contadores regresivos se calculan contra él). */
  now: number;
  /** Hora con segundos, p. ej. "10:34:46 a. m." */
  time: string;
  /** Fecha larga con la primera letra en mayúscula, p. ej. "Martes, 24 de noviembre de 2026" */
  longDate: string;
}

const readClock = (): Clock => {
  const now = Date.now();
  const date = new Date(now);
  const longDate = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return { now, time: formatTime(date.toISOString(), true), longDate: longDate.charAt(0).toUpperCase() + longDate.slice(1) };
};

/** Reloj que se actualiza cada segundo. */
export function useClock(): Clock {
  const [clock, setClock] = useState(readClock);
  useEffect(() => {
    const id = setInterval(() => setClock(readClock()), 1000);
    return () => clearInterval(id);
  }, []);
  return clock;
}
