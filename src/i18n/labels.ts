/**
 * Etiquetas traducidas de los valores (enums) del backend y listas de opciones para los `Select`.
 * Las claves se comprueban en compilación: si se agrega un valor nuevo a un enum del backend y falta su
 * traducción (`enum.<grupo>.<VALOR>`), el proyecto no compila.
 */
import type {
  ConsultingRoomStatus, DocumentType, DoctorStatus, Gender, IssuanceChannel, PriorityLevel, Role, RuleCondition,
  TicketStatus, CircuitBreakerState,
} from '../types/api';
import type { MessageKey } from './messages';
import { tr } from './translate';

export const TICKET_STATUSES: TicketStatus[] = ['WAITING', 'CALLED', 'IN_ATTENTION', 'ATTENDED', 'NOT_ATTENDED', 'REFERRED', 'CANCELLED'];
export const PRIORITY_LEVELS: PriorityLevel[] = ['URGENT', 'PREFERENTIAL', 'NORMAL'];
export const CHANNELS: IssuanceChannel[] = ['KIOSK', 'OPERATOR', 'WEB', 'HIS_AUTO'];
export const ROLES: Role[] = ['ADMIN', 'SUPERVISOR', 'DOCTOR', 'OPERATOR', 'KIOSK'];
export const DOCTOR_STATUSES: DoctorStatus[] = ['AVAILABLE', 'BUSY', 'ON_LEAVE', 'OFF_DUTY'];
export const DOCUMENT_TYPES: DocumentType[] = ['DNI', 'FOREIGN_ID', 'PASSPORT', 'OTHER'];
export const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];
export const RULE_CONDITIONS: RuleCondition[] = ['URGENT_TRIAGE', 'DISABILITY', 'PREGNANT', 'ELDERLY', 'SCHEDULED_APPOINTMENT', 'MINOR_AGE', 'CUSTOM'];
export const SERVICE_ICONS = ['stethoscope', 'heart', 'baby', 'activity', 'flask-conical'] as const;
export type ServiceIcon = (typeof SERVICE_ICONS)[number];

export const statusLabel        = (v: TicketStatus)          => tr(`enum.ticketStatus.${v}`);
export const priorityLabel      = (v: PriorityLevel)         => tr(`enum.priority.${v}`);
export const channelLabel       = (v: IssuanceChannel)       => tr(`enum.channel.${v}`);
export const roleLabel          = (v: Role)                  => tr(`enum.role.${v}`);
export const doctorStatusLabel  = (v: DoctorStatus)          => tr(`enum.doctorStatus.${v}`);
export const roomStatusLabel    = (v: ConsultingRoomStatus)  => tr(`enum.roomStatus.${v}`);
export const docTypeLabel       = (v: DocumentType)          => tr(`enum.docType.${v}`);
export const genderLabel        = (v: Gender)                => tr(`enum.gender.${v}`);
export const conditionLabel     = (v: RuleCondition)         => tr(`enum.condition.${v}`);
export const conditionHint      = (v: RuleCondition)         => tr(`enum.conditionHint.${v}`);
export const circuitLabel       = (v: CircuitBreakerState)   => tr(`enum.circuit.${v}`);
export const iconLabel          = (v: ServiceIcon)           => tr(`enum.icon.${v}`);

/** Nombres de las reglas de prioridad sembradas por defecto (la base los guarda en inglés). */
const SEED_RULE_NAMES: Record<string, MessageKey> = {
  'Urgent Triage (Red)':   'enum.ruleName.urgent_triage',
  'Disability Priority':   'enum.ruleName.disability',
  'Pregnant Women':        'enum.ruleName.pregnant',
  'Elderly Priority':      'enum.ruleName.elderly',
  'Scheduled Appointment': 'enum.ruleName.scheduled',
  'Minor Patient':         'enum.ruleName.minor',
};
export const ruleDisplayName = (name: string): string => {
  const key = SEED_RULE_NAMES[name];
  return key ? tr(key) : name;
};

// ── listas de opciones para <Select> ──────────────────────────────────────────

interface Opt<T extends string> { value: T; label: string }
const opts = <T extends string>(values: readonly T[], label: (v: T) => string): Opt<T>[] =>
  values.map(value => ({ value, label: label(value) }));

export const statusOptions     = () => opts(TICKET_STATUSES, statusLabel);
export const priorityOptions   = () => opts(PRIORITY_LEVELS, priorityLabel);
export const channelOptions    = () => opts(CHANNELS, channelLabel);
export const roleOptions       = (roles: readonly Role[] = ROLES) => opts(roles, roleLabel);
export const doctorStatusOptions = () => opts(DOCTOR_STATUSES, doctorStatusLabel);
export const docTypeOptions    = () => opts(DOCUMENT_TYPES, docTypeLabel);
export const genderOptions     = () => opts(GENDERS, genderLabel);
export const conditionOptions  = () => opts(RULE_CONDITIONS, conditionLabel);
export const iconOptions       = () => opts(SERVICE_ICONS, iconLabel);

/** Antepone una opción "todos/ninguno" con valor vacío. */
export const withEmpty = <T extends string>(label: string, options: Opt<T>[]): Opt<T | ''>[] =>
  [{ value: '' as const, label }, ...options];
