// Formularios del catálogo (servicios médicos y consultorios): tipos, valores iniciales y validación (sin React).

import type { ConsultingRoom, MedicalService } from '../../../../types/api';
import { tr } from '../../../../i18n';

export interface ServiceForm { name: string; ticketPrefix: string; iconName: string; estimatedMinutes: number }
export interface RoomForm { name: string; code: string; medicalServiceId: string; location: string }

export const BLANK_SERVICE: ServiceForm = { name: '', ticketPrefix: '', iconName: 'stethoscope', estimatedMinutes: 20 };
export const BLANK_ROOM: RoomForm = { name: '', code: '', medicalServiceId: '', location: '' };

export const toServiceForm = (s: MedicalService): ServiceForm => ({
  name: s.name, ticketPrefix: s.ticketPrefix, iconName: s.iconName || 'stethoscope', estimatedMinutes: s.estimatedMinutes,
});

export const toRoomForm = (r: ConsultingRoom): RoomForm => ({
  name: r.name, code: r.code, medicalServiceId: r.medicalServiceId || '', location: r.location || '',
});

export const serviceFormError = (f: ServiceForm): string | null =>
  !f.name || !f.ticketPrefix ? tr('catalogo.nombre_y_prefijo_ticket_son') : null;

export const roomFormError = (f: RoomForm): string | null =>
  !f.name || !f.code ? tr('catalogo.nombre_y_codigo_son_obligatorios') : null;

/** Un consultorio sin servicio se envía con `medicalServiceId: null`. */
export const toRoomPayload = (f: RoomForm) => ({ ...f, medicalServiceId: f.medicalServiceId || null });

/** Colores del estado de un consultorio. */
export const ROOM_VARIANT: Record<string, 'success' | 'warning' | 'primary' | 'gray'> = {
  AVAILABLE: 'success', BUSY: 'warning', PAUSED: 'primary', CLOSED: 'gray',
};
