export type RolUsuario = 'ADMIN' | 'SUPERVISOR' | 'MEDICO' | 'OPERADOR' | 'KIOSKO';
export type EstadoModulo = 'DISPONIBLE' | 'OCUPADO' | 'EN_PAUSA' | 'CERRADO';
export type EstadoTurno = 'EN_ESPERA' | 'LLAMADO' | 'EN_ATENCION' | 'ATENDIDO' | 'NO_ATENDIDO' | 'DERIVADO' | 'CANCELADO';
export type NivelPrioridad = 'NORMAL' | 'PREFERENCIAL' | 'URGENTE';

export interface Servicio {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  prefijo_ticket: string;
  tiempo_estimado_min: number;
  color_hex: string;
  icono: string;
  activo: boolean;
  en_espera?: number;
  en_atencion?: number;
  atendidos_hoy?: number;
}

export interface Modulo {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion?: string;
  servicio_id?: string | null;
  servicio_nombre?: string;
  prefijo_ticket?: string;
  estado: EstadoModulo;
  usuario_actual_id?: string | null;
  usuario_nombre?: string;
  turno_actual_ticket?: string | null;
}

export interface Paciente {
  id: string;
  tipo_documento: 'DNI' | 'CE' | 'PASAPORTE' | 'OTRO';
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero: 'M' | 'F' | 'OTRO';
  telefono?: string;
  es_gestante: boolean;
  es_adulto_mayor: boolean;
  tiene_discapacidad: boolean;
  historia_clinica_his?: string;
}

export interface Cita {
  id: string;
  his_cita_id: string;
  servicio_id: string;
  servicio_nombre?: string;
  profesional_nombre: string;
  consultorio_sugerido?: string;
  fecha_cita: string;
  hora_cita: string;
  estado: string;
}

export interface Turno {
  id: string;
  ticket_codigo: string;
  correlativo_diario: number;
  fecha_emision: string;
  servicio_id: string;
  servicio_nombre?: string;
  modulo_id?: string | null;
  modulo_codigo?: string;
  modulo_nombre?: string;
  paciente_id?: string | null;
  paciente_nombre?: string;
  prioridad_puntos: number;
  nivel_prioridad: NivelPrioridad;
  estado: EstadoTurno;
  timestamp_emision: string;
  timestamp_llamado?: string | null;
  timestamp_inicio_atencion?: string | null;
  timestamp_fin_atencion?: string | null;
  tiempo_espera_segundos?: number | null;
  tiempo_atencion_segundos?: number | null;
  sync_his_status: 'SINCRONIZADO' | 'PENDIENTE' | 'FALLIDO' | 'NO_REQUERIDO';
}

export interface TurnoLlamadoEvent {
  id: string;
  ticket_codigo: string;
  servicio_nombre: string;
  modulo_codigo: string;
  modulo_nombre: string;
  ubicacion?: string;
  paciente_nombre?: string;
  audio_anuncio: string;
  timestamp_llamado: string;
}

export interface ReglaPriorizacion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  condicion_criterio: string;
  parametros: Record<string, any>;
  puntos_prioridad: number;
  tiempo_max_espera_min: number;
  activa: boolean;
  orden_evaluacion: number;
}

export interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  failureThreshold: number;
  lastFailureTime: string | null;
  lastSuccessTime: string | null;
  resetTimeoutMs: number;
  pendingOfflineCount: number;
}
