import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { medicalServicesApi, patientsApi, appointmentsApi, ticketsApi } from '../../services/api';
import { translations, SupportedLanguage } from '../../locales/i18n';
import { Button, Card, Spinner } from '../ui';
import {
  Activity, AlertCircle, AlertTriangle, Baby, CheckCircle2,
  FlaskConical, Heart, Info, Printer, SmilePlus, Stethoscope,
  UserCheck, Volume2,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'DOCUMENTO' | 'CITAS_ENCONTRADAS' | 'SERVICIOS' | 'CONDICIONES' | 'TICKET_EMITIDO';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  'alert-circle':   <AlertCircle   className="w-10 h-10 text-rose-500" />,
  'alert-triangle': <AlertTriangle className="w-10 h-10 text-rose-500" />,
  'activity':       <Activity      className="w-10 h-10 text-rose-500" />,
  'stethoscope':    <Stethoscope   className="w-10 h-10 text-primary-600" />,
  'baby':           <Baby          className="w-10 h-10 text-emerald-500" />,
  'heart':          <Heart         className="w-10 h-10 text-pink-500" />,
  'flask-conical':  <FlaskConical  className="w-10 h-10 text-amber-500" />,
  'flask':          <FlaskConical  className="w-10 h-10 text-amber-500" />,
  'smile':          <SmilePlus     className="w-10 h-10 text-violet-500" />,
};

const getServiceIcon = (iconName: string): React.ReactNode =>
  SERVICE_ICONS[iconName] ?? <Activity className="w-10 h-10 text-surface-400" />;

// ─── Priority helpers ─────────────────────────────────────────────────────────

const priorityLabel = (level: string, t: Record<string, string>) => {
  if (level === 'URGENT')       return t.priority_urgent;
  if (level === 'PREFERENTIAL') return t.priority_preferential;
  return t.priority_normal;
};

const priorityClasses = (level: string) => {
  if (level === 'URGENT')       return 'bg-red-100 text-red-700 border border-red-200';
  if (level === 'PREFERENTIAL') return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-primary-50 text-primary-700 border border-primary-100';
};

// ─── Motion variants ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 40 : -40,
  }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -40 : 40,
  }),
};

const transition = { type: 'tween', duration: 0.22, ease: 'easeOut' };

// ─── Component ────────────────────────────────────────────────────────────────

export const KioskoDispensador: React.FC = () => {
  // Language
  const [lang, setLang] = useState<SupportedLanguage>('es');
  const t = translations[lang];

  // Step flow
  const [step, setStep]         = useState<Step>('DOCUMENTO');
  const [direction, setDirection] = useState<1 | -1>(1);

  const goTo = (next: Step, dir: 1 | -1 = 1) => {
    setDirection(dir);
    setStep(next);
  };

  // Form state
  const [dni, setDni]                           = useState('');
  const [services, setServices]                 = useState<any[]>([]);
  const [patient, setPatient]                   = useState<any | null>(null);
  const [appointments, setAppointments]         = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [selectedService, setSelectedService]   = useState<any | null>(null);

  const [esGestante, setEsGestante]               = useState(false);
  const [esAdultoMayor, setEsAdultoMayor]         = useState(false);
  const [tieneDiscapacidad, setTieneDiscapacidad] = useState(false);

  const [issuedTicket, setIssuedTicket]   = useState<any | null>(null);
  const [issuedService, setIssuedService] = useState<any | null>(null);

  // UI feedback
  const [countdown, setCountdown]           = useState(20);
  const [loading, setLoading]               = useState(false);
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const [registryWarning, setRegistryWarning] = useState<string | null>(null);
  const [welcomeName, setWelcomeName]       = useState<string | null>(null);

  // Barcode ref
  const barcodeRef = useRef<SVGSVGElement>(null);

  // ─── Load services on mount ─────────────────────────────────────────────────
  useEffect(() => {
    medicalServicesApi.list()
      .then(d => setServices((d as any[]).filter(s => s.active)))
      .catch(() =>
        setErrorMsg('No se pudieron cargar los servicios. Por favor espera un momento y vuelve a intentar.')
      );
  }, []);

  // ─── Auto-reset countdown ───────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === 'TICKET_EMITIDO' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (step === 'TICKET_EMITIDO' && countdown === 0) {
      resetKiosk();
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // ─── Generate barcode ───────────────────────────────────────────────────────
  useEffect(() => {
    if (step === 'TICKET_EMITIDO' && barcodeRef.current && issuedTicket?.ticketCode) {
      try {
        JsBarcode(barcodeRef.current, issuedTicket.ticketCode, {
          format: 'CODE128',
          width: 2,
          height: 44,
          displayValue: false,
          background: '#ffffff',
          lineColor: '#1e293b',
          margin: 6,
        });
      } catch {
        /* unsupported value — leave empty */
      }
    }
  }, [step, issuedTicket]);

  // ─── Reset kiosk ────────────────────────────────────────────────────────────
  const resetKiosk = () => {
    setDni('');
    setPatient(null);
    setAppointments([]);
    setSelectedAppointment(null);
    setSelectedService(null);
    setEsGestante(false);
    setEsAdultoMayor(false);
    setTieneDiscapacidad(false);
    setIssuedTicket(null);
    setIssuedService(null);
    setErrorMsg(null);
    setRegistryWarning(null);
    setWelcomeName(null);
    setCountdown(20);
    setDirection(1);
    setStep('DOCUMENTO');
  };

  // ─── DNI continue ───────────────────────────────────────────────────────────
  const handleContinuarDni = async () => {
    if (!dni || dni.length < 8) {
      setErrorMsg('Por favor ingresa un número de documento válido (mínimo 8 dígitos).');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setRegistryWarning(null);
    setWelcomeName(null);

    try {
      let foundPatient: any = null;
      try {
        foundPatient = await patientsApi.search('DNI', dni) as any;
        setPatient(foundPatient);
        if (foundPatient?.fullName) setWelcomeName(foundPatient.fullName);
        if (foundPatient?.conditions) {
          if (foundPatient.conditions.includes('PREGNANT'))   setEsGestante(true);
          if (foundPatient.conditions.includes('ELDERLY'))    setEsAdultoMayor(true);
          if (foundPatient.conditions.includes('DISABILITY')) setTieneDiscapacidad(true);
        }
      } catch (searchErr: any) {
        const is404 =
          searchErr?.message?.includes('404') ||
          searchErr?.message?.toLowerCase().includes('not found');
        if (!is404) {
          setRegistryWarning(
            'No pudimos verificar tu documento en el sistema. Tu turno será como visitante. Si tienes cita, acércate a admisión.'
          );
        }
      }

      if (foundPatient?.id) {
        try {
          const appts = await appointmentsApi.patientToday(foundPatient.id) as any[];
          const viable = Array.isArray(appts) ? appts.filter(a => a.canBeQueued) : [];
          if (viable.length > 0) {
            setAppointments(viable);
            setSelectedAppointment(viable[0]);
            goTo('CITAS_ENCONTRADAS', 1);
            return;
          }
        } catch {
          /* no appointments — fall through to service catalog */
        }
      }

      goTo('SERVICIOS', 1);
    } finally {
      setLoading(false);
    }
  };

  // ─── Dispense core ──────────────────────────────────────────────────────────
  const dispense = async (serviceId: string, appointmentId?: string) => {
    const ticket = await ticketsApi.dispense({
      medicalServiceId: serviceId,
      ...(patient?.id     ? { patientId:     patient.id    } : {}),
      ...(appointmentId   ? { appointmentId: appointmentId } : {}),
      channel: 'KIOSK',
      pregnant:   esGestante,
      elderly:    esAdultoMayor,
      disability: tieneDiscapacidad,
    }) as any;
    const svc = services.find(s => s.id === serviceId);
    setIssuedTicket(ticket);
    setIssuedService(svc);
    setCountdown(20);
    goTo('TICKET_EMITIDO', 1);
  };

  const handleEmitirTurnoCita = async () => {
    if (!selectedAppointment) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await dispense(selectedAppointment.medicalServiceId, selectedAppointment.id);
    } catch (e: any) {
      setErrorMsg(`No se pudo generar el turno: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectService = (svc: any) => {
    setSelectedService(svc);
    goTo('CONDICIONES', 1);
  };

  const handleEmitirTurnoServicio = async () => {
    if (!selectedService) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await dispense(selectedService.id);
    } catch (e: any) {
      setErrorMsg(`No se pudo generar el turno: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const extendCountdown = () => setCountdown(c => c + 15);

  // ─── Numeric keypad helpers ─────────────────────────────────────────────────
  const appendDigit = (d: string) => {
    setErrorMsg(null);
    if (dni.length < 12) setDni(p => p + d);
  };

  const backspace = () => setDni(p => p.slice(0, -1));
  const clearDni  = () => { setErrorMsg(null); setDni(''); };

  // ─── Condition toggle card ──────────────────────────────────────────────────
  const ConditionCard = ({
    active, onToggle, icon, label, color,
  }: {
    active: boolean;
    onToggle: () => void;
    icon: React.ReactNode;
    label: string;
    color: 'pink' | 'amber' | 'purple';
  }) => {
    const colorMap = {
      pink:   { border: 'border-pink-400 bg-pink-50',   text: 'text-pink-700'   },
      amber:  { border: 'border-amber-400 bg-amber-50', text: 'text-amber-700'  },
      purple: { border: 'border-purple-400 bg-purple-50', text: 'text-purple-700' },
    };
    return (
      <button
        type="button"
        onClick={onToggle}
        style={{ minHeight: 72 }}
        className={[
          'flex flex-col items-center justify-center gap-2 rounded-xl2 border-2 px-4 py-5 font-semibold text-sm',
          'transition-all duration-150 select-none cursor-pointer w-full',
          active
            ? `${colorMap[color].border} ${colorMap[color].text} shadow-card-md`
            : 'border-surface-200 bg-white text-surface-500 hover:border-surface-300 hover:bg-surface-50',
        ].join(' ')}
      >
        <span className={active ? colorMap[color].text : 'text-surface-400'}>{icon}</span>
        <span className="text-center leading-tight">{label}</span>
        {active && (
          <CheckCircle2 className={`w-4 h-4 ${colorMap[color].text}`} />
        )}
      </button>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-surface-50 flex flex-col select-none font-sans"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >

      {/* ── Header ── */}
      <header className="flex items-center justify-between bg-white border-b border-surface-200 px-8 py-4 shadow-card">
        <div className="flex items-center gap-4">
          <div className="bg-primary-700 p-3 rounded-xl2">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide text-surface-900">{t.hospital_title}</h1>
            <p className="text-xs font-semibold text-surface-500 tracking-widest uppercase">
              Dispensador de Turnos
            </p>
          </div>
        </div>

        {/* Language switcher */}
        <div className="flex items-center gap-1 bg-surface-100 p-1.5 rounded-xl border border-surface-200">
          {(['es', 'qu', 'en'] as SupportedLanguage[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{ minHeight: 44 }}
              className={[
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                lang === l
                  ? 'bg-primary-700 text-white shadow-card'
                  : 'text-surface-500 hover:text-surface-800 hover:bg-surface-200',
              ].join(' ')}
            >
              {l === 'es' ? 'Español' : l === 'qu' ? 'Runasimi' : 'English'}
            </button>
          ))}
        </div>
      </header>

      {/* ── Global banners ── */}
      <div className="px-8 pt-4 flex flex-col gap-2">
        {registryWarning && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl2 px-5 py-3 text-sm font-semibold">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            <span>{registryWarning}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl2 px-5 py-3 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* ── Main step area ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="w-full flex flex-col items-center"
          >

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                STEP 1 — DOCUMENTO
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {step === 'DOCUMENTO' && (
              <div className="w-full max-w-md flex flex-col items-center gap-6">

                {/* Welcome header */}
                <div className="text-center">
                  <h2 className="text-3xl font-black text-surface-900 mb-1">{t.welcome}</h2>
                  <p className="text-base text-surface-500">{t.touch_to_start}</p>
                </div>

                {/* Welcome banner (non-blocking) */}
                {welcomeName && (
                  <div className="w-full flex items-center gap-3 bg-health-50 border border-health-200 text-health-800 rounded-xl2 px-5 py-3 text-sm font-semibold">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-health-600" />
                    <span>Bienvenido, {welcomeName}</span>
                  </div>
                )}

                {/* DNI display */}
                <Card className="w-full" padding="none">
                  <div
                    className="w-full rounded-xl bg-surface-50 border-2 border-surface-200 px-6 py-5 text-center font-mono text-5xl font-bold tracking-widest text-surface-900 min-h-[84px] flex items-center justify-center transition-colors"
                    style={{ letterSpacing: '0.15em' }}
                  >
                    {dni || (
                      <span className="text-surface-300 text-xl font-sans font-normal tracking-normal">
                        {t.dni_placeholder}
                      </span>
                    )}
                  </div>
                </Card>

                {/* Instruction */}
                <p className="text-sm font-medium text-surface-500 text-center -mt-2">
                  Ingrese su numero de documento
                </p>

                {/* Numeric keypad */}
                <div className="grid grid-cols-3 gap-3 w-full">
                  {['1','2','3','4','5','6','7','8','9'].map(n => (
                    <button
                      key={n}
                      onClick={() => appendDigit(n)}
                      className="kiosko-key text-surface-900"
                    >
                      {n}
                    </button>
                  ))}
                  {/* Bottom row: clear | 0 | backspace */}
                  <button onClick={clearDni} className="kiosko-key-delete text-red-600">
                    {t.clear}
                  </button>
                  <button onClick={() => appendDigit('0')} className="kiosko-key text-surface-900">
                    0
                  </button>
                  <button onClick={backspace} className="kiosko-key text-surface-600">
                    {t.delete}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 w-full pt-1">
                  <Button
                    variant="secondary"
                    size="xl"
                    fullWidth
                    onClick={() => { setErrorMsg(null); goTo('SERVICIOS', 1); }}
                  >
                    {t.guest}
                  </Button>
                  <Button
                    variant="primary"
                    size="xl"
                    fullWidth
                    loading={loading}
                    onClick={handleContinuarDni}
                  >
                    {loading ? 'Buscando...' : t.search}
                  </Button>
                </div>
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                STEP 2 — CITAS_ENCONTRADAS
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {step === 'CITAS_ENCONTRADAS' && selectedAppointment && (
              <div className="w-full max-w-lg flex flex-col gap-5">

                {/* Icon + heading */}
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="bg-health-100 text-health-600 p-5 rounded-xl2 border border-health-200">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h2 className="text-2xl font-black text-surface-900">{t.has_appointment_title}</h2>
                  <p className="text-surface-500 text-sm">
                    {t.appointment_msg}{' '}
                    <strong className="text-surface-800">
                      {services.find(s => s.id === selectedAppointment.medicalServiceId)?.name || 'Servicio Medico'}
                    </strong>
                  </p>
                </div>

                {/* Appointment details */}
                <Card padding="lg">
                  <dl className="divide-y divide-surface-100">
                    <div className="flex justify-between py-3 first:pt-0 last:pb-0">
                      <dt className="text-sm text-surface-500">{t.appointment_time}</dt>
                      <dd className="text-base font-bold font-mono text-primary-700">
                        {selectedAppointment.appointmentTime}
                      </dd>
                    </div>
                    <div className="flex justify-between py-3">
                      <dt className="text-sm text-surface-500">{t.with_doctor}</dt>
                      <dd className="text-sm font-semibold text-surface-800">
                        {selectedAppointment.doctorName || 'Por asignar'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-3 last:pb-0">
                      <dt className="text-sm text-surface-500">{t.suggested_room}</dt>
                      <dd className="text-sm font-semibold text-health-700">
                        {selectedAppointment.suggestedRoomCode || 'Por confirmar'}
                      </dd>
                    </div>
                  </dl>
                </Card>

                {/* Preferential conditions */}
                <div>
                  <p className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-3">
                    {t.preferential_conditions}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <ConditionCard
                      active={esGestante}
                      onToggle={() => setEsGestante(v => !v)}
                      color="pink"
                      icon={<Heart className="w-6 h-6" />}
                      label={t.pregnant}
                    />
                    <ConditionCard
                      active={esAdultoMayor}
                      onToggle={() => setEsAdultoMayor(v => !v)}
                      color="amber"
                      icon={<UserCheck className="w-6 h-6" />}
                      label={t.senior}
                    />
                    <ConditionCard
                      active={tieneDiscapacidad}
                      onToggle={() => setTieneDiscapacidad(v => !v)}
                      color="purple"
                      icon={<AlertCircle className="w-6 h-6" />}
                      label={t.disability}
                    />
                  </div>
                </div>

                {/* Inline error inside step */}
                {errorMsg && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl2 px-4 py-3 text-sm font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="xl"
                    fullWidth
                    onClick={() => { setErrorMsg(null); goTo('SERVICIOS', 1); }}
                  >
                    {t.other_service}
                  </Button>
                  <Button
                    variant="success"
                    size="xl"
                    fullWidth
                    loading={loading}
                    onClick={handleEmitirTurnoCita}
                  >
                    {loading ? 'Generando...' : t.confirm_appointment_ticket}
                  </Button>
                </div>
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                STEP 3 — SERVICIOS
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {step === 'SERVICIOS' && (
              <div className="w-full max-w-4xl flex flex-col gap-6">

                {/* Heading */}
                <div className="text-center">
                  <h2 className="text-2xl font-black text-surface-900 mb-1">
                    Seleccione el servicio que necesita
                  </h2>
                  <p className="text-sm text-surface-500">{t.select_service}</p>
                </div>

                {/* Loading state */}
                {services.length === 0 && !errorMsg && (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <Spinner size="lg" />
                    <p className="text-surface-500 text-sm">Cargando servicios disponibles...</p>
                  </div>
                )}

                {/* Services grid */}
                {services.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {services.map(svc => (
                      <button
                        key={svc.id}
                        disabled={loading}
                        onClick={() => handleSelectService(svc)}
                        style={{ minHeight: 120 }}
                        className={[
                          'group text-left bg-white border-2 border-surface-200 rounded-xl2',
                          'p-5 flex flex-col gap-3 transition-all duration-150',
                          'hover:border-primary-400 hover:shadow-card-md hover:bg-primary-50',
                          'active:scale-[0.98] active:bg-primary-100',
                          'disabled:opacity-60 disabled:cursor-not-allowed',
                        ].join(' ')}
                      >
                        <div className="bg-surface-100 group-hover:bg-white rounded-xl p-3 w-fit transition-colors">
                          {getServiceIcon(svc.iconName)}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-surface-900 group-hover:text-primary-700 transition-colors leading-snug">
                            {svc.name}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-surface-500 font-medium">
                              {t.est_time}: ~{svc.estimatedMinutes} min
                            </span>
                            <span className="font-mono font-bold text-xs bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-lg">
                              [{svc.ticketPrefix}]
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Back */}
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => { setErrorMsg(null); setRegistryWarning(null); goTo('DOCUMENTO', -1); }}
                  >
                    {t.back_to_start}
                  </Button>
                </div>
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                STEP 4 — CONDICIONES
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {step === 'CONDICIONES' && (
              <div className="w-full max-w-md flex flex-col gap-6">

                {/* Heading */}
                <div className="text-center">
                  <h2 className="text-2xl font-black text-surface-900 mb-1">
                    Tiene alguna condicion especial?
                  </h2>
                  <p className="text-sm text-surface-500">{t.preferential_conditions}</p>
                </div>

                {/* Selected service summary */}
                {selectedService && (
                  <div className="flex items-center gap-3 bg-primary-50 border border-primary-100 rounded-xl2 px-4 py-3">
                    <div className="text-primary-600">{getServiceIcon(selectedService.iconName)}</div>
                    <div>
                      <p className="text-xs text-primary-500 font-medium uppercase tracking-wider">Servicio seleccionado</p>
                      <p className="text-sm font-bold text-primary-800">{selectedService.name}</p>
                    </div>
                  </div>
                )}

                {/* Condition toggles */}
                <div className="grid grid-cols-3 gap-4">
                  <ConditionCard
                    active={esGestante}
                    onToggle={() => setEsGestante(v => !v)}
                    color="pink"
                    icon={<Heart className="w-8 h-8" />}
                    label={t.pregnant}
                  />
                  <ConditionCard
                    active={esAdultoMayor}
                    onToggle={() => setEsAdultoMayor(v => !v)}
                    color="amber"
                    icon={<UserCheck className="w-8 h-8" />}
                    label={t.senior}
                  />
                  <ConditionCard
                    active={tieneDiscapacidad}
                    onToggle={() => setTieneDiscapacidad(v => !v)}
                    color="purple"
                    icon={<AlertCircle className="w-8 h-8" />}
                    label={t.disability}
                  />
                </div>

                {/* Inline error */}
                {errorMsg && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl2 px-4 py-3 text-sm font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="xl"
                    fullWidth
                    onClick={() => { setErrorMsg(null); goTo('SERVICIOS', -1); }}
                  >
                    Atras
                  </Button>
                  <Button
                    variant="primary"
                    size="xl"
                    fullWidth
                    loading={loading}
                    onClick={handleEmitirTurnoServicio}
                  >
                    {loading ? 'Generando...' : 'Continuar'}
                  </Button>
                </div>

                {/* Skip */}
                <div className="text-center">
                  <button
                    className="text-sm text-surface-400 hover:text-surface-600 underline underline-offset-2 transition-colors"
                    onClick={handleEmitirTurnoServicio}
                    disabled={loading}
                  >
                    Ninguna, continuar sin condicion especial
                  </button>
                </div>
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                STEP 5 — TICKET_EMITIDO
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {step === 'TICKET_EMITIDO' && issuedTicket && (
              <div className="w-full max-w-sm flex flex-col gap-4">

                {/* Success banner */}
                <div className="flex items-center justify-center gap-2 text-health-700 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-health-500" />
                  {t.ticket_issued}
                </div>

                {/* Ticket card */}
                <div
                  id="ticket-print-area"
                  className="w-full bg-white border-2 border-surface-200 rounded-xl2 shadow-card-lg overflow-hidden"
                >
                  {/* Top bar */}
                  <div className="bg-primary-700 px-6 py-3 text-center">
                    <p className="text-xs font-bold text-primary-200 tracking-widest uppercase">
                      {t.hospital_title}
                    </p>
                    <p className="text-[10px] text-primary-300 tracking-wider">COMPROBANTE DE TURNO</p>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-6 flex flex-col items-center gap-4">

                    {/* Ticket code */}
                    <div className="text-center">
                      <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1">
                        {t.your_ticket}
                      </p>
                      <div className="ticket-code text-7xl text-primary-700 leading-none">
                        {issuedTicket.ticketCode}
                      </div>
                    </div>

                    {/* Priority badge */}
                    <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${priorityClasses(issuedTicket.priorityLevel)}`}>
                      {t.priority_prefix} {priorityLabel(issuedTicket.priorityLevel, t)}
                    </span>

                    {/* Details table */}
                    <div className="w-full bg-surface-50 border border-surface-200 rounded-xl p-4 space-y-2 text-sm">
                      {issuedService && (
                        <div className="flex justify-between">
                          <span className="text-surface-500">{t.service_label}</span>
                          <span className="font-semibold text-surface-800">{issuedService.name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-surface-500">{t.priority_points}</span>
                        <span className="font-semibold text-primary-700">{issuedTicket.priorityPoints} pts</span>
                      </div>
                      {issuedTicket.estimatedWaitMinutes != null && (
                        <div className="flex justify-between">
                          <span className="text-surface-500">{t.estimated_wait}</span>
                          <span className="font-semibold text-health-700 font-mono">
                            ~{issuedTicket.estimatedWaitMinutes} {t.minutes}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Barcode */}
                    <div className="flex flex-col items-center gap-1 w-full">
                      <svg ref={barcodeRef} className="w-48 h-auto" />
                      <span className="text-[9px] font-mono text-surface-400 tracking-wider">
                        {issuedTicket.id?.substring(0, 18)?.toUpperCase()}
                      </span>
                    </div>

                    {/* Dashed separator */}
                    <div className="w-full border-t-2 border-dashed border-surface-200" />

                    {/* Countdown bar */}
                    <div className="w-full">
                      <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (countdown / 20) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-surface-400 text-center mt-1">
                        Pantalla se reiniciara en {countdown}s
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="xl"
                    fullWidth
                    icon={<Printer className="w-5 h-5" />}
                    onClick={() => window.print()}
                  >
                    {t.print_ticket}
                  </Button>
                  <Button
                    variant="primary"
                    size="xl"
                    fullWidth
                    onClick={resetKiosk}
                  >
                    {t.close} ({countdown}s)
                  </Button>
                </div>

                {/* Extend time */}
                <button
                  onClick={extendCountdown}
                  style={{ minHeight: 48 }}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-surface-500 hover:text-surface-800 bg-white border border-surface-200 hover:bg-surface-50 rounded-xl2 transition-all"
                >
                  <Volume2 className="w-4 h-4" />
                  {t.need_more_time}
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center text-xs text-surface-400 font-medium py-4 border-t border-surface-100">
        Sistema de Colas Autonomo On-Premise | Soporte Multilingue | Ley 28683
      </footer>
    </div>
  );
};
