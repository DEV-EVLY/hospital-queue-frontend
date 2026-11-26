// Formularios de médicos y especialidades: tipos, valores iniciales, validación y armado del payload (sin React).

import type { Doctor, DoctorRequest } from '../../../../types/api';
import { tr } from '../../../../i18n';
import { normalizePhone, phoneError } from '../_shared';

export interface DoctorForm {
  licenseNumber: string; firstName: string; lastName: string; specialtyId: string; phone: string; email: string;
}
export interface SpecialtyForm { code: string; name: string; description: string }

export const BLANK_DOCTOR: DoctorForm = { licenseNumber: '', firstName: '', lastName: '', specialtyId: '', phone: '', email: '' };
export const BLANK_SPECIALTY: SpecialtyForm = { code: '', name: '', description: '' };

export const toDoctorForm = (d: Doctor): DoctorForm => ({
  licenseNumber: d.licenseNumber || '',
  firstName:     d.firstName     || '',
  lastName:      d.lastName      || '',
  specialtyId:   d.specialtyId   || '',
  phone:         d.phone         || '',
  email:         d.email         || '',
});

/** Mensaje del primer problema del formulario de médico, o null si está bien. */
export const doctorFormError = (f: DoctorForm): string | null => {
  if (!f.licenseNumber || !f.firstName || !f.lastName) return tr('medicos.cmp_nombres_y_apellidos_son');
  if (!f.specialtyId) return tr('medicos.selecciona_especialidad_2');
  return phoneError(f.phone);
};

export const toDoctorPayload = (f: DoctorForm): DoctorRequest => ({
  licenseNumber: f.licenseNumber.trim(),
  firstName: f.firstName.trim(),
  lastName: f.lastName.trim(),
  specialtyId: f.specialtyId,
  phone: normalizePhone(f.phone),
  email: f.email.trim() || null,
});

export const specialtyFormError = (f: SpecialtyForm): string | null =>
  !f.code || !f.name ? tr('medicos.codigo_y_nombre_son_obligatorios') : null;
