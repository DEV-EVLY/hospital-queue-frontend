import React from 'react';
import { WifiOff } from 'lucide-react';
import { formatTime, tr } from '../../i18n';
import type { ReconnectState } from './types';

interface Props {
  reconnect: ReconnectState | null;
  /** Instante actual (ms): el contador regresivo se calcula contra él */
  now: number;
}

/** Aviso ámbar mientras el tiempo real está caído: desde cuándo, qué intento y cuánto falta para el siguiente. */
export const ConnectionBanner: React.FC<Props> = ({ reconnect, now }) => (
  <div
    role="alert"
    className="absolute top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-amber-500/95 text-amber-950 text-sm font-black py-2 px-4"
  >
    <WifiOff className="w-4 h-4 shrink-0" />
    <span>{tr('cartelera.sistema_sin_conexion_tiempo_real')}</span>
    {reconnect && (
      <span className="font-mono font-bold opacity-80">
        {tr('cartelera.sin_conexion_desde', { time: formatTime(new Date(reconnect.since).toISOString(), true) })}
        {' · '}
        {tr('cartelera.reintento', {
          n: reconnect.attempt,
          s: Math.max(0, Math.ceil((reconnect.retryAt - now) / 1000)),
        })}
      </span>
    )}
  </div>
);
