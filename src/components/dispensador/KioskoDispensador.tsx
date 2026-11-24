import React from 'react';
import type { DeviceProfile } from '../../types/api';
import { tr } from '../../i18n';
import { AppointmentStep } from './AppointmentStep';
import { ConditionsStep } from './ConditionsStep';
import { DocumentStep } from './DocumentStep';
import { KioskBanners } from './KioskNotices';
import { KioskHeader } from './KioskHeader';
import { ServicesStep } from './ServicesStep';
import { StepTransition } from './StepTransition';
import { TicketStep } from './TicketStep';
import { useKioskFlow, type KioskFlow } from './useKioskFlow';

export interface KioskoDispensadorProps {
  /** Perfil del equipo (null = modo abierto: todos los servicios). */
  profile?: DeviceProfile | null;
  /** Token del equipo vinculado: el servidor lo exige para emitir tickets cuando hay perfiles de kiosko. */
  deviceToken?: string | null;
}

/** El paso actual del flujo. */
const CurrentStep: React.FC<{ flow: KioskFlow }> = ({ flow }) => {
  switch (flow.step) {
    case 'DOCUMENTO':
      return (
        <DocumentStep
          dni={flow.dni}
          welcomeName={flow.welcomeName}
          loading={flow.loading}
          onDniChange={flow.setDni}
          onDigit={flow.pressDigit}
          onBackspace={flow.backspace}
          onClear={flow.clearDni}
          onSearch={flow.searchDocument}
          onGuest={flow.continueAsGuest}
        />
      );
    case 'CITAS_ENCONTRADAS':
      return flow.selectedAppointment && (
        <AppointmentStep
          appointment={flow.selectedAppointment}
          serviceName={flow.services.find(s => s.id === flow.selectedAppointment?.medicalServiceId)?.name}
          conditions={flow.conditions}
          errorMsg={flow.errorMsg}
          loading={flow.loading}
          onToggleCondition={flow.toggleCondition}
          onOtherService={flow.continueAsGuest}
          onConfirm={flow.issueForAppointment}
        />
      );
    case 'SERVICIOS':
      return (
        <ServicesStep
          services={flow.services}
          showLoading={flow.services.length === 0 && !flow.errorMsg}
          loading={flow.loading}
          onSelect={flow.selectService}
          onBack={flow.backToStart}
        />
      );
    case 'CONDICIONES':
      return (
        <ConditionsStep
          service={flow.selectedService}
          conditions={flow.conditions}
          errorMsg={flow.errorMsg}
          loading={flow.loading}
          onToggleCondition={flow.toggleCondition}
          onBack={flow.backToServices}
          onContinue={flow.issueForService}
        />
      );
    case 'TICKET_EMITIDO':
      return flow.issuedTicket && (
        <TicketStep
          ticket={flow.issuedTicket}
          service={flow.issuedService}
          countdown={flow.countdown}
          onClose={flow.reset}
          onExtend={flow.extendCountdown}
        />
      );
  }
};

/**
 * Dispensador de turnos para pacientes (pantalla táctil pública). Solo compone: el flujo vive en
 * `useKioskFlow` y cada paso es su propio componente.
 */
export const KioskoDispensador: React.FC<KioskoDispensadorProps> = ({ profile = null, deviceToken = null }) => {
  const flow = useKioskFlow(profile, deviceToken);

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col select-none font-sans" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <KioskHeader />
      <KioskBanners registryWarning={flow.registryWarning} errorMsg={flow.errorMsg} />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-6 overflow-hidden">
        <StepTransition step={flow.step} direction={flow.direction}>
          <CurrentStep flow={flow} />
        </StepTransition>
      </main>

      <footer className="text-center text-xs text-surface-400 font-medium py-4 border-t border-surface-100">
        {tr('kiosk.footer')}
      </footer>
    </div>
  );
};

export default KioskoDispensador;
