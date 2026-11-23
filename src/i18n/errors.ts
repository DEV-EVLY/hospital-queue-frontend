/**
 * Traduce los mensajes de error de los microservicios (que llegan en inglés) al idioma actual.
 * Cada mensaje conocido se reconoce por patrón; las validaciones llegan como "campo: mensaje; campo: mensaje".
 * Lo que no se reconoce se muestra tal cual (mejor un mensaje en inglés que ninguno).
 */
import type { MessageKey } from './messages';
import { tr, type Params } from './translate';

interface Rule { re: RegExp; key: MessageKey; params?: (m: RegExpMatchArray) => Params }

const RULES: Rule[] = [
  { re: /^Invalid credentials/i,                          key: 'errors.invalid_credentials' },
  { re: /^Invalid token/i,                                key: 'errors.invalid_token' },
  { re: /^Username already in use: (.+)$/i,               key: 'errors.username_in_use', params: m => ({ value: m[1] }) },
  { re: /^You cannot deactivate your own account/i,       key: 'errors.cannot_deactivate_self' },
  { re: /^User not found/i,                               key: 'errors.not_found.user' },
  { re: /^Patient not found/i,                            key: 'errors.not_found.patient' },
  { re: /^Doctor not found/i,                             key: 'errors.not_found.doctor' },
  { re: /^Appointment not found/i,                        key: 'errors.not_found.appointment' },
  { re: /^Specialty not found/i,                          key: 'errors.not_found.specialty' },
  { re: /^Group not found/i,                              key: 'errors.not_found.group' },
  { re: /^Ticket not found/i,                             key: 'errors.not_found.ticket' },
  { re: /^(Target )?[Mm]edical service not found/i,       key: 'errors.not_found.service' },
  { re: /^Consulting room not found/i,                    key: 'errors.not_found.room' },
  { re: /^Priority rule not found/i,                      key: 'errors.not_found.rule' },
  { re: /^Group code already in use: (.+)$/i,             key: 'errors.group_code_in_use', params: m => ({ value: m[1] }) },
  { re: /^(Code and name|Name) (are|is) required/i,       key: 'errors.name_required' },
  { re: /^Invalid role/i,                                 key: 'errors.invalid_role' },
  { re: /^The group has subgroups/i,                      key: 'errors.group_has_subgroups' },
  { re: /^A group cannot be moved inside itself/i,        key: 'errors.group_move_cycle' },
  { re: /^The user must belong to the parent group '(.+)' before/i, key: 'errors.user_must_be_in_parent', params: m => ({ parent: m[1] }) },
  { re: /^(\d+) member\(s\) of this group do not belong/i, key: 'errors.members_not_in_parent', params: m => ({ n: m[1] }) },
  { re: /^(\d+) service\(s\) of this group are not attended/i, key: 'errors.services_not_in_parent', params: m => ({ n: m[1] }) },
  { re: /^A subgroup can only attend services of its parent/i, key: 'errors.subgroup_services' },
  { re: /^Only OPERATOR, SUPERVISOR and DOCTOR/i,         key: 'errors.group_roles' },
  { re: /conflicts with existing data/i,                  key: 'errors.conflict' },
  { re: /^priorityLevel must be one of/i,                 key: 'errors.invalid_priority' },
  { re: /^targetServiceId must be a valid UUID/i,         key: 'errors.invalid_target_service' },
  { re: /^Date range cannot exceed (\d+) days/i,          key: 'errors.range_too_long', params: m => ({ max: m[1] }) },
  { re: /^endDate must not be before startDate/i,         key: 'errors.range_inverted' },
  { re: /^Failed to read HTTP message/i,                  key: 'errors.malformed_request' },
  { re: /^Required (query )?parameter '(.+)' is not present/i, key: 'errors.missing_param', params: m => ({ name: m[2] }) },
  { re: /^Only ADMIN users can|^ADMIN role required/i,    key: 'errors.admin_only' },
  { re: /^(Ticket cannot be|Cannot (start|complete) attention)/i, key: 'errors.invalid_ticket_state' },
  { re: /^Type mismatch/i,                                key: 'errors.type_mismatch' },
  { re: /^Validation (failed|failure)$/i,                 key: 'errors.validation' },
  { re: /^Incorrect PIN/i,                                key: 'errors.device_pin_incorrect' },
  { re: /^Too many failed attempts\. Try again in (\d+) seconds/i, key: 'errors.device_pin_locked', params: m => ({ n: m[1] }) },
  { re: /^The device PIN has not been configured/i,       key: 'errors.device_pin_not_set' },
  { re: /^Device unlock required/i,                       key: 'errors.device_unlock_required' },
  { re: /^The PIN must contain between 4 and 8 digits/i,  key: 'errors.device_pin_format' },
  { re: /^This kiosk is not paired/i,                     key: 'errors.device_not_paired' },
  { re: /^This kiosk is not allowed to issue tickets/i,   key: 'errors.device_service_not_allowed' },
  { re: /^Unknown device profile/i,                       key: 'errors.device_profile_unknown' },
  { re: /^The device profile cannot issue tickets/i,      key: 'errors.device_profile_cannot_issue' },
  { re: /^The device profile is inactive/i,               key: 'errors.device_profile_inactive' },
  { re: /^Device profile not found/i,                     key: 'errors.not_found.device_profile' },
  { re: /^language must be one of/i,                      key: 'errors.invalid_language' },
];

/** Mensajes de las validaciones de campo (Bean Validation y los propios de cada DTO). */
const FIELD_RULES: Rule[] = [
  { re: /^(must not be (blank|null|empty)|.+ must not be blank|\w+ is required)$/i, key: 'errors.v_required' },
  { re: /^size must be between (\d+) and \d{9,}$/i,        key: 'errors.v_min_size', params: m => ({ min: m[1] }) },
  { re: /^size must be between (\d+) and (\d+)$/i,        key: 'errors.v_size', params: m => ({ min: m[1], max: m[2] }) },
  { re: /^must be greater than or equal to (-?\d+)$/i,    key: 'errors.v_min', params: m => ({ n: m[1] }) },
  { re: /^must be less than or equal to (-?\d+)$/i,       key: 'errors.v_max', params: m => ({ n: m[1] }) },
  { re: /^must be a well-formed email address$/i,         key: 'errors.v_email' },
  { re: /^Invalid phone number$/i,                        key: 'errors.v_phone' },
  { re: /^colorHex must be a valid hex color$/i,          key: 'errors.v_color' },
];

/** Campos conocidos → clave de su nombre en el idioma actual. */
const FIELD_NAMES: Record<string, MessageKey> = {
  username: 'errors.field.username', password: 'errors.field.password', newPassword: 'errors.field.password',
  fullName: 'errors.field.fullName', role: 'errors.field.role', name: 'errors.field.name', code: 'errors.field.code',
  description: 'errors.field.description', parentId: 'errors.field.parentId', licenseNumber: 'errors.field.licenseNumber',
  firstName: 'errors.field.firstName', lastName: 'errors.field.lastName', specialtyId: 'errors.field.specialty',
  phone: 'errors.field.phone', email: 'errors.field.email', documentType: 'errors.field.documentType',
  documentNumber: 'errors.field.documentNumber', birthDate: 'errors.field.birthDate', ticketPrefix: 'errors.field.ticketPrefix',
  estimatedMinutes: 'errors.field.estimatedMinutes', medicalServiceId: 'errors.field.service',
  priorityPoints: 'errors.field.priorityPoints', maxWaitMinutes: 'errors.field.maxWaitMinutes',
  resultLevel: 'errors.field.resultLevel', condition: 'errors.field.condition', channel: 'errors.field.channel',
  serviceIds: 'errors.field.services', hisAppointmentId: 'errors.field.hisAppointmentId', patientId: 'errors.field.patient',
  appointmentDate: 'errors.field.appointmentDate', appointmentTime: 'errors.field.appointmentTime',
  consultingRoomId: 'errors.field.room', operatorId: 'errors.field.operator', finalStatus: 'errors.field.status',
  status: 'errors.field.status', colorHex: 'errors.field.color',
};

const apply = (rules: Rule[], text: string): string | null => {
  for (const r of rules) {
    const m = text.match(r.re);
    if (m) return tr(r.key, r.params?.(m));
  }
  return null;
};

const statusFallback = (status?: number): string | null => {
  if (!status) return null;
  if (status === 401) return tr('errors.session_expired');
  if (status === 403) return tr('errors.forbidden');
  if (status === 404) return tr('errors.not_found.generic');
  if (status === 409) return tr('errors.conflict');
  if (status === 400) return tr('errors.validation');
  if (status >= 502 && status <= 504) return tr('errors.unavailable');
  if (status >= 500) return tr('errors.server');
  return null;
};

/** Traduce un mensaje de error del backend (o de validación "campo: mensaje; ...") al idioma actual. */
export function translateApiMessage(raw: string | null | undefined, status?: number): string {
  const message = (raw ?? '').trim();
  if (!message) return statusFallback(status) ?? tr('errors.request');

  const direct = apply(RULES, message);
  if (direct) return direct;

  // "campo: mensaje; campo: mensaje"
  const parts = message.split('; ');
  const translated = parts.map(part => {
    const m = part.match(/^([\w.]+): (.+)$/);
    if (!m) return null;
    const [, field, msg] = m;
    const text = apply(FIELD_RULES, msg);
    if (!text) return null;
    const key = FIELD_NAMES[field.split('.').pop() ?? field];
    return `${key ? tr(key) : field}: ${text}`;
  });
  if (translated.every(p => p !== null)) return translated.join('; ');

  return message;
}
