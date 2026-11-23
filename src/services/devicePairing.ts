import type { DeviceProfile, DeviceType } from '../types/api';

/** Lo que este equipo recuerda de su vinculación: el perfil y el token que lo acredita ante el servidor. */
export interface PairedDevice { profile: DeviceProfile; token: string }

/**
 * Se guarda el perfil completo para que la pantalla siga funcionando si el servidor no responde al arrancar.
 * El token solo identifica a este equipo (no es el PIN): el servidor lo exige al emitir tickets.
 */
const key = (type: DeviceType): string => `hospital.device.${type}`;

export const getPaired = (type: DeviceType): PairedDevice | null => {
  try {
    const raw = localStorage.getItem(key(type));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<PairedDevice>;
    return d.profile && d.profile.type === type && typeof d.token === 'string' && d.token
      ? { profile: d.profile, token: d.token }
      : null;
  } catch {
    return null;
  }
};

export const savePaired = (type: DeviceType, device: PairedDevice): void => {
  try { localStorage.setItem(key(type), JSON.stringify(device)); } catch { /* sin almacenamiento */ }
};

export const clearPaired = (type: DeviceType): void => {
  try { localStorage.removeItem(key(type)); } catch { /* sin almacenamiento */ }
};
