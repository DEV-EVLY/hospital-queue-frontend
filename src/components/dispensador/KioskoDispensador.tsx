import React, { useState, useEffect, useRef } from 'react';
import { medicalServicesApi, patientsApi, appointmentsApi, ticketsApi } from '../../services/api';
import { translations, SupportedLanguage } from '../../locales/i18n';
import {
  Heart, Baby, UserCheck, Stethoscope, Activity,
  FlaskConical, Smile, AlertCircle, Printer, CheckCircle2, Volume2, Info
} from 'lucide-react';
// M-02: real barcode generation
import JsBarcode from 'jsbarcode';

export const KioskoDispensador: React.FC = () => {
  const [lang, setLang] = useState<SupportedLanguage>('es');
  const t = translations[lang];

  const [step, setStep] = useState<'DOCUMENTO' | 'CITAS_ENCONTRADAS' | 'SERVICIOS' | 'TICKET_EMITIDO'>('DOCUMENTO');
  const [dni, setDni] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [patient, setPatient] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  const [esGestante, setEsGestante]           = useState(false);
  const [esAdultoMayor, setEsAdultoMayor]     = useState(false);
  const [tieneDiscapacidad, setTieneDiscapacidad] = useState(false);

  const [issuedTicket, setIssuedTicket]   = useState<any | null>(null);
  const [issuedService, setIssuedService] = useState<any | null>(null);
  // B-03: increased to 20s + extendable
  const [countdown, setCountdown]         = useState(20);
  // M-02: ref for real barcode SVG
  const barcodeRef                         = useRef<SVGSVGElement>(null);
  const [loading, setLoading]             = useState(false);
  // C-01/C-02: inline error state — replaces all alert() calls
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  // C-01: warn when registry lookup failed but we still continue anonymously
  const [registryWarning, setRegistryWarning] = useState<string | null>(null);

  useEffect(() => {
    medicalServicesApi.list()
      .then(d => setServices((d as any[]).filter(s => s.active)))
      .catch(() => setErrorMsg('No se pudieron cargar los servicios. Por favor espera un momento y vuelve a intentar.'));
  }, []);

  useEffect(() => {
    let timer: any;
    if (step === 'TICKET_EMITIDO' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (step === 'TICKET_EMITIDO' && countdown === 0) {
      resetKiosk();
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const resetKiosk = () => {
    setDni('');
    setPatient(null);
    setAppointments([]);
    setSelectedAppointment(null);
    setEsGestante(false);
    setEsAdultoMayor(false);
    setTieneDiscapacidad(false);
    setIssuedTicket(null);
    setIssuedService(null);
    setErrorMsg(null);
    setRegistryWarning(null);
    setStep('DOCUMENTO');
  };

  const handleContinuarDni = async () => {
    // C-02: inline validation instead of alert()
    if (!dni || dni.length < 8) {
      setErrorMsg('Por favor ingresa un número de documento válido (mínimo 8 dígitos).');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setRegistryWarning(null);
    try {
      let foundPatient: any = null;
      try {
        foundPatient = await patientsApi.search('DNI', dni) as any;
        setPatient(foundPatient);
        if (foundPatient?.conditions) {
          if (foundPatient.conditions.includes('PREGNANT'))   setEsGestante(true);
          if (foundPatient.conditions.includes('ELDERLY'))    setEsAdultoMayor(true);
          if (foundPatient.conditions.includes('DISABILITY')) setTieneDiscapacidad(true);
        }
      } catch (searchErr: any) {
        // C-01: distinguish "not found" (expected) from service error (unexpected)
        const is404 = searchErr?.message?.includes('404') || searchErr?.message?.toLowerCase().includes('not found');
        if (!is404) {
          // Service error — continue anonymously but warn the patient
          setRegistryWarning(
            'No pudimos verificar tu documento en el sistema. Tu turno será como visitante. Si tienes cita, acércate a admisión.'
          );
        }
        // either way, continue as anonymous
      }

      if (foundPatient?.id) {
        try {
          const appts = await appointmentsApi.patientToday(foundPatient.id) as any[];
          const viable = Array.isArray(appts) ? appts.filter(a => a.canBeQueued) : [];
          if (viable.length > 0) {
            setAppointments(viable);
            setSelectedAppointment(viable[0]);
            setStep('CITAS_ENCONTRADAS');
            return;
          }
        } catch { /* no appointments — fall through to service catalog */ }
      }

      setStep('SERVICIOS');
    } finally {
      setLoading(false);
    }
  };

  const dispense = async (serviceId: string, appointmentId?: string) => {
    const ticket = await ticketsApi.dispense({
      medicalServiceId: serviceId,
      patientId: patient?.id ?? null,
      appointmentId: appointmentId ?? null,
      channel: 'KIOSK',
      pregnant: esGestante,
      elderly: esAdultoMayor,
      disability: tieneDiscapacidad
    }) as any;
    const svc = services.find(s => s.id === serviceId);
    setIssuedTicket(ticket);
    setIssuedService(svc);
    // B-03: reset to 20s on each new ticket
    setCountdown(20);
    setStep('TICKET_EMITIDO');
  };

  const handleEmitirTurnoCita = async () => {
    if (!selectedAppointment) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await dispense(selectedAppointment.medicalServiceId, selectedAppointment.id);
    } catch (e: any) {
      // C-02: inline error instead of alert()
      setErrorMsg(`No se pudo generar el turno: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmitirTurnoServicio = async (svc: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await dispense(svc.id);
    } catch (e: any) {
      // C-02: inline error instead of alert()
      setErrorMsg(`No se pudo generar el turno: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // M-02: generate real barcode when ticket is shown
  useEffect(() => {
    if (step === 'TICKET_EMITIDO' && barcodeRef.current && issuedTicket?.ticketCode) {
      try {
        JsBarcode(barcodeRef.current, issuedTicket.ticketCode, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: false,
          background: '#0f172a',
          lineColor: '#ffffff',
          margin: 4,
        });
      } catch { /* unsupported value — leave empty */ }
    }
  }, [step, issuedTicket]);

  // B-03: extend countdown by 15s (for elderly / slow readers)
  const extendCountdown = () => setCountdown(c => c + 15);

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'activity':       return <Activity className="w-9 h-9 text-rose-600" />;
      case 'stethoscope':    return <Stethoscope className="w-9 h-9 text-sky-600" />;
      case 'baby':           return <Baby className="w-9 h-9 text-emerald-600" />;
      case 'heart':          return <Heart className="w-9 h-9 text-pink-600" />;
      case 'flask-conical':  return <FlaskConical className="w-9 h-9 text-purple-600" />;
      default:               return <Smile className="w-9 h-9 text-amber-600" />;
    }
  };

  // B-01: translated priority labels
  const priorityLabel = (level: string) => {
    if (level === 'URGENT')       return t.priority_urgent;
    if (level === 'PREFERENTIAL') return t.priority_preferential;
    return t.priority_normal;
  };

  const priorityBg = (level: string) => {
    if (level === 'URGENT')       return 'bg-rose-100 text-rose-700';
    if (level === 'PREFERENTIAL') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
  };

  const flagStyles = {
    pink:   { on: 'bg-pink-500/40 border-pink-400 text-white',   icon: 'w-6 h-6 text-pink-400',   check: 'text-pink-300' },
    amber:  { on: 'bg-amber-500/40 border-amber-400 text-white', icon: 'w-6 h-6 text-amber-400',  check: 'text-amber-300' },
    purple: { on: 'bg-purple-500/40 border-purple-400 text-white', icon: 'w-6 h-6 text-purple-400', check: 'text-purple-300' },
  } as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white flex flex-col justify-between p-6 select-none font-sans">

      {/* Barra Superior */}
      <header className="flex justify-between items-center bg-white/10 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/10">
        <div className="flex items-center space-x-4">
          <div className="bg-sky-500 p-3 rounded-2xl shadow-lg shadow-sky-500/30">
            <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-sky-200">{t.hospital_title}</h1>
            <p className="text-sm text-sky-300/80 font-medium">DISPENSADOR DE TURNOS Y AUTOGESTIÓN</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-black/30 p-2 rounded-2xl border border-white/10">
          {(['es', 'qu', 'en'] as SupportedLanguage[]).map(l => (
            <button key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                lang === l ? 'bg-sky-500 text-white shadow-md' : 'text-slate-300 hover:text-white'
              }`}>
              {l === 'es' ? '🇵🇪 Español' : l === 'qu' ? '🏔️ Runasimi' : '🇺🇸 English'}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center my-6">

        {/* C-01: Registry warning — visible but non-blocking */}
        {registryWarning && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 flex items-start space-x-3 bg-amber-500/20 border border-amber-400/50 text-amber-200 rounded-2xl px-6 py-4 max-w-lg text-sm font-semibold shadow-xl">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{registryWarning}</span>
          </div>
        )}

        {/* C-02: Inline error banner */}
        {errorMsg && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 flex items-start space-x-3 bg-rose-500/20 border border-rose-400/50 text-rose-200 rounded-2xl px-6 py-4 max-w-lg text-sm font-semibold shadow-xl">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PASO 1: DOCUMENTO */}
        {step === 'DOCUMENTO' && (
          <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center">
            <h2 className="text-2xl font-bold text-sky-100 text-center mb-2">{t.welcome}</h2>
            <p className="text-slate-300 text-center mb-6">{t.touch_to_start}</p>

            <div className="w-full bg-slate-950/80 border-2 border-sky-400/50 rounded-2xl py-4 px-6 mb-6 text-center text-4xl font-mono font-bold tracking-widest text-sky-300 shadow-inner min-h-[76px] flex items-center justify-center">
              {dni || <span className="text-slate-600 text-2xl font-sans tracking-normal">{t.dni_placeholder}</span>}
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-6">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} onClick={() => { setErrorMsg(null); dni.length < 12 && setDni(p => p + n); }}
                  className="bg-white/15 hover:bg-white/30 active:scale-95 text-3xl font-bold py-5 rounded-2xl border border-white/10 transition-all text-white shadow-lg">
                  {n}
                </button>
              ))}
              <button onClick={() => { setErrorMsg(null); setDni(''); }}
                className="bg-rose-500/40 hover:bg-rose-500/60 active:scale-95 text-lg font-bold py-5 rounded-2xl border border-rose-500/30 transition-all text-rose-200">
                {t.clear}
              </button>
              <button onClick={() => { setErrorMsg(null); dni.length < 12 && setDni(p => p + '0'); }}
                className="bg-white/15 hover:bg-white/30 active:scale-95 text-3xl font-bold py-5 rounded-2xl border border-white/10 transition-all text-white shadow-lg">
                0
              </button>
              <button onClick={() => setDni(p => p.slice(0, -1))}
                className="bg-amber-500/40 hover:bg-amber-500/60 active:scale-95 text-2xl font-bold py-5 rounded-2xl border border-amber-500/30 transition-all text-amber-200 flex items-center justify-center">
                {t.delete}
              </button>
            </div>

            <div className="w-full flex space-x-4">
              <button onClick={() => { setErrorMsg(null); setStep('SERVICIOS'); }}
                className="flex-1 bg-slate-800/80 hover:bg-slate-700 py-4 rounded-2xl font-bold text-slate-300 text-lg border border-slate-700">
                {t.guest}
              </button>
              <button disabled={loading} onClick={handleContinuarDni}
                className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 py-4 rounded-2xl font-black text-white text-xl shadow-lg shadow-sky-500/40 transition-all active:scale-95 disabled:opacity-60">
                {loading ? 'Buscando...' : t.search}
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: CITA DETECTADA */}
        {step === 'CITAS_ENCONTRADAS' && selectedAppointment && (
          <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-emerald-500/30 shadow-2xl flex flex-col items-center">
            <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-2xl mb-4 border border-emerald-500/30">
              <CheckCircle2 className="w-14 h-14 animate-bounce" />
            </div>
            <h2 className="text-3xl font-black text-emerald-300 text-center mb-2">{t.has_appointment_title}</h2>
            <p className="text-slate-300 text-center mb-6 text-lg">
              {t.appointment_msg}{' '}
              <strong className="text-white">
                {services.find(s => s.id === selectedAppointment.medicalServiceId)?.name || 'Servicio Médico'}
              </strong>
            </p>

            <div className="w-full bg-slate-950/60 p-6 rounded-2xl border border-white/10 mb-6 space-y-3">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">{t.appointment_time}</span>
                <span className="text-xl font-mono font-bold text-sky-400">{selectedAppointment.appointmentTime}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">{t.with_doctor}</span>
                <span className="text-lg font-bold text-white">{selectedAppointment.doctorName || 'Por asignar'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.suggested_room}</span>
                <span className="text-lg font-bold text-emerald-400">
                  {selectedAppointment.suggestedRoomCode || 'Por confirmar'}
                </span>
              </div>
            </div>

            <div className="w-full mb-6">
              <p className="text-sm font-bold text-sky-300 mb-3 text-center">{t.preferential_conditions}:</p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { flag: esGestante,        set: setEsGestante,        color: 'pink'   as const, Icon: Heart,       label: t.pregnant },
                  { flag: esAdultoMayor,     set: setEsAdultoMayor,     color: 'amber'  as const, Icon: UserCheck,   label: t.senior },
                  { flag: tieneDiscapacidad, set: setTieneDiscapacidad, color: 'purple' as const, Icon: AlertCircle, label: t.disability },
                ]).map(({ flag, set, color, Icon, label }) => (
                  <button key={label} type="button" onClick={() => set(!flag)}
                    className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center space-y-1 transition-all ${
                      flag ? flagStyles[color].on : 'bg-white/5 border-white/10 text-slate-400'
                    }`}>
                    <Icon className={flagStyles[color].icon} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="w-full flex items-center space-x-2 bg-rose-500/20 border border-rose-400/40 text-rose-200 rounded-xl px-4 py-3 mb-4 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
              </div>
            )}

            <div className="w-full flex space-x-4">
              <button onClick={() => { setErrorMsg(null); setStep('SERVICIOS'); }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-bold text-slate-300">
                {t.other_service}
              </button>
              <button disabled={loading} onClick={handleEmitirTurnoCita}
                className="flex-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 py-4 px-6 rounded-2xl font-black text-white text-xl shadow-lg shadow-emerald-500/40 active:scale-95 disabled:opacity-60">
                {loading ? 'Generando Ticket...' : t.confirm_appointment_ticket}
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: CATÁLOGO DE SERVICIOS */}
        {step === 'SERVICIOS' && (
          <div className="w-full max-w-5xl flex flex-col items-center">
            <h2 className="text-3xl font-black text-sky-100 mb-2 text-center">{t.select_service}</h2>

            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 mb-6 flex flex-wrap items-center justify-center gap-4">
              <span className="text-sm font-bold text-sky-300">{t.preferential_conditions}:</span>
              {([
                { checked: esGestante,        set: setEsGestante,        label: t.pregnant,   color: 'pink'   as const },
                { checked: esAdultoMayor,     set: setEsAdultoMayor,     label: t.senior,     color: 'amber'  as const },
                { checked: tieneDiscapacidad, set: setTieneDiscapacidad, label: t.disability, color: 'purple' as const },
              ]).map(({ checked, set, label, color }) => (
                <label key={label} className="flex items-center space-x-2 cursor-pointer bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10">
                  <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)}
                    className="w-5 h-5 rounded" />
                  <span className={`text-sm font-bold ${flagStyles[color].check}`}>{label}</span>
                </label>
              ))}
            </div>

            {errorMsg && (
              <div className="w-full max-w-lg flex items-center space-x-2 bg-rose-500/20 border border-rose-400/40 text-rose-200 rounded-xl px-4 py-3 mb-4 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
              </div>
            )}

            {services.length === 0 ? (
              <div className="text-slate-400 text-center py-12 text-lg">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-40 animate-pulse" />
                <p>Cargando servicios disponibles...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {services.map(svc => (
                  <button key={svc.id} disabled={loading} onClick={() => handleEmitirTurnoServicio(svc)}
                    className="bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-lg border border-white/15 p-6 rounded-3xl flex flex-col items-start transition-all shadow-xl hover:border-sky-400 group text-left disabled:opacity-60">
                    <div className="p-4 rounded-2xl bg-white/10 group-hover:bg-white/20 transition-all mb-4">
                      {getServiceIcon(svc.iconName)}
                    </div>
                    <h3 className="text-2xl font-black text-white group-hover:text-sky-300 transition-all mb-1">
                      {svc.name}
                    </h3>
                    <div className="mt-auto flex justify-between items-center w-full pt-3 border-t border-white/10 text-xs font-semibold text-slate-400">
                      <span>{t.est_time}: ~{svc.estimatedMinutes} min</span>
                      <span className="bg-sky-500/30 text-sky-300 px-3 py-1 rounded-full font-mono font-bold">
                        [{svc.ticketPrefix}]
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button onClick={resetKiosk}
              className="mt-8 bg-slate-800/80 hover:bg-slate-700 px-8 py-3 rounded-2xl text-slate-300 font-bold border border-white/10">
              {t.back_to_start}
            </button>
          </div>
        )}

        {/* PASO 4: TICKET EMITIDO */}
        {step === 'TICKET_EMITIDO' && issuedTicket && (
          // M-01: id for @media print targeting
          <div id="ticket-print-area" className="w-full max-w-md bg-white text-slate-900 p-8 rounded-3xl shadow-2xl border-4 border-sky-400 flex flex-col items-center animate-fade-in">
            <div className="w-16 h-2 bg-slate-300 rounded-full mb-6"></div>
            <h3 className="text-lg font-black text-center text-slate-800 tracking-wider">HOSPITAL NACIONAL</h3>
            <p className="text-xs text-slate-500 mb-4">COMPROBANTE DE TURNO</p>
            <div className="w-full border-t-2 border-dashed border-slate-300 my-2"></div>

            <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">{t.your_ticket}</p>
            <div className="text-6xl font-black font-mono my-3 text-sky-700 tracking-wider">
              {issuedTicket.ticketCode}
            </div>

            <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 ${priorityBg(issuedTicket.priorityLevel)}`}>
              {t.priority_prefix} {priorityLabel(issuedTicket.priorityLevel)}
            </span>

            <div className="w-full bg-slate-50 p-4 rounded-xl space-y-2 text-sm border border-slate-200 mb-6">
              {issuedService && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.service_label}</span>
                  <span className="font-bold text-slate-800">{issuedService.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">{t.priority_points}</span>
                <span className="font-bold text-sky-600">{issuedTicket.priorityPoints} pts</span>
              </div>
              {issuedTicket.estimatedWaitMinutes != null && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.estimated_wait}</span>
                  <span className="font-bold text-emerald-600 font-mono">~{issuedTicket.estimatedWaitMinutes} {t.minutes}</span>
                </div>
              )}
            </div>

            {/* M-02: real Code128 barcode via JsBarcode */}
            <div className="w-full flex flex-col items-center mb-6">
              <svg ref={barcodeRef} className="w-48" />
              <span className="text-[10px] font-mono text-slate-500 mt-1">
                {issuedTicket.id?.substring(0, 18)?.toUpperCase()}
              </span>
            </div>

            <div className="w-full flex space-x-3 mb-3">
              <button onClick={() => window.print()}
                className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 text-sm">
                <Printer className="w-4 h-4" /><span>{t.print_ticket}</span>
              </button>
              <button onClick={resetKiosk}
                className="flex-1 bg-sky-600 text-white font-bold py-3 rounded-xl text-sm">
                {t.close} ({countdown}s)
              </button>
            </div>
            {/* B-03: extend time button for elderly users */}
            <button onClick={extendCountdown}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-2">
              <Volume2 className="w-3 h-3" /><span>{t.need_more_time}</span>
            </button>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-sky-300/60 font-medium">
        Sistema de Colas Autónomo On-Premise | Soporte Multilingüe | Ley 28683
      </footer>
    </div>
  );
};
