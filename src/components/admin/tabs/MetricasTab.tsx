import React, { useState, useEffect } from 'react';
import { Users, Clock, Flame, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, Badge, Button } from '../../ui';
import { reportsApi } from '../../../services/api';
import { KpiCard, TH, TD, fmtSeconds } from './_shared';

export const MetricasTab: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);

  const load = async () => {
    try { setDashboard(await reportsApi.dashboard() as any); } catch { /* ok */ }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          label="Pacientes Hoy"
          value={dashboard?.totalTicketsToday ?? 0}
          sub="Turnos generados hoy"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5" />}
          label="En Espera"
          value={dashboard?.waitingCount ?? 0}
          sub="Pacientes en salas de espera"
          trend="up"
        />
        <KpiCard
          icon={<Flame className="w-5 h-5" />}
          label="Tiempo Promedio"
          value={`${Math.round(dashboard?.avgWaitTimeMinutes ?? 0)} min`}
          sub="Desde emisión hasta llamado"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Atendidos"
          value={dashboard?.attendedCount ?? 0}
          sub="Consultas completadas hoy"
          trend="up"
        />
      </div>

      <Card padding="none">
        <CardHeader
          className="px-6 pt-5 pb-0"
          title="Volumen por Especialidad Médica"
          subtitle="Estadísticas en tiempo real por servicio"
          action={
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
              Actualizar
            </Button>
          }
        />
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <TH>Especialidad</TH>
                <TH>Código</TH>
                <TH className="text-right">En espera</TH>
                <TH className="text-right">En atención</TH>
                <TH className="text-right">Atendidos</TH>
                <TH className="text-right">T. Espera Prom.</TH>
                <TH className="text-right">T. Atención Prom.</TH>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.serviceBreakdown ?? []).map((s: any) => (
                <tr key={s.serviceCode} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <TD><span className="font-semibold text-surface-900">{s.serviceName}</span></TD>
                  <TD><Badge variant="primary">{s.serviceCode}</Badge></TD>
                  <TD className="text-right font-mono text-surface-700">{s.waiting ?? s.totalTickets}</TD>
                  <TD className="text-right font-mono text-surface-700">{s.inAttention ?? '—'}</TD>
                  <TD className="text-right font-mono text-green-700 font-semibold">{s.attended}</TD>
                  <TD className="text-right font-mono text-surface-600">{Math.round(s.avgWaitMinutes)} min</TD>
                  <TD className="text-right font-mono text-surface-600">{Math.round(s.avgAttentionMinutes)} min</TD>
                </tr>
              ))}
              {!(dashboard?.serviceBreakdown?.length) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-surface-400 text-sm">
                    Sin datos disponibles para hoy
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
