import { useCallback, useEffect, useRef, useState } from 'react';

export const COUNTDOWN_SECONDS = 20;
const EXTRA_SECONDS = 15;

/**
 * Cuenta regresiva para volver a la pantalla de inicio tras emitir el ticket.
 * Corre solo mientras `active`; al llegar a 0 avisa con `onExpire`.
 */
export function useTicketCountdown(active: boolean, onExpire: () => void) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  // `onExpire` cambia en cada render del padre: se lee desde la ref para no reiniciar el temporizador
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!active) return;
    if (countdown === 0) { expireRef.current(); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [active, countdown]);

  const restart = useCallback(() => setCountdown(COUNTDOWN_SECONDS), []);
  const extend  = useCallback(() => setCountdown(c => c + EXTRA_SECONDS), []);

  return { countdown, restart, extend };
}
