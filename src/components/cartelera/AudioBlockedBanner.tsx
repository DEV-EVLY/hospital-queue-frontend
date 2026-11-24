import React from 'react';
import { VolumeX } from 'lucide-react';
import { tr } from '../../i18n';

/** Audio activado pero bloqueado por el navegador: hace falta un toque en la pantalla para habilitarlo. */
export const AudioBlockedBanner: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => (
  <button
    type="button"
    onClick={onUnlock}
    className="absolute top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-sky-500/95 text-sky-950 text-sm font-black py-2 px-4 cursor-pointer"
  >
    <VolumeX className="w-4 h-4 shrink-0" />
    <span>{tr('cartelera.tocar_activar_sonido')}</span>
  </button>
);
