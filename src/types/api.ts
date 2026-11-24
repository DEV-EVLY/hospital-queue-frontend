/**
 * Contratos del API (reflejan los DTOs de los microservicios).
 * Fechas/horas llegan como string ISO-8601; los UUID como string.
 */

export type UUID = string;
/** yyyy-MM-dd */
export type ISODate = string;
/** ISO-8601 instant, p. ej. 2026-11-18T13:24:03Z */
export type ISODateTime = string;

// ── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'SUPERVISOR' | 'DOCTOR' | 'OPERATOR' | 'KIOSK';
export type TicketStatus =
  | 'WAITING' | 'CALLED' | 'IN_ATTENTION' | 'ATTENDED' | 'NOT_ATTENDED' | 'REFERRED' | 'CANCELLED';
export type PriorityLevel = 'NORMAL' | 'PREFERENTIAL' | 'URGENT';
export type IssuanceChannel = 'KIOSK' | 'OPERATOR' | 'WEB' | 'HIS_AUTO';
export type HisSyncStatus = 'SYNCED' | 'PENDING' | 'FAILED' | 'NOT_REQUIRED';
export type DocumentType = 'DNI' | 'PASSPORT' | 'FOREIGN_ID' | 'OTHER';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type DoctorStatus = 'AVAILABLE' | 'BUSY' | 'ON_LEAVE' | 'OFF_DUTY';
export type ConsultingRoomStatus = 'AVAILABLE' | 'BUSY' | 'PAUSED' | 'CLOSED';
export type RuleCondition =
  | 'PREGNANT' | 'ELDERLY' | 'DISABILITY' | 'SCHEDULED_APPOINTMENT' | 'URGENT_TRIAGE' | 'MINOR_AGE' | 'CUSTOM';
export type AppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'IN_QUEUE' | 'ATTENDED' | 'NOT_ATTENDED' | 'RESCHEDULED' | 'CANCELLED';
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// ── Genéricos ────────────────────────────────────────────────────────────────

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
}

/** Respuestas sin cuerpo (204 No Content) */
export type Empty = Record<string, never>;

// ── Auth / Usuarios ──────────────────────────────────────────────────────────

export interface LoginRequest { username: string; password: string }
export interface LoginResponse {
  token: string;
  userId: UUID;
  username: string;
  fullName: string;
  role: Role;
  /** Servicios que puede atender; null = sin restricción (ADMIN / SUPERVISOR). */
  serviceIds: UUID[] | null;
}

export interface User {
  id: UUID;
  username: string;
  fullName: string;
  role: Role;
  active: boolean;
  lastAccess: ISODateTime | null;
}
export interface CreateUserRequest { username: string; fullName: string; password: string; role: Role }
export interface UpdateUserRequest { fullName: string; role: Role }

// ── Grupos de usuarios ───────────────────────────────────────────────────────

export interface UserGroup {
  id: UUID;
  code: string;
  name: string;
  description: string | null;
  parentId: UUID | null;
  active: boolean;
  /** Solo miembros directos (no incluye subgrupos) */
  memberCount: number;
  /** Servicios médicos que atiende el grupo (un subgrupo solo puede elegir entre los de su padre) */
  serviceIds: UUID[];
  createdAt: ISODateTime;
}
/** `code` es obligatorio al crear y se ignora al editar */
export interface UserGroupRequest {
  code?: string;
  name: string;
  description: string | null;
  parentId: UUID | null;
}
export interface UserGroupMembership { groupId: UUID; userId: UUID }

// ── Pacientes ────────────────────────────────────────────────────────────────

export interface Patient {
  id: UUID;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: ISODate | null;
  age: number;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  isPregnant: boolean;
  isElderly: boolean;
  hasDisability: boolean;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
export interface PatientRequest {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate?: ISODate | null;
  gender?: Gender | null;
  phone?: string | null;
  email?: string | null;
  isPregnant?: boolean;
  hasDisability?: boolean;
  active?: boolean;
}

// ── Médicos / Especialidades ─────────────────────────────────────────────────

export interface Specialty {
  id: UUID;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: ISODateTime;
}
export interface SpecialtyRequest { code: string; name: string; description?: string | null }

export interface Doctor {
  id: UUID;
  licenseNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  specialtyId: UUID | null;
  phone: string | null;
  email: string | null;
  status: DoctorStatus;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
export interface DoctorRequest {
  licenseNumber: string;
  firstName: string;
  lastName: string;
  /** Obligatorio en el backend (@NotNull) */
  specialtyId: UUID;
  /** 7-15 caracteres entre [0-9+-], sin espacios; null si no hay */
  phone?: string | null;
  email?: string | null;
  /** Opcional: si se omite, el médico conserva su estado actual */
  active?: boolean;
}

// ── Catálogo (queue-service) ─────────────────────────────────────────────────

export interface MedicalService {
  id: UUID;
  code: string;
  name: string;
  ticketPrefix: string;
  estimatedMinutes: number;
  colorHex: string | null;
  iconName: string | null;
  active: boolean;
}
/** `code`, `colorHex` y `active` son opcionales: el backend conserva el valor existente */
export interface MedicalServiceRequest {
  code?: string;
  name: string;
  ticketPrefix: string;
  estimatedMinutes: number;
  colorHex?: string | null;
  iconName?: string | null;
  active?: boolean;
}

export interface ConsultingRoom {
  id: UUID;
  code: string;
  name: string;
  medicalServiceId: UUID | null;
  currentOperatorId: UUID | null;
  status: ConsultingRoomStatus;
  location: string | null;
}
export interface ConsultingRoomRequest {
  code: string;
  name: string;
  medicalServiceId: UUID | null;
  location?: string | null;
}

// ── Tickets ──────────────────────────────────────────────────────────────────

export interface Ticket {
  id: UUID;
  ticketCode: string;
  dailySequence: number;
  patientId: UUID | null;
  appointmentId: UUID | null;
  medicalServiceId: UUID;
  consultingRoomId: UUID | null;
  operatorId: UUID | null;
  status: TicketStatus;
  priorityLevel: PriorityLevel;
  priorityPoints: number;
  appliedRules: string[];
  channel: IssuanceChannel;
  hisSyncStatus: HisSyncStatus;
  issuedAt: ISODateTime;
  calledAt: ISODateTime | null;
  attentionStartedAt: ISODateTime | null;
  attentionEndedAt: ISODateTime | null;
  waitTimeSeconds: number | null;
  attentionTimeSeconds: number | null;
  completionNotes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface DispenseTicketRequest {
  patientId?: UUID | null;
  medicalServiceId: UUID;
  appointmentId?: UUID | null;
  channel: IssuanceChannel;
  pregnant?: boolean;
  elderly?: boolean;
  disability?: boolean;
}
export interface CallNextRequest { medicalServiceId: UUID; consultingRoomId: UUID; operatorId: UUID }
export interface CompleteAttentionRequest { finalStatus: TicketStatus; notes: string | null }

// ── Citas ────────────────────────────────────────────────────────────────────

export interface Appointment {
  id: UUID;
  hisAppointmentId: string;
  patientId: UUID;
  medicalServiceId: UUID;
  status: AppointmentStatus;
  appointmentDate: ISODate;
  /** HH:mm:ss */
  appointmentTime: string;
  doctorName: string | null;
  suggestedRoomCode: string | null;
  hisMetadata: string | null;
  scheduledForToday: boolean;
  canBeQueued: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
export interface AppointmentIngestRequest {
  hisAppointmentId: string;
  patientId: UUID;
  medicalServiceId: UUID;
  status?: AppointmentStatus;
  appointmentDate: ISODate;
  appointmentTime: string;
  doctorName?: string | null;
  suggestedRoomCode?: string | null;
  hisMetadata?: string | null;
}

// ── Reglas de prioridad ──────────────────────────────────────────────────────

export interface RuleParameters {
  ageThreshold: number | null;
  toleranceWindowMin: number | null;
  customConditionExpr: string | null;
}
export interface PriorityRule {
  id: UUID;
  name: string;
  condition: RuleCondition;
  priorityPoints: number;
  resultLevel: PriorityLevel;
  maxWaitMinutes: number;
  parameters: RuleParameters | null;
  evaluationOrder: number;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
export interface PriorityRuleRequest {
  name: string;
  condition: RuleCondition;
  priorityPoints: number;
  resultLevel: PriorityLevel;
  maxWaitMinutes: number;
  evaluationOrder: number;
  parameters: RuleParameters;
}
export interface EvaluateRequest {
  ticketId: UUID;
  isPregnant: boolean;
  isElderly: boolean;
  hasDisability: boolean;
  hasScheduledAppointment: boolean;
  isUrgentTriage: boolean;
  patientAge: number;
  medicalServiceCode: string;
}
export interface EvaluationResult {
  ticketId: UUID;
  totalPoints: number;
  priorityLevel: PriorityLevel;
  appliedRules: string[];
}

// ── Reportes ─────────────────────────────────────────────────────────────────

export interface ServiceBreakdown {
  serviceCode: string;
  serviceName: string;
  totalTickets: number;
  waiting: number;
  inAttention: number;
  attended: number;
  avgWaitMinutes: number;
  avgAttentionMinutes: number;
}
export interface DashboardReport {
  /** Total de turnos del rango consultado */
  totalTicketsToday: number;
  waitingCount: number;
  inAttentionCount: number;
  attendedCount: number;
  notAttendedCount: number;
  avgWaitTimeMinutes: number;
  avgAttentionTimeMinutes: number;
  serviceBreakdown: ServiceBreakdown[];
  priorityDistribution: Record<string, number>;
  /** hora (0-23, hora local) → cantidad de turnos */
  hourlyDemand: Record<string, number>;
  /** Espera por hora de emisión (solo turnos con espera conocida) */
  waitByHour: HourWait[];
  /** Espera por servicio y hora de emisión: base del mapa de calor */
  waitByServiceHour: ServiceHourWait[];
}
export interface HourWait { hour: number; tickets: number; avgWaitMinutes: number; maxWaitMinutes: number }
export interface ServiceHourWait extends HourWait { serviceCode: string; serviceName: string }
export interface ReportFilterParams {
  startDate: ISODate;
  endDate: ISODate;
  serviceId?: UUID;
  priorityLevel?: PriorityLevel;
  channel?: IssuanceChannel;
}
export interface TicketReportRow {
  id: UUID;
  ticketCode: string;
  patientId: UUID | null;
  medicalServiceId: UUID | null;
  medicalServiceCode: string | null;
  medicalServiceName: string | null;
  status: TicketStatus;
  priorityLevel: PriorityLevel;
  priorityPoints: number;
  channel: IssuanceChannel;
  issuedAt: ISODateTime | null;
  calledAt: ISODateTime | null;
  attentionStartedAt: ISODateTime | null;
  attentionEndedAt: ISODateTime | null;
  waitTimeSeconds: number | null;
  attentionTimeSeconds: number | null;
  reportDate: ISODate;
}

// ── Integración / Resiliencia ────────────────────────────────────────────────

export type SyncStatus = 'PENDING' | 'RETRYING' | 'SUCCEEDED' | 'PERMANENTLY_FAILED';

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  failureThreshold: number;
  resetTimeoutMs: number;
  /** Hasta cuándo permanece abierto el circuito; null si no está abierto */
  openUntil: ISODateTime | null;
}
export interface SyncNowResponse { status: string }

export interface OfflineSyncItem {
  id: UUID;
  entityType: string;
  operation: string;
  payload: string;
  status: SyncStatus;
  maxAttempts: number;
  attemptCount: number;
  nextRetryAt: ISODateTime | null;
  lastError: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ── Dispositivos (kioskos y carteleras) ──────────────────────────────────────

export type DeviceType = 'KIOSK' | 'DISPLAY';
export type DeviceAuditEvent =
  | 'PIN_CHANGED' | 'PIN_FAILED' | 'PIN_LOCKED' | 'PIN_LOCK_RESET' | 'DEVICE_PAIRED' | 'PROFILE_CHANGED';

export interface DeviceProfile {
  id: UUID;
  name: string;
  type: DeviceType;
  /** Código de idioma (es, en, de, pt, it, qu). */
  language: string;
  active: boolean;
  /** Vacío = todos los servicios. */
  serviceIds: UUID[];
}
export interface DeviceProfileRequest {
  name: string;
  type: DeviceType;
  language: string;
  active: boolean;
  serviceIds: UUID[];
}
export interface DeviceStatus { pinConfigured: boolean; locked: boolean; kioskProfiles: number; displayProfiles: number }
/** Perfil + token que acredita ante el servidor que el equipo está vinculado a él. */
export interface DevicePairResult { profile: DeviceProfile; token: string }
export interface DeviceUnlockResult { token: string; expiresInSeconds: number }
export interface DeviceAuditEntry {
  id: UUID;
  event: DeviceAuditEvent;
  profileId: UUID | null;
  profileName: string | null;
  detail: string | null;
  createdAt: ISODateTime;
}
