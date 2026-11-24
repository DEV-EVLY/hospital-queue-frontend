import { useCallback, useState } from 'react';
import { ApiError, appointmentsApi, getErrorMessage, patientsApi, ticketsApi } from '../../services/api';
import type { Appointment, DeviceProfile, MedicalService, Patient, Ticket } from '../../types/api';
import { tr } from '../../i18n';
import {
  MAX_DOCUMENT_DIGITS, MIN_DOCUMENT_DIGITS, NO_CONDITIONS,
  type ConditionKey, type Conditions, type Direction, type Step,
} from './types';
import { useKioskServices } from './useKioskServices';
import { useTicketCountdown } from './useTicketCountdown';

export interface KioskFlow {
  step: Step;
  direction: Direction;
  dni: string;
  services: MedicalService[];
  selectedAppointment: Appointment | null;
  selectedService: MedicalService | null;
  conditions: Conditions;
  issuedTicket: Ticket | null;
  issuedService: MedicalService | null;
  countdown: number;
  loading: boolean;
  errorMsg: string | null;
  registryWarning: string | null;
  welcomeName: string | null;

  setDni: (value: string) => void;
  pressDigit: (digit: string) => void;
  backspace: () => void;
  clearDni: () => void;
  toggleCondition: (key: ConditionKey) => void;
  searchDocument: () => Promise<void>;
  continueAsGuest: () => void;
  backToStart: () => void;
  backToServices: () => void;
  selectService: (service: MedicalService) => void;
  issueForAppointment: () => Promise<void>;
  issueForService: () => Promise<void>;
  extendCountdown: () => void;
  reset: () => void;
}

/**
 * Flujo del paciente en el kiosko: documento → (citas) → servicios → condiciones → ticket.
 * Las pantallas solo pintan cada paso; el estado y las llamadas al servidor viven aquí.
 */
export function useKioskFlow(profile: DeviceProfile | null, deviceToken: string | null): KioskFlow {
  const [step, setStep]           = useState<Step>('DOCUMENTO');
  const [direction, setDirection] = useState<Direction>(1);

  const [dni, setDniState]                = useState('');
  const [patient, setPatient]             = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedService, setSelectedService]         = useState<MedicalService | null>(null);
  const [conditions, setConditions]       = useState<Conditions>(NO_CONDITIONS);
  const [issuedTicket, setIssuedTicket]   = useState<Ticket | null>(null);
  const [issuedService, setIssuedService] = useState<MedicalService | null>(null);

  const [loading, setLoading]                 = useState(false);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);
  const [registryWarning, setRegistryWarning] = useState<string | null>(null);
  const [welcomeName, setWelcomeName]         = useState<string | null>(null);

  const services = useKioskServices(profile, () => setErrorMsg(tr('kiosk.no_se_pudieron_cargar_servicios')));

  const goTo = (next: Step, dir: Direction = 1) => { setDirection(dir); setStep(next); };

  const reset = () => {
    setDniState('');
    setPatient(null);
    setSelectedAppointment(null);
    setSelectedService(null);
    setConditions(NO_CONDITIONS);
    setIssuedTicket(null);
    setIssuedService(null);
    setErrorMsg(null);
    setRegistryWarning(null);
    setWelcomeName(null);
    countdown.restart();
    setDirection(1);
    setStep('DOCUMENTO');
  };

  const countdown = useTicketCountdown(step === 'TICKET_EMITIDO', reset);

  // ── Documento ──────────────────────────────────────────────────────────────
  const setDni = useCallback((value: string) => {
    setErrorMsg(null);
    setDniState(value.replace(/\D/g, '').slice(0, MAX_DOCUMENT_DIGITS));
  }, []);
  const pressDigit = (digit: string) => {
    setErrorMsg(null);
    if (dni.length < MAX_DOCUMENT_DIGITS) setDniState(prev => prev + digit);
  };
  const backspace = () => setDniState(prev => prev.slice(0, -1));
  const clearDni  = () => { setErrorMsg(null); setDniState(''); };

  const toggleCondition = (key: ConditionKey) => setConditions(prev => ({ ...prev, [key]: !prev[key] }));

  /** Busca al paciente por documento y sus citas de hoy; sin citas viables va al catálogo de servicios. */
  const searchDocument = async () => {
    if (!dni || dni.length < MIN_DOCUMENT_DIGITS) {
      setErrorMsg(tr('kiosk.por_favor_ingresa_numero_documento'));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setRegistryWarning(null);
    setWelcomeName(null);
    try {
      let found: Patient | null = null;
      try {
        found = await patientsApi.search('DNI', dni);
        setPatient(found);
        setWelcomeName(`${found.firstName} ${found.lastName}`.trim());
        // Las condiciones registradas del paciente quedan marcadas de antemano
        setConditions(prev => ({
          pregnant:   prev.pregnant   || !!found?.isPregnant,
          elderly:    prev.elderly    || !!found?.isElderly,
          disability: prev.disability || !!found?.hasDisability,
        }));
      } catch (searchErr: unknown) {
        // 404 = documento no registrado (visitante): no es un error que mostrar
        const notRegistered = searchErr instanceof ApiError && searchErr.status === 404;
        if (!notRegistered) setRegistryWarning(tr('kiosk.no_pudimos_verificar_tu_documento'));
      }

      if (found?.id) {
        try {
          const appointments = await appointmentsApi.patientToday(found.id);
          const viable = Array.isArray(appointments) ? appointments.filter(a => a.canBeQueued) : [];
          if (viable.length > 0) {
            setSelectedAppointment(viable[0]);
            goTo('CITAS_ENCONTRADAS', 1);
            return;
          }
        } catch { /* sin citas: se sigue al catálogo de servicios */ }
      }
      goTo('SERVICIOS', 1);
    } finally {
      setLoading(false);
    }
  };

  // ── Navegación entre pasos ─────────────────────────────────────────────────
  const continueAsGuest = () => { setErrorMsg(null); goTo('SERVICIOS', 1); };
  const backToStart     = () => { setErrorMsg(null); setRegistryWarning(null); goTo('DOCUMENTO', -1); };
  const backToServices  = () => { setErrorMsg(null); goTo('SERVICIOS', -1); };
  const selectService   = (service: MedicalService) => { setSelectedService(service); goTo('CONDICIONES', 1); };

  // ── Emisión ────────────────────────────────────────────────────────────────
  const dispense = async (serviceId: string, appointmentId?: string) => {
    const ticket = await ticketsApi.dispense({
      medicalServiceId: serviceId,
      ...(patient?.id   ? { patientId: patient.id }          : {}),
      ...(appointmentId ? { appointmentId }                  : {}),
      channel: 'KIOSK',
      pregnant:   conditions.pregnant,
      elderly:    conditions.elderly,
      disability: conditions.disability,
    }, deviceToken);
    setIssuedTicket(ticket);
    setIssuedService(services.find(s => s.id === serviceId) ?? null);
    countdown.restart();
    goTo('TICKET_EMITIDO', 1);
  };

  /** Ejecuta la emisión mostrando "cargando" y el error en el idioma del kiosko. */
  const issue = async (serviceId: string, appointmentId?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await dispense(serviceId, appointmentId);
    } catch (e: unknown) {
      setErrorMsg(tr('kiosk.no_se_pudo_generar_turno', { error: getErrorMessage(e) }));
    } finally {
      setLoading(false);
    }
  };

  const issueForAppointment = async () => {
    if (selectedAppointment) await issue(selectedAppointment.medicalServiceId, selectedAppointment.id);
  };
  const issueForService = async () => {
    if (selectedService) await issue(selectedService.id);
  };

  return {
    step, direction, dni, services, selectedAppointment, selectedService, conditions,
    issuedTicket, issuedService, countdown: countdown.countdown, loading, errorMsg, registryWarning, welcomeName,
    setDni, pressDigit, backspace, clearDni, toggleCondition, searchDocument,
    continueAsGuest, backToStart, backToServices, selectService, issueForAppointment, issueForService,
    extendCountdown: countdown.extend, reset,
  };
}
