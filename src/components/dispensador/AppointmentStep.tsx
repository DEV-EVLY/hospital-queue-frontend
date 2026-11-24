import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Card } from '../ui';
import type { Appointment } from '../../types/api';
import { tr } from '../../i18n';
import { ConditionToggles } from './ConditionToggles';
import { InlineError } from './KioskNotices';
import type { ConditionKey, Conditions } from './types';

interface Props {
  appointment: Appointment;
  /** Nombre del servicio de la cita (vacío = se muestra "servicio médico") */
  serviceName: string | undefined;
  conditions: Conditions;
  errorMsg: string | null;
  loading: boolean;
  onToggleCondition: (key: ConditionKey) => void;
  onOtherService: () => void;
  onConfirm: () => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between py-3 first:pt-0 last:pb-0">
    <dt className="text-sm text-surface-500">{label}</dt>
    <dd>{children}</dd>
  </div>
);

/** Paso 2: el paciente tiene una cita hoy; confirma el turno de la cita o elige otro servicio. */
export const AppointmentStep: React.FC<Props> = ({
  appointment, serviceName, conditions, errorMsg, loading, onToggleCondition, onOtherService, onConfirm,
}) => (
  <div className="w-full max-w-lg flex flex-col gap-5">
    <div className="flex flex-col items-center text-center gap-3">
      <div className="bg-health-100 text-health-600 p-5 rounded-xl2 border border-health-200">
        <CheckCircle2 className="w-12 h-12" />
      </div>
      <h2 className="text-2xl font-black text-surface-900">{tr('kiosk.has_appointment_title')}</h2>
      <p className="text-surface-500 text-sm">
        {tr('kiosk.appointment_msg')}{' '}
        <strong className="text-surface-800">{serviceName || tr('kiosk.servicio_medico')}</strong>
      </p>
    </div>

    <Card padding="lg">
      <dl className="divide-y divide-surface-100">
        <Row label={tr('kiosk.appointment_time')}>
          <span className="text-base font-bold font-mono text-primary-700">{appointment.appointmentTime}</span>
        </Row>
        <Row label={tr('kiosk.with_doctor')}>
          <span className="text-sm font-semibold text-surface-800">{appointment.doctorName || tr('kiosk.por_asignar')}</span>
        </Row>
        <Row label={tr('kiosk.suggested_room')}>
          <span className="text-sm font-semibold text-health-700">{appointment.suggestedRoomCode || tr('kiosk.por_confirmar')}</span>
        </Row>
      </dl>
    </Card>

    <div>
      <p className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-3">{tr('kiosk.preferential_conditions')}</p>
      <ConditionToggles conditions={conditions} onToggle={onToggleCondition} size="md" />
    </div>

    <InlineError message={errorMsg} />

    <div className="flex gap-3">
      <Button variant="secondary" size="xl" fullWidth onClick={onOtherService}>{tr('kiosk.other_service')}</Button>
      <Button variant="success" size="xl" fullWidth loading={loading} onClick={onConfirm}>
        {loading ? tr('kiosk.generando') : tr('kiosk.confirm_appointment_ticket')}
      </Button>
    </div>
  </div>
);
