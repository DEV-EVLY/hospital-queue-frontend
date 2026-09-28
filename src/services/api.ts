const BASE_URL = '/api';

// C-03: dispatch event on 401 only when a session existed (token present) — avoids
// redirecting anonymous kiosk users who legitimately have no token
const dispatch401 = () => {
  if (localStorage.getItem('token')) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }
};

export const api = {
  async get<T = any>(endpoint: string): Promise<T> {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (res.status === 401) { dispatch401(); throw new Error('Sesión expirada. Vuelve a iniciar sesión.'); }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errData.message || 'Error en la petición');
    }
    return await res.json();
  },

  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) { dispatch401(); throw new Error('Sesión expirada. Vuelve a iniciar sesión.'); }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errData.message || 'Error en la petición');
    }
    return await res.json();
  },

  async put<T = any>(endpoint: string, body?: any): Promise<T> {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) { dispatch401(); throw new Error('Sesión expirada. Vuelve a iniciar sesión.'); }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errData.message || 'Error en la petición');
    }
    return await res.json();
  },

  async patch<T = any>(endpoint: string, body?: any): Promise<T> {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) { dispatch401(); throw new Error('Sesión expirada. Vuelve a iniciar sesión.'); }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errData.message || 'Error en la petición');
    }
    const text = await res.text();
    return text ? JSON.parse(text) : ({} as T);
  },

  async delete<T = any>(endpoint: string): Promise<T> {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (res.status === 401) { dispatch401(); throw new Error('Sesión expirada. Vuelve a iniciar sesión.'); }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errData.message || 'Error en la petición');
    }
    const text = await res.text();
    return text ? JSON.parse(text) : ({} as T);
  },

  // C-04: auth-aware CSV download — never exposes the token in a URL
  async downloadCsv(endpoint: string, filename: string): Promise<void> {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (res.status === 401) { dispatch401(); throw new Error('Sesión expirada. Vuelve a iniciar sesión.'); }
    if (!res.ok) throw new Error('Error al descargar archivo');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// ---------------------------------------------------------------------------
// Named endpoint helpers
// ---------------------------------------------------------------------------

export const authApi = {
  login: (body: { username: string; password: string }) =>
    api.post('/auth/login', body),
  me: () => api.get('/auth/me')
};

export const ticketsApi = {
  dispense: (body: any) =>
    api.post('/tickets/dispense', body),
  callNext: (body: any) =>
    api.post('/tickets/call-next', body),
  recall: (id: string | number) =>
    api.post(`/tickets/${id}/recall`),
  startAttention: (id: string | number) =>
    api.post(`/tickets/${id}/start-attention`),
  completeAttention: (id: string | number, notes?: string) =>
    api.post(`/tickets/${id}/complete-attention`, { finalStatus: 'ATTENDED', notes: notes ?? null }),
  markAbsent: (id: string | number) =>
    api.post(`/tickets/${id}/complete-attention`, { finalStatus: 'NOT_ATTENDED', notes: null }),
  deriveTicket: (id: string | number, targetServiceId: string) =>
    api.post(`/tickets/${id}/derive`, { targetServiceId }),
  lastCalled: (limit = 6) =>
    api.get(`/tickets/last-called?limit=${limit}`),
  activeQueue: (serviceId: string | number) =>
    api.get(`/tickets/active-queue?serviceId=${serviceId}`),
  currentRoom: (consultingRoomId: string) =>
    api.get(`/tickets/current-room?consultingRoomId=${consultingRoomId}`)
};

export const appointmentsApi = {
  hisIngest: (body: any) =>
    api.post('/appointments/his-ingest', body),
  patientToday: (patientId: string | number) =>
    api.get(`/appointments/patient-today?patientId=${patientId}`)
};

export const priorityRulesApi = {
  list: () => api.get('/priority-rules'),
  create: (body: any) => api.post('/priority-rules', body),
  update: (id: string | number, body: any) => api.put(`/priority-rules/${id}`, body),
  delete: (id: string | number) => api.delete(`/priority-rules/${id}`),
  toggle: (id: string | number) => api.patch(`/priority-rules/${id}/toggle`),
  evaluate: (body: any) => api.post('/priority-rules/evaluate', body)
};

export const reportsApi = {
  dashboard: (date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return api.get(`/reports/dashboard${qs}`);
  },
  export: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get(`/reports/export${qs}`);
  },
  // C-04: auth-aware CSV download
  downloadCsv: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams({ ...params, format: 'csv' }).toString() : '?format=csv';
    return api.downloadCsv(`/reports/export${qs}`, 'reporte-turnos.csv');
  }
};

export const circuitBreakerApi = {
  status: () => api.get('/circuit-breaker/status'),
  syncNow: () => api.post('/circuit-breaker/sync-now'),
  // C-04: auth-aware offline export
  downloadOfflineCsv: () =>
    api.downloadCsv('/circuit-breaker/export-offline?format=csv', 'offline-sync.csv')
};

export const medicalServicesApi = {
  list: () => api.get('/medical-services'),
  create: (body: any) => api.post('/medical-services', body),
  update: (id: string | number, body: any) => api.put(`/medical-services/${id}`, body),
  toggleActive: (id: string | number) => api.patch(`/medical-services/${id}/toggle`),
};

export const consultingRoomsApi = {
  list: () => api.get('/consulting-rooms'),
  create: (body: any) => api.post('/consulting-rooms', body),
  update: (id: string | number, body: any) => api.put(`/consulting-rooms/${id}`, body),
  toggleActive: (id: string | number) => api.patch(`/consulting-rooms/${id}/toggle`),
};

export const usersApi = {
  list: () => api.get('/users'),
  create: (body: any) => api.post('/users', body),
  update: (id: string | number, body: any) => api.put(`/users/${id}`, body),
  toggleActive: (id: string | number) => api.patch(`/users/${id}/toggle`),
  resetPassword: (id: string | number, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
};

export const patientsApi = {
  search: (documentType: string, documentNumber: string) =>
    api.get(
      `/patients/search?documentType=${encodeURIComponent(documentType)}&documentNumber=${encodeURIComponent(documentNumber)}`
    )
};

export const doctorsApi = {
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return api.get(`/doctors${qs}`);
  },
  findById: (id: string) => api.get(`/doctors/${id}`),
  bySpecialty: (specialtyId: string) => api.get(`/doctors/by-specialty/${specialtyId}`),
  create: (body: any) => api.post('/doctors', body),
  update: (id: string, body: any) => api.put(`/doctors/${id}`, body),
  updateStatus: (id: string, status: string) => api.patch(`/doctors/${id}/status`, { status })
};

export const specialtiesApi = {
  list: () => api.get('/specialties'),
  findById: (id: string) => api.get(`/specialties/${id}`)
};
