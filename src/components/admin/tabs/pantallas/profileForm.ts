// Lógica pura de los perfiles de pantalla (sin React ni red).

import type { DeviceProfile, DeviceProfileRequest, UserGroup } from '../../../../types/api';
import { LANGUAGES } from '../../../../i18n';

export const PIN_PATTERN = /^[0-9]{4,8}$/;

export const emptyProfileForm = (): DeviceProfileRequest => ({
  name: '', type: 'KIOSK', language: 'es', active: true, serviceIds: [],
});

export const toProfileForm = (p: DeviceProfile): DeviceProfileRequest => ({
  name: p.name, type: p.type, language: p.language, active: p.active, serviceIds: [...p.serviceIds],
});

/**
 * ¿Es este el último perfil activo de su tipo? Quitarlo (borrar, desactivar o cambiar de tipo)
 * devuelve todas las pantallas de ese tipo al modo abierto (sin PIN ni límite de servicios).
 */
export const isLastActive = (profiles: DeviceProfile[], p: DeviceProfile): boolean =>
  p.active && profiles.filter(x => x.active && x.type === p.type).length === 1;

/** Agrega o quita un servicio de la selección. */
export const toggleServiceId = (serviceIds: string[], id: string): string[] =>
  serviceIds.includes(id) ? serviceIds.filter(x => x !== id) : [...serviceIds, id];

/** Une los servicios del grupo a la selección, sin duplicados (el perfil no queda ligado al grupo). */
export const mergeGroupServices = (serviceIds: string[], group: UserGroup): string[] =>
  Array.from(new Set([...serviceIds, ...group.serviceIds]));

export const languageLabel = (code: string): string => LANGUAGES.find(l => l.code === code)?.label ?? code;
