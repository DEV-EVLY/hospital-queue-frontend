// Qué contiene cada exportación (Excel / PDF). Solo arma datos; la generación del archivo está en reportExport.ts.

import type { ISODate, DashboardReport, PriorityLevel, TicketReportRow } from '../types/api';
import type { ExportDoc } from './reportExport';
import { tr, statusLabel, channelLabel, priorityLabel, formatTime } from '../i18n';

const min1 = (n: number | null | undefined): number | null =>
  n === null || n === undefined ? null : Math.round(n * 10) / 10;
const secToMin = (s: number | null | undefined): number | null =>
  s === null || s === undefined ? null : Math.round((s / 60) * 10) / 10;

const rangeLabel = (from: ISODate, to: ISODate): string =>
  from === to ? from : tr('metricas.rango_a', { from, to });

export const exportFileName = (kind: string, from: ISODate, to: ISODate, ext: 'xlsx' | 'pdf'): string =>
  `${kind}_${from}${from === to ? '' : `_${to}`}.${ext}`;

/** Listado de turnos del reporte filtrado. */
export function ticketsDoc(rows: TicketReportRow[], from: ISODate, to: ISODate): ExportDoc {
  return {
    title: tr('reportes.titulo_reporte'),
    subtitle: rangeLabel(from, to),
    tables: [{
      name: tr('reportes.titulo_reporte'),
      headers: [
        tr('common.ticket'), tr('common.servicio'), tr('common.estado'), tr('common.prioridad'), tr('common.canal'),
        tr('common.fecha'), tr('reportes.hora_emision'), tr('reportes.t_espera_min'), tr('reportes.t_atencion_min'),
      ],
      rows: rows.map(r => [
        r.ticketCode,
        r.medicalServiceName ?? '',
        statusLabel(r.status),
        priorityLabel(r.priorityLevel),
        channelLabel(r.channel),
        r.reportDate,
        r.issuedAt ? formatTime(r.issuedAt, true) : null,
        secToMin(r.waitTimeSeconds),
        secToMin(r.attentionTimeSeconds),
      ]),
    }],
  };
}

/** Métricas del dashboard, con la espera por servicio y hora. */
export function metricsDoc(d: DashboardReport, from: ISODate, to: ISODate): ExportDoc {
  const waitByHour = new Map(d.waitByHour.map(w => [w.hour, w]));
  const hours = new Set<number>([...Object.keys(d.hourlyDemand).map(Number), ...d.waitByHour.map(w => w.hour)]);

  return {
    title: tr('metricas.titulo_reporte'),
    subtitle: rangeLabel(from, to),
    tables: [
      {
        name: tr('metricas.resumen'),
        headers: [tr('metricas.indicador'), tr('metricas.valor')],
        rows: [
          [tr('metricas.turnos'), d.totalTicketsToday],
          [tr('common.espera'), d.waitingCount],
          [tr('metricas.atencion'), d.inAttentionCount],
          [tr('metricas.atendidos'), d.attendedCount],
          [tr('metricas.no_presentados'), d.notAttendedCount],
          [tr('metricas.espera_promedio'), min1(d.avgWaitTimeMinutes)],
          [tr('metricas.t_atencion_prom'), min1(d.avgAttentionTimeMinutes)],
        ],
      },
      {
        name: tr('metricas.volumen_por_especialidad_medica'),
        headers: [
          tr('common.especialidad'), tr('common.codigo'), tr('metricas.total'), tr('metricas.espera'),
          tr('metricas.atencion'), tr('metricas.atendidos'), tr('metricas.t_espera_prom'), tr('metricas.t_atencion_prom'),
        ],
        rows: d.serviceBreakdown.map(s => [
          s.serviceName, s.serviceCode, s.totalTickets, s.waiting, s.inAttention, s.attended,
          min1(s.avgWaitMinutes), min1(s.avgAttentionMinutes),
        ]),
      },
      {
        name: tr('metricas.espera_servicio_hora'),
        headers: [
          tr('common.especialidad'), tr('common.codigo'), tr('metricas.hora'),
          tr('metricas.turnos'), tr('metricas.t_espera_prom'), tr('metricas.espera_max'),
        ],
        rows: d.waitByServiceHour.map(w => [
          w.serviceName, w.serviceCode, `${w.hour}:00`, w.tickets, min1(w.avgWaitMinutes), min1(w.maxWaitMinutes),
        ]),
      },
      {
        name: tr('metricas.demanda_por_hora'),
        headers: [tr('metricas.hora'), tr('metricas.turnos'), tr('metricas.t_espera_prom'), tr('metricas.espera_max')],
        rows: [...hours].sort((a, b) => a - b).map(h => [
          `${h}:00`,
          d.hourlyDemand[String(h)] ?? 0,
          min1(waitByHour.get(h)?.avgWaitMinutes),
          min1(waitByHour.get(h)?.maxWaitMinutes),
        ]),
      },
      {
        name: tr('metricas.distribucion_por_prioridad'),
        headers: [tr('common.prioridad'), tr('metricas.turnos')],
        rows: Object.entries(d.priorityDistribution).map(([k, n]) => [
          k === 'NORMAL' || k === 'PREFERENTIAL' || k === 'URGENT' ? priorityLabel(k as PriorityLevel) : k, n,
        ]),
      },
    ],
  };
}
