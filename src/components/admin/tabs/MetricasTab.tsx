import React, { useState, useEffect, useCallback } from 'react';
import { Users, Clock, Flame, CheckCircle2, RefreshCw, UserX } from 'lucide-react';
import { Card, CardHeader, Badge, Button, DatePicker } from '../../ui';
import { reportsApi } from '../../../services/api';
import { KpiCard, FormError, TH, TD } from './_shared';
import type { DashboardReport, ServiceBreakdown, PriorityLevel } from '../../../types/api';
import { tr, trp, priorityLabel } from '../../../i18n';

// Local date (not UTC) so "hoy" matches the user's calendar day
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => fmt(new Date());

const presets = (): { key: string; label: string; range: () => [string, string] }[] => [
  { key: 'today', label: tr('common.hoy'), range: () => [todayStr(), todayStr()] },
  { key: '7d',    label: tr('metricas.preset_7d'), range: () => { const d = new Date(); d.setDate(d.getDate() - 6); return [fmt(d), todayStr()]; } },
  { key: '30d',   label: tr('metricas.preset_30d'), range: () => { const d = new Date(); d.setDate(d.getDate() - 29); return [fmt(d), todayStr()]; } },
  { key: 'month', label: tr('metricas.preset_month'), range: () => { const d = new Date(); return [fmt(new Date(d.getFullYear(), d.getMonth(), 1)), todayStr()]; } },
  { key: 'prev',  label: tr('metricas.preset_prev'), range: () => { const d = new Date(); return [fmt(new Date(d.getFullYear(), d.getMonth() - 1, 1)), fmt(new Date(d.getFullYear(), d.getMonth(), 0))]; } },
];

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'primary' | 'gray'> = {
  URGENT: 'danger', PREFERENTIAL: 'warning', NORMAL: 'primary',
};

export const MetricasTab: React.FC = () => {
  const [from,      setFrom]      = useState(todayStr());
  const [to,        setTo]        = useState(todayStr());
  const [dashboard, setDashboard] = useState<DashboardReport | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const isToday   = from === todayStr() && to === todayStr();
  const isSingle  = from === to;
  const scope     = isToday ? 'today' : isSingle ? 'single' : 'range';
  const rangeText = isSingle ? from : tr('metricas.rango_a', { from, to });

  const changeFrom = (d: string) => { if (!d) return; setFrom(d); if (d > to) setTo(d); };
  const changeTo   = (d: string) => { if (!d) return; setTo(d); if (d < from) setFrom(d); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDashboard(await reportsApi.dashboard(from, to));
      setError(null);
    } catch {
      setError(tr('metricas.no_se_pudieron_cargar_metricas'));
    } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => {
    load();
    if (to !== todayStr()) return;      // live-refresh only when the range includes today
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load, to]);

  const priority = Object.entries(dashboard?.priorityDistribution ?? {});
  const priorityTotal = priority.reduce((a, [, n]) => a + n, 0);

  const hourly = Object.entries(dashboard?.hourlyDemand ?? {})
    .map(([h, n]) => [Number(h), n as number] as const)
    .sort((a, b) => a[0] - b[0]);
  const hourlyMax = Math.max(1, ...hourly.map(([, n]) => n));

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <DatePicker label={tr('metricas.desde')} value={from} onChange={changeFrom} max={todayStr()} />
          <DatePicker label={tr('metricas.hasta')} value={to} onChange={changeTo} max={todayStr()} />
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} loading={loading}
            onClick={load} className="mb-0.5">
            {tr('common.actualizar')}
          </Button>
          {to === todayStr() && (
            <span className="text-xs text-surface-400 mb-2.5">{tr('metricas.se_actualiza_automaticamente_cada_30')}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {presets().map(p => {
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
          label={tr('metricas.turnos')}
          value={dashboard?.totalTicketsToday ?? 0}
          sub={tr(`metricas.sub_turnos.${scope}`)}
        />
        <KpiCard
          icon={<Clock className="w-5 h-5" />}
          label={tr('common.espera')}
          value={dashboard?.waitingCount ?? 0}
          sub={tr('metricas.sub_espera')}
        />
        <KpiCard
          icon={<Flame className="w-5 h-5" />}
          label={tr('metricas.espera_promedio')}
          value={`${Math.round(dashboard?.avgWaitTimeMinutes ?? 0)} min`}
          sub={tr('metricas.sub_espera_promedio')}
        />
        <KpiCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label={tr('metricas.atendidos')}
          value={dashboard?.attendedCount ?? 0}
          sub={tr(`metricas.sub_atendidos.${scope}`)}
        />
        <KpiCard
          icon={<UserX className="w-5 h-5" />}
          label={tr('metricas.no_presentados')}
          value={dashboard?.notAttendedCount ?? 0}
          sub={tr('metricas.sub_no_presentados')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title={tr('metricas.distribucion_por_prioridad')} subtitle={tr(`metricas.sub_prioridad.${scope}`)} />
          <div className="mt-4 space-y-3">
            {priority.length === 0 && <p className="text-sm text-surface-400 py-4 text-center">{tr('metricas.sin_datos')}</p>}
            {priority.map(([key, n]) => {
              const variant = PRIORITY_VARIANT[key] ?? 'gray';
              const label = key in PRIORITY_VARIANT ? priorityLabel(key as PriorityLevel) : key;
              const pct = priorityTotal ? Math.round((n / priorityTotal) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <Badge variant={variant}>{label}</Badge>
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
          <CardHeader title={tr('metricas.demanda_por_hora')} subtitle={tr('metricas.turnos_emitidos_por_franja_horaria')} />
          <div className="mt-4">
            {hourly.length === 0
              ? <p className="text-sm text-surface-400 py-4 text-center">{tr('metricas.sin_datos')}</p>
              : (
                <div className="flex items-end gap-1.5 h-36">
                  {hourly.map(([h, n]) => (
                    <div key={h} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={tr('metricas.hora_titulo', { hour: h, count: trp('metricas.turnos_n', n) })}>
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
          title={tr('metricas.volumen_por_especialidad_medica')}
          subtitle={isToday ? tr('metricas.sub_servicio_vivo') : tr('metricas.sub_servicio_rango', { range: rangeText })}
        />
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <TH>{tr('common.especialidad')}</TH>
                <TH>{tr('common.codigo')}</TH>
                <TH className="text-right">{tr('metricas.total')}</TH>
                <TH className="text-right">{tr('metricas.espera')}</TH>
                <TH className="text-right">{tr('metricas.atencion')}</TH>
                <TH className="text-right">{tr('metricas.atendidos')}</TH>
                <TH className="text-right">{tr('metricas.t_espera_prom')}</TH>
                <TH className="text-right">{tr('metricas.t_atencion_prom')}</TH>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.serviceBreakdown ?? []).map((s: ServiceBreakdown) => (
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
                    {isToday ? tr('metricas.sin_datos_hoy') : tr('metricas.sin_datos_periodo')}
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
