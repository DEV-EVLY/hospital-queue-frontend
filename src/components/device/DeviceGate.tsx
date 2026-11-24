import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Spinner } from '../ui';
import { ApiError, devicesApi } from '../../services/api';
import { clearPaired, getPaired, savePaired, type PairedDevice } from '../../services/devicePairing';
import type { DeviceProfile, DeviceType } from '../../types/api';
import { isLang, setLang, tr } from '../../i18n';
import { DevicePairing } from './DevicePairing';

interface Props {
  type: DeviceType;
  /** `profile`/`deviceToken` son null en modo abierto (sin perfiles de este tipo). */
  children: (profile: DeviceProfile | null, deviceToken: string | null) => React.ReactNode;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'open' }                              // sin perfiles de este tipo: modo abierto (todos los servicios)
  | { kind: 'ready'; device: PairedDevice }
  | { kind: 'unpaired' };

const REFRESH_MS = 60_000;
const TAPS_TO_OPEN = 5;
const TAP_WINDOW_MS = 4_000;

const applyLanguage = (p: DeviceProfile) => { if (isLang(p.language)) setLang(p.language); };

/**
 * Envuelve un kiosko o una cartelera: resuelve el perfil con el que está vinculado el equipo.
 * - Sin perfiles activos de ese tipo → modo abierto (comportamiento anterior).
 * - Con perfiles → el equipo debe estar vinculado (PIN); mientras no lo esté se muestra la pantalla de vinculación.
 * - Acceso oculto (pide el PIN) para cambiar o quitar el perfil, sin ningún botón visible en la pantalla pública:
 *     · 5 toques o clics seguidos en la esquina superior izquierda (el logo), o
 *     · el atajo de teclado Alt + Mayús + P (equipos con teclado).
 * Cada consulta renueva el token del equipo. Si el servidor no responde, se sigue usando el último perfil guardado.
 */
export const DeviceGate: React.FC<Props> = ({ type, children }) => {
  const [phase, setPhase]   = useState<Phase>({ kind: 'loading' });
  const [dialog, setDialog] = useState(false);
  const lastJson            = useRef('');
  const taps                = useRef<number[]>([]);

  const resolve = useCallback(async () => {
    const stored = getPaired(type);
    try {
      const status = await devicesApi.status();
      const count = type === 'KIOSK' ? status.kioskProfiles : status.displayProfiles;
      if (count === 0) { setPhase(p => (p.kind === 'open' ? p : { kind: 'open' })); return; }
      if (!stored) { setPhase({ kind: 'unpaired' }); return; }
      // El servidor identifica el perfil por el token del equipo y devuelve un token renovado
      const { profile, token } = await devicesApi.config(stored.token);
      if (!profile.active || profile.type !== type) throw new ApiError('inactive', 404);
      const device: PairedDevice = { profile, token };
      savePaired(type, device);
      const json = JSON.stringify(profile) + token.length;
      if (json !== lastJson.current) {
        lastJson.current = json;
        applyLanguage(profile);
        setPhase({ kind: 'ready', device });
      } else {
        // Mismo perfil: solo se actualiza el token en memoria
        setPhase(p => (p.kind === 'ready' ? { kind: 'ready', device } : p));
      }
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        // El perfil ya no existe, está inactivo o el token no es válido: hay que vincular de nuevo
        clearPaired(type);
        lastJson.current = '';
        setPhase({ kind: 'unpaired' });
      } else if (stored) {
        // Sin conexión: se mantiene el último perfil conocido
        setPhase(p => (p.kind === 'ready' ? p : { kind: 'ready', device: stored }));
      } else {
        setPhase(p => (p.kind === 'loading' ? { kind: 'open' } : p));
      }
    }
  }, [type]);

  useEffect(() => {
    void resolve();
    const id = setInterval(() => { void resolve(); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [resolve]);

  // Atajo de teclado para equipos con teclado físico: Alt + Mayús + P
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyP') { e.preventDefault(); setDialog(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handlePaired = (device: PairedDevice) => {
    savePaired(type, device);
    lastJson.current = JSON.stringify(device.profile) + device.token.length;
    applyLanguage(device.profile);
    setPhase({ kind: 'ready', device });
    setDialog(false);
  };

  const handleUnpair = () => {
    clearPaired(type);
    lastJson.current = '';
    setDialog(false);
    void resolve();
  };

  const tap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter(t => now - t < TAP_WINDOW_MS), now];
    if (taps.current.length >= TAPS_TO_OPEN) { taps.current = []; setDialog(true); }
  };

  if (phase.kind === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface-50 text-surface-500">
        <Spinner />
        <p className="text-sm">{tr('devices.cargando')}</p>
      </div>
    );
  }

  if (phase.kind === 'unpaired') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface-50 p-4">
        <p className="text-sm font-semibold text-surface-600 text-center max-w-sm">
          {tr(`devices.no_vinculado_${type}`)}
        </p>
        <DevicePairing type={type} current={null} onPaired={handlePaired} />
      </div>
    );
  }

  const device = phase.kind === 'ready' ? phase.device : null;

  return (
    <>
      {children(device?.profile ?? null, device?.token ?? null)}
      {/* Zona táctil invisible sobre el logo: 5 toques seguidos abren la vinculación */}
      <button
        type="button"
        aria-label={tr('devices.vincular_titulo')}
        onClick={tap}
        className="fixed top-0 left-0 w-20 h-20 z-[60] opacity-0 cursor-default"
      />
      {dialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
          <DevicePairing
            type={type}
            current={device?.profile ?? null}
            onPaired={handlePaired}
            onUnpair={device ? handleUnpair : undefined}
            onClose={() => setDialog(false)}
          />
        </div>
      )}
    </>
  );
};
