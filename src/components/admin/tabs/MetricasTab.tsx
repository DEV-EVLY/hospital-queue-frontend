import React, { useState, useEffect, useCallback } from 'react';
import { Users, Clock, Flame, CheckCircle2, RefreshCw, UserX } from 'lucide-react';
import { Card, CardHeader, Badge, Button, DatePicker } from '../../ui';
import { reportsApi } from '../../../services/api';
import { KpiCard, FormError, TH, TD } from './_shared';

// Local date (not UTC) so "hoy" matches the user's calendar day
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => fmt(new Date());

const PRESETS: { key: string; label: string; range: () => [string, string] }[] = [
  { key: 'today', label: 'Hoy', range: () => [todayStr(), todayStr()] },
  { key: '7d',    label: 'Últimos 7 días', range: () => { const d = new Date(); d.setDate(d.getDate() - 6); return [fmt(d), todayStr()]; } },
  { key: '30d',   label: 'Últimos 30 días', range: () => { const d = new Date(); d.setDate(d.getDate() - 29); return [fmt(d), todayStr()]; } },
  { key: 'month', label: 'Este mes', range: () => { const d = new Date(); return [fmt(new Date(d.getFullYear(), d.getMonth(), 1)), todayStr()]; } },
  { key: 'prev',  label: 'Mes anterior', range: () => { const d = new Date(); return [fmt(new Date(d.getFullYear(), d.getMonth() - 1, 1)), fmt(new Date(d.getFullYear(), d.getMonth(), 0))]; } },
];

const PRIORITY_LABELS: Record<string, { label: string; variant: 'danger' | 'warning' | 'primary' | 'gray' }> = {
  URGENT:       { label: 'Urgente',      variant: 'danger' },
  PREFERENTIAL: { label: 'Preferencial', variant: 'warning' },
  NORMAL:       { label: 'Normal',       variant: 'primary' },
};

export const MetricasTab: React.FC = () => {
  const [from,      setFrom]      = useState(todayStr());
  const [to,        setTo]        = useState(todayStr());
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const isToday   = from === todayStr() && to === todayStr();
  const isSingle  = from === to;
  const when      = isToday ? 'hoy' : isSingle ? 'en la fecha' : 'en el período';
  const rangeText = isSingle ? from : `${from} a ${to}`;

  const changeFrom = (d: string) => { if (!d) return; setFrom(d); if (d > to) setTo(d); };
  const changeTo   = (d: string) => { if (!d) return; setTo(d); if (d < from) setFrom(d); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDashboard(await reportsApi.dashboard(from, to) as any);
      setError(null);
    } catch {
      setError('No se pudieron cargar las métricas. Verifica la conexión con el servidor.');
    } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => {
    load();
    if (to !== todayStr()) return;      // live-refresh only when the range includes today
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load, to]);

  const priority = Object.entries(dashboard?.priorityDistribution ?? {}) as [string, number][];
  const priorityTotal = priority.reduce((a, [, n]) => a + n, 0);

  const hourly = Object.entries(dashboard?.hourlyDemand ?? {})
    .map(([h, n]) => [Number(h), n as number] as const)
    .sort((a, b) => a[0] - b[0]);
  const hourlyMax = Math.max(1, ...hourly.map(([, n]) => n));

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <DatePicker label="Desde" value={from} onChange={changeFrom} max={todayStr()} />
          <DatePicker label="Hasta" value={to} onChange={changeTo} max={todayStr()} />
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} loading={loading}
            onClick={load} className="mb-0.5">
            Actualizar
          </Button>
          {to === todayStr() && (
            <span className="text-xs text-surface-400 mb-2.5">Se actualiza automáticamente cada 30 s</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {PRESETS.map(p => {
            const [f, t] = p.range();
            const active = f === from && t === to;
            return (
              <Button key={p.key} size="sm" variant={active ? 'primary' : 'ghost'}
                onClick={() => { setFrom(f); setTo(t); }}>
                {p.label}
              </Button>
            );
          })}
        </div>
      </Card>

      <FormError msg={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          label="Turnos"
          value={dashboard?.totalTicketsToday ?? 0}
          sub={`Turnos generados ${when}`}
        />
        <KpiCard
          icon={<Clock className="w-5 h-5" />}
          label="En Espera"
          value={dashboard?.waitingCount ?? 0}
          sub="Pacientes en salas de espera"
        />
        <KpiCard
          icon={<Flame className="w-5 h-5" />}
          label="Espera Promedio"
          value={`${Math.round(dashboard?.avgWaitTimeMinutes ?? 0)} min`}
          sub="Desde emisión hasta llamado"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Atendidos"
          value={dashboard?.attendedCount ?? 0}
          sub={`Consultas completadas ${when}`}
        />
        <KpiCard
          icon={<UserX className="w-5 h-5" />}
          label="No Presentados"
          value={dashboard?.notAttendedCount ?? 0}
          sub="Llamados que no acudieron"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Distribución por Prioridad" subtitle={`Turnos ${when} según nivel`} />
          <div className="mt-4 space-y-3">
            {priority.length === 0 && <p className="text-sm text-surface-400 py-4 text-center">Sin datos</p>}
            {priority.map(([key, n]) => {
              const meta = PRIORITY_LABELS[key] ?? { label: key, variant: 'gray' as const };
              const pct = priorityTotal ? Math.round((n / priorityTotal) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <span className="font-mono text-surface-600">{n} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Demanda por Hora" subtitle="Turnos emitidos por franja horaria" />
          <div className="mt-4">
            {hourly.length === 0
              ? <p className="text-sm text-surface-400 py-4 text-center">Sin datos</p>
              : (
                <div className="flex items-end gap-1.5 h-36">
                  {hourly.map(([h, n]) => (
                    <div key={h} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${h}:00 — ${n} turnos`}>
                      <span className="text-[10px] font-mono text-surface-500">{n}</span>
                      <div className="w-full rounded-t bg-primary-500" style={{ height: `${(n / hourlyMax) * 100}%`, minHeight: 2 }} />
                      <span className="text-[10px] text-surface-400">{h}h</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader
          className="px-6 pt-5 pb-0"
          title="Volumen por Especialidad Médica"
          subtitle={isToday ? 'Estadísticas en tiempo real por servicio' : `Estadísticas de ${rangeText} por servicio`}
        />
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <TH>Especialidad</TH>
                <TH>Código</TH>
                <TH className="text-right">Total</TH>
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
                  <TD className="text-right font-mono text-surface-700">{s.totalTickets}</TD>
                  <TD className="text-right font-mono text-surface-700">{s.waiting}</TD>
                  <TD className="text-right font-mono text-surface-700">{s.inAttention}</TD>
                  <TD className="text-right font-mono text-green-700 font-semibold">{s.attended}</TD>
                  <TD className="text-right font-mono text-surface-600">{Math.round(s.avgWaitMinutes)} min</TD>
                  <TD className="text-right font-mono text-surface-600">{Math.round(s.avgAttentionMinutes)} min</TD>
                </tr>
              ))}
              {!(dashboard?.serviceBreakdown?.length) && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-surface-400 text-sm">
                    Sin datos disponibles {isToday ? 'para hoy' : 'en este período'}
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
