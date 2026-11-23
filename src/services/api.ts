import type {
  Appointment, AppointmentIngestRequest, CallNextRequest, CircuitBreakerStatus, CompleteAttentionRequest,
  ConsultingRoom, ConsultingRoomRequest, DashboardReport, DeviceAuditEntry, DevicePairResult, DeviceProfile, DeviceProfileRequest, DeviceStatus, DeviceType, DeviceUnlockResult,
  DispenseTicketRequest, Doctor, DoctorRequest,
  DoctorStatus, Empty, EvaluateRequest, EvaluationResult, ISODate, LoginRequest, LoginResponse, MedicalService,
  MedicalServiceRequest, OfflineSyncItem, PageResponse, Patient, PatientRequest, PriorityLevel, PriorityRule,
  PriorityRuleRequest, ReportFilterParams, Specialty, SpecialtyRequest, SyncNowResponse, Ticket,
  TicketReportRow, UUID, User, UserGroup, UserGroupMembership, UserGroupRequest, CreateUserRequest,
  UpdateUserRequest,
} from '../types/api';
import { tr, translateApiMessage } from '../i18n';

const BASE_URL = '/api';

// ── Errores ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Extrae un mensaje legible de cualquier valor capturado en un `catch`. */
export const getErrorMessage = (e: unknown, fallback = tr('errors.unexpected')): string =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : fallback;

// C-03: dispatch event on 401 only when a session existed (token present) — avoids
// redirecting anonymous kiosk users who legitimately have no token
const dispatch401 = () => {
  if (localStorage.getItem('token')) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }
};

/**
 * Formatos de error de los microservicios:
 *  - RFC 7807 ProblemDetail (patient, doctor, queue, priority, appointment, reporting): { detail }
 *  - auth-service: { message } o, en validaciones, { details: { campo: mensaje } }
 */
interface ErrorBody {
  detail?: string;
  message?: string;
  error?: string;
  details?: Record<string, string>;
}

const extractErrorMessage = (b: ErrorBody | null): string | null => {
  if (!b) return null;
  if (b.details && Object.keys(b.details).length > 0) {
    return Object.entries(b.details).map(([field, msg]) => `${field}: ${msg}`).join('; ');
  }
  return b.detail || b.message || b.error || null;
};

/** Convierte un objeto de filtros en query string, omitiendo valores vacíos. */
const toQuery = (obj: object): string =>
  new URLSearchParams(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)] as [string, string])
  ).toString();

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const authHeaders = (withJson: boolean): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/** Lanza ApiError si la respuesta no es 2xx (y notifica 401 si corresponde). */
const ensureOk = async (res: Response): Promise<void> => {
  if (res.status === 401) {
    dispatch401();
    throw new ApiError(tr('errors.session_expired'), 401);
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => null) as ErrorBody | null;
    throw new ApiError(translateApiMessage(extractErrorMessage(errData), res.status), res.status);
  }
};

async function request<T>(
  method: Method, endpoint: string, body?: unknown, extraHeaders?: Record<string, string>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: { ...authHeaders(method !== 'DELETE'), ...(extraHeaders ?? {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(tr('errors.network'), 0);
  }
  await ensureOk(res);
  // 204 No Content / cuerpo vacío → objeto vacío
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** Cliente HTTP base. El tipo de respuesta `T` es obligatorio: no existe un default `any`. */
export const api = {
  get:    <T>(endpoint: string)                   => request<T>('GET', endpoint),
  post:   <T>(endpoint: string, body?: unknown)   => request<T>('POST', endpoint, body),
  put:    <T>(endpoint: string, body?: unknown)   => request<T>('PUT', endpoint, body),
  patch:  <T>(endpoint: string, body?: unknown)   => request<T>('PATCH', endpoint, body),
  delete: <T = Empty>(endpoint: string)           => request<T>('DELETE', endpoint),
  /** Variante con cabeceras extra (p. ej. el token de desbloqueo de dispositivos). */
  withHeaders: <T>(method: Method, endpoint: string, headers: Record<string, string>, body?: unknown) =>
    request<T>(method, endpoint, body, headers),

  // C-04: auth-aware CSV download — never exposes the token in a URL
  async downloadCsv(endpoint: string, filename: string): Promise<void> {
    const res = await fetch(`${BASE_URL}${endpoint}`, { headers: authHeaders(false) });
    if (res.status === 401) { dispatch401(); throw new ApiError(tr('errors.session_expired'), 401); }
    if (!res.ok) throw new ApiError(tr('errors.download'), res.status);
    downloadBlob(await res.blob(), filename);
  },
};

// ---------------------------------------------------------------------------
// Named endpoint helpers (todos con tipos de petición y respuesta)
// ---------------------------------------------------------------------------

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResponse>('/auth/login', body),
  me:    () => api.get<User>('/auth/me'),
};

/** `&serviceIds=a&serviceIds=b` (vacío = sin filtro: todos los servicios). */
const serviceIdsQuery = (ids: UUID[]): string => ids.map(id => `&serviceIds=${encodeURIComponent(id)}`).join('');

export const ticketsApi = {
  /** `deviceToken`: token del kiosko vinculado (el servidor lo exige cuando existen perfiles de kiosko). */
  dispense:  (body: DispenseTicketRequest, deviceToken?: string | null) =>
    deviceToken
      ? api.withHeaders<Ticket>('POST', '/tickets/dispense', { 'X-Device-Token': deviceToken }, body)
      : api.post<Ticket>('/tickets/dispense', body),
  callNext:  (body: CallNextRequest)       => api.post<Ticket>('/tickets/call-next', body),
  recall:           (id: UUID) => api.post<Ticket>(`/tickets/${id}/recall`),
  startAttention:   (id: UUID) => api.post<Ticket>(`/tickets/${id}/start-attention`),
  completeAttention: (id: UUID, notes?: string) => {
    const body: CompleteAttentionRequest = { finalStatus: 'ATTENDED', notes: notes ?? null };
    return api.post<Ticket>(`/tickets/${id}/complete-attention`, body);
  },
  markAbsent: (id: UUID) => {
    const body: CompleteAttentionRequest = { finalStatus: 'NOT_ATTENDED', notes: null };
    return api.post<Ticket>(`/tickets/${id}/complete-attention`, body);
  },
  deriveTicket: (id: UUID, targetServiceId: UUID) =>
    api.post<Ticket>(`/tickets/${id}/derive`, { targetServiceId }),
  lastCalled:   (limit = 6, serviceIds: UUID[] = []) =>
    api.get<Ticket[]>(`/tickets/last-called?limit=${limit}${serviceIdsQuery(serviceIds)}`),
  activeQueue:  (serviceId: UUID) => api.get<Ticket[]>(`/tickets/active-queue?serviceId=${serviceId}`),
  /** Ticket activo del consultorio, o null si no hay (el backend responde cuerpo vacío). */
  currentRoom:  async (consultingRoomId: UUID): Promise<Ticket | null> => {
    const t = await api.get<Ticket | Empty>(`/tickets/current-room?consultingRoomId=${consultingRoomId}`);
    return 'ticketCode' in t ? (t as Ticket) : null;
  },
  waitingQueue: (limit = 20, serviceIds: UUID[] = []) =>
    api.get<Ticket[]>(`/tickets/waiting?limit=${limit}${serviceIdsQuery(serviceIds)}`),
  adminList: (date?: ISODate, page = 0, size = 50) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (date) params.set('date', date);
    return api.get<PageResponse<Ticket>>(`/tickets/admin?${params}`);
  },
  cancel:       (id: UUID) => api.post<Ticket>(`/tickets/${id}/cancel`),
  reprioritize: (id: UUID, priorityLevel: PriorityLevel) =>
    api.put<Ticket>(`/tickets/${id}/reprioritize`, { priorityLevel }),
};

export const appointmentsApi = {
  hisIngest:    (body: AppointmentIngestRequest) => api.post<Appointment>('/appointments/his-ingest', body),
  patientToday: (patientId: UUID) => api.get<Appointment[]>(`/appointments/patient-today?patientId=${patientId}`),
};

export const priorityRulesApi = {
  list:     () => api.get<PriorityRule[]>('/priority-rules'),
  create:   (body: PriorityRuleRequest) => api.post<PriorityRule>('/priority-rules', body),
  update:   (id: UUID, body: PriorityRuleRequest) => api.put<PriorityRule>(`/priority-rules/${id}`, body),
  delete:   (id: UUID) => api.delete(`/priority-rules/${id}`),
  toggle:   (id: UUID) => api.patch<PriorityRule>(`/priority-rules/${id}/toggle`),
  evaluate: (body: EvaluateRequest) => api.post<EvaluationResult>('/priority-rules/evaluate', body),
};

export const reportsApi = {
  /** Rango inclusive [from, to]. Sin parámetros: hoy. Con solo `from`: de `from` hasta hoy. */
  dashboard: (from?: ISODate, to?: ISODate) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to', to);
    const qs = params.toString();
    return api.get<DashboardReport>(`/reports/dashboard${qs ? `?${qs}` : ''}`);
  },
  export: (params: ReportFilterParams) => {
    return api.get<TicketReportRow[]>(`/reports/export?${toQuery({ ...params, format: 'json' })}`);
  },
  // C-04: auth-aware CSV download
  downloadCsv: (params: ReportFilterParams) => {
    return api.downloadCsv(`/reports/export?${toQuery({ ...params, format: 'csv' })}`, 'reporte-turnos.csv');
  },
};

export const circuitBreakerApi = {
  status:  () => api.get<CircuitBreakerStatus>('/circuit-breaker/status'),
  syncNow: () => api.post<SyncNowResponse>('/circuit-breaker/sync-now'),
  offlineItems: () => api.get<OfflineSyncItem[]>('/circuit-breaker/export-offline'),
  /** El endpoint solo devuelve JSON (ignora `format`): el CSV se arma en el cliente. */
  downloadOfflineCsv: async () => {
    const items = await api.get<OfflineSyncItem[]>('/circuit-breaker/export-offline');
    const cols: (keyof OfflineSyncItem)[] = [
      'id', 'entityType', 'operation', 'status', 'attemptCount', 'maxAttempts',
      'nextRetryAt', 'lastError', 'createdAt', 'updatedAt', 'payload',
    ];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...items.map(i => cols.map(c => esc(i[c])).join(','))].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'offline-sync.csv');
  },
};

export const medicalServicesApi = {
  list:         () => api.get<MedicalService[]>('/medical-services'),
  create:       (body: MedicalServiceRequest) => api.post<MedicalService>('/medical-services', body),
  update:       (id: UUID, body: MedicalServiceRequest) => api.put<MedicalService>(`/medical-services/${id}`, body),
  toggleActive: (id: UUID) => api.patch<MedicalService>(`/medical-services/${id}/toggle`),
};

export const consultingRoomsApi = {
  list:         () => api.get<ConsultingRoom[]>('/consulting-rooms'),
  create:       (body: ConsultingRoomRequest) => api.post<ConsultingRoom>('/consulting-rooms', body),
  update:       (id: UUID, body: ConsultingRoomRequest) => api.put<ConsultingRoom>(`/consulting-rooms/${id}`, body),
  toggleActive: (id: UUID) => api.patch<ConsultingRoom>(`/consulting-rooms/${id}/toggle`),
};

const DEVICE_TOKEN_HEADER = 'X-Device-Token';

export const devicesApi = {
  // Públicos (los usa el propio dispositivo)
  status:  () => api.get<DeviceStatus>('/devices/status'),
  unlock:  (pin: string) => api.post<DeviceUnlockResult>('/devices/unlock', { pin }),
  available: (token: string, type: DeviceType) =>
    api.withHeaders<DeviceProfile[]>('GET', `/devices/available-profiles?type=${type}`, { [DEVICE_TOKEN_HEADER]: token }),
  pair: (unlockToken: string, profileId: UUID) =>
    api.withHeaders<DevicePairResult>('POST', '/devices/pair', { [DEVICE_TOKEN_HEADER]: unlockToken }, { profileId }),
  /** Perfil del equipo según su token (devuelve además un token renovado). */
  config:  (deviceToken: string) =>
    api.withHeaders<DevicePairResult>('GET', '/devices/config', { [DEVICE_TOKEN_HEADER]: deviceToken }),
  // Administración
  profiles: () => api.get<DeviceProfile[]>('/devices/profiles'),
  create:   (body: DeviceProfileRequest) => api.post<DeviceProfile>('/devices/profiles', body),
  update:   (id: UUID, body: DeviceProfileRequest) => api.put<DeviceProfile>(`/devices/profiles/${id}`, body),
  remove:   (id: UUID) => api.delete(`/devices/profiles/${id}`),
  setPin:   (pin: string) => api.put<Empty>('/devices/pin', { pin }),
  resetLock: () => api.post<Empty>('/devices/lock/reset'),
  audit:    (limit = 50) => api.get<DeviceAuditEntry[]>(`/devices/audit?limit=${limit}`),
};

export const userGroupsApi = {
  list:         () => api.get<UserGroup[]>('/user-groups'),
  memberships:  () => api.get<UserGroupMembership[]>('/user-groups/memberships'),
  create:       (body: UserGroupRequest) => api.post<UserGroup>('/user-groups', body),
  update:       (id: UUID, body: UserGroupRequest) => api.put<UserGroup>(`/user-groups/${id}`, body),
  toggleActive: (id: UUID) => api.patch<UserGroup>(`/user-groups/${id}/toggle`),
  remove:       (id: UUID) => api.delete(`/user-groups/${id}`),
  /** Reemplaza los servicios que atiende el grupo. */
  setServices:  (id: UUID, serviceIds: UUID[]) => api.put<UserGroup>(`/user-groups/${id}/services`, { serviceIds }),
  members:      (id: UUID) => api.get<User[]>(`/user-groups/${id}/members`),
  addMember:    (id: UUID, userId: UUID) => api.put<Empty>(`/user-groups/${id}/members/${userId}`),
  removeMember: (id: UUID, userId: UUID) => api.delete(`/user-groups/${id}/members/${userId}`),
};

export const usersApi = {
  list: (page = 0, size = 20, groupId?: UUID) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (groupId) params.set('groupId', groupId);
    return api.get<PageResponse<User>>(`/users?${params}`);
  },
  create:        (body: CreateUserRequest) => api.post<User>('/users', body),
  update:        (id: UUID, body: UpdateUserRequest) => api.put<User>(`/users/${id}`, body),
  toggleActive:  (id: UUID) => api.patch<User>(`/users/${id}/toggle`),
  resetPassword: (id: UUID, newPassword: string) => api.post<Empty>(`/users/${id}/reset-password`, { newPassword }),
};

export const patientsApi = {
  list: (page = 0, size = 20) => api.get<PageResponse<Patient>>(`/patients?page=${page}&size=${size}`),
  search: (documentType: string, documentNumber: string) =>
    api.get<Patient>(
      `/patients/search?documentType=${encodeURIComponent(documentType)}&documentNumber=${encodeURIComponent(documentNumber)}`
    ),
  create: (body: PatientRequest) => api.post<Patient>('/patients', body),
  update: (id: UUID, body: PatientRequest) => api.put<Patient>(`/patients/${id}`, body),
};

export const doctorsApi = {
  list: (status?: DoctorStatus, page = 0, size = 50) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set('status', status);
    return api.get<PageResponse<Doctor>>(`/doctors?${params}`);
  },
  findById:     (id: UUID) => api.get<Doctor>(`/doctors/${id}`),
  bySpecialty:  (specialtyId: UUID) => api.get<Doctor[]>(`/doctors/by-specialty/${specialtyId}`),
  create:       (body: DoctorRequest) => api.post<Doctor>('/doctors', body),
  update:       (id: UUID, body: DoctorRequest) => api.put<Doctor>(`/doctors/${id}`, body),
  updateStatus: (id: UUID, status: DoctorStatus) => api.patch<Doctor>(`/doctors/${id}/status`, { status }),
};

export const specialtiesApi = {
  list:     () => api.get<Specialty[]>('/specialties'),
  findById: (id: UUID) => api.get<Specialty>(`/specialties/${id}`),
  create:   (body: SpecialtyRequest) => api.post<Specialty>('/specialties', body),
};
