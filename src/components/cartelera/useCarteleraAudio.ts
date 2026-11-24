import { useCallback, useEffect, useRef, useState } from 'react';
import { soundService, spellTicketCode } from '../../services/audio';
import { getSpeechLang, tr } from '../../i18n';
import type { CalledTicket } from './types';

const AUDIO_PREF_KEY = 'hospital.cartelera.audio';

/** El sonido se recuerda: tras un reinicio de la pantalla no hay quien lo vuelva a activar. */
const readAudioPref = (): boolean => {
  try { return localStorage.getItem(AUDIO_PREF_KEY) === '1'; } catch { return false; }
};
const saveAudioPref = (on: boolean): void => {
  try { localStorage.setItem(AUDIO_PREF_KEY, on ? '1' : '0'); } catch { /* sin almacenamiento */ }
};

export interface CarteleraAudio {
  enabled: boolean;
  /** El navegador bloquea audio y voz hasta que hay un toque: se avisa en pantalla en vez de fallar en silencio. */
  blocked: boolean;
  toggle: () => void;
  /** Para el botón del aviso "toque la pantalla". */
  unlock: () => void;
  /** Anuncia un llamado (timbre + voz) si el sonido está activado. Identidad estable. */
  announceCall: (ticket: CalledTicket) => void;
}

/** Sonido de la cartelera: preferencia persistente, desbloqueo por gesto y anuncio de llamados. */
export function useCarteleraAudio(): CarteleraAudio {
  const [enabled, setEnabled] = useState(readAudioPref);
  const [blocked, setBlocked] = useState(false);

  // Los manejadores de eventos en tiempo real viven más que un render: leen el valor vigente desde la ref
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Detecta si el navegador lo bloquea y lo desbloquea con el primer toque o tecla
  useEffect(() => {
    if (!enabled) { setBlocked(false); return; }
    const check = () => setBlocked(!soundService.isRunning());
    const unlockOnGesture = () => {
      if (soundService.isRunning()) return;
      void soundService.unlock().then(ok => setBlocked(!ok));
    };
    check();
    window.addEventListener('pointerdown', unlockOnGesture);
    window.addEventListener('keydown', unlockOnGesture);
    const id = setInterval(check, 3000);
    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
      clearInterval(id);
    };
  }, [enabled]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    setEnabled(next);
    saveAudioPref(next);
    if (next) {
      // Dentro del gesto del clic: aquí es donde el navegador permite activar audio y voz
      void soundService.unlock().then(ok => {
        setBlocked(!ok);
        if (ok) void soundService.playHospitalChime();
      });
    } else {
      soundService.stop();
    }
  }, []);

  const unlock = useCallback(() => {
    void soundService.unlock().then(ok => setBlocked(!ok));
  }, []);

  const announceCall = useCallback((ticket: CalledTicket) => {
    if (!enabledRef.current) return;
    // El anuncio se genera en el idioma de la pantalla; el código se deletrea y los llamados se encolan
    soundService.announce(
      tr('cartelera.anuncio', { code: spellTicketCode(ticket.ticketCode), room: ticket.roomName }),
      getSpeechLang(),
    );
  }, []);

  return { enabled, blocked, toggle, unlock, announceCall };
}
