import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Card, CardHeader, CardFooter, Badge, PriorityBadge, Button, Spinner } from '../../ui';
import { DatePicker } from '../../ui';
import { Select } from '../../ui';
import type { SelectOption } from '../../ui';
import { reportsApi, medicalServicesApi, getErrorMessage } from '../../../services/api';
import { exportXlsx, exportPdf } from '../../../services/reportExport';
import { ticketsDoc, exportFileName } from '../../../services/reportDocs';
import { TH, TD, fmtSeconds } from './_shared';
import type { MedicalService, TicketReportRow, PriorityLevel, IssuanceChannel, ReportFilterParams } from '../../../types/api';
import { tr, statusLabel, channelLabel, priorityOptions, channelOptions, withEmpty } from '../../../i18n';

// Local calendar day (toISOString would give the UTC day, wrong after 19:00 in Lima)
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MAX_RANGE_DAYS = 90;

/** Returns an error message if the range is invalid, otherwise null. */
const validateRange = (from: string, to: string): string | null => {
  if (!from || !to) return tr('reportes.rango_incompleto');
  if (to < from) return tr('reportes.rango_invertido');
  const days = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
  if (days > MAX_RANGE_DAYS) return tr('reportes.rango_muy_largo', { max: MAX_RANGE_DAYS });
  return null;
};

export const ReportesTab: React.FC = () => {
  const [services,     setServices]     = useState<MedicalService[]>([]);
  const [fechaInicio,  setFechaInicio]  = useState(today());
  const [fechaFin,     setFechaFin]     = useState(today());
  const [servicio,     setServicio]     = useState('');
  const [prioridad,    setPrioridad]    = useState<PriorityLevel | ''>('');
  const [canal,        setCanal]        = useState<IssuanceChannel | ''>('');
  const [rows,         setRows]         = useState<TicketReportRow[]>([]);
  const [searched,     setSearched]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [queryError,   setQueryError]   = useState<string | null>(null);
  const [exporting,    setExporting]    = useState<'xlsx' | 'pdf' | null>(null);

  useEffect(() => {
    medicalServicesApi.list()
      .then(setServices)
      .catch((e: unknown) => setQueryError(tr('common.error_cargar_servicios_error', { error: getErrorMessage(e) })));
  }, []);

  const serviceOptions = [
    { value: '', label: tr('common.todos_los_servicios') },
    ...services.map(s => ({ value: s.id, label: s.name })),
  ];

  const buildParams = (): ReportFilterParams => ({
    startDate: fechaInicio,
    endDate: fechaFin,
    ...(servicio  ? { serviceId:     servicio  } : {}),
    ...(prioridad ? { priorityLevel: prioridad } : {}),
    ...(canal     ? { channel:       canal     } : {}),
  });

  const runQuery = async () => {
    const invalid = validateRange(fechaInicio, fechaFin);
    if (invalid) { setQueryError(invalid); return; }
    setLoading(true);
    setQueryError(null);
    try {
      const result = await reportsApi.export(buildParams());
      setRows(Array.isArray(result) ? result : []);
      setSearched(true);
    } catch (e: unknown) {
      setQueryError(getErrorMessage(e) || tr('reportes.error_generar'));
    } finally { setLoading(false); }
  };

  const downloadCsv = async () => {
    const invalid = validateRange(fechaInicio, fechaFin);
    if (invalid) { setQueryError(invalid); return; }
    setLoading(true);
    setQueryError(null);
    try {
      await reportsApi.downloadCsv(buildParams());
    } catch (e: unknown) {
      setQueryError(getErrorMessage(e) || tr('reportes.error_exportar'));
    } finally { setLoading(false); }
  };

  /** Excel/PDF salen de las filas ya consultadas; si aún no se buscó, se consulta primero con los mismos filtros. */
  const exportFile = async (kind: 'xlsx' | 'pdf') => {
    const invalid = validateRange(fechaInicio, fechaFin);
    if (invalid) { setQueryError(invalid); return; }
    setExporting(kind);
    setQueryError(null);
    try {
      const data = searched ? rows : await reportsApi.export(buildParams());
      const list = Array.isArray(data) ? data : [];
      if (!searched) { setRows(list); setSearched(true); }
      const doc = ticketsDoc(list, fechaInicio, fechaFin);
      if (kind === 'xlsx') await exportXlsx(exportFileName('reporte-turnos', fechaInicio, fechaFin, 'xlsx'), doc);
      else await exportPdf(exportFileName('reporte-turnos', fechaInicio, fechaFin, 'pdf'), doc);
    } catch (e: unknown) {
      setQueryError(getErrorMessage(e, tr('reportes.error_exportar_archivo')));
    } finally { setExporting(null); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={tr('reportes.filtros_exportacion_y_analisis')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DatePicker
            label={tr('reportes.fecha_inicio')}
            value={fechaInicio}
            onChange={setFechaInicio}
            max={fechaFin || undefined}
            fullWidth
          />
          <DatePicker
            label={tr('reportes.fecha_fin')}
            value={fechaFin}
            onChange={setFechaFin}
            min={fechaInicio || undefined}
            fullWidth
          />
          <Select
            label={tr('common.servicio')}
            value={servicio}
            onChange={setServicio}
            options={serviceOptions}
            fullWidth
          />
          <Select
            label={tr('common.prioridad')}
            value={prioridad}
            onChange={setPrioridad}
            options={withEmpty(tr('common.todas'), priorityOptions())}
            fullWidth
          />
          <Select
            label={tr('common.canal')}
            value={canal}
            onChange={setCanal}
            options={withEmpty(tr('reportes.todos_los_canales'), channelOptions())}
            fullWidth
          />
        </div>
        <CardFooter className="mt-4 pt-4">
          <Button
            variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}
            loading={loading} onClick={downloadCsv}
          >
            {tr('reportes.exportar_csv')}
          </Button>
          <Button
            variant="secondary" size="sm" icon={<FileSpreadsheet className="w-4 h-4" />}
            loading={exporting === 'xlsx'} disabled={exporting !== null || loading} onClick={() => exportFile('xlsx')}
          >
            {tr('reportes.exportar_excel')}
          </Button>
          <Button
            variant="secondary" size="sm" icon={<FileText className="w-4 h-4" />}
            loading={exporting === 'pdf'} disabled={exporting !== null || loading} onClick={() => exportFile('pdf')}
          >
            {tr('reportes.exportar_pdf')}
          </Button>
          <Button size="sm" loading={loading} onClick={runQuery}>
            {tr('reportes.buscar')}
          </Button>
        </CardFooter>
      </Card>

      {queryError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-xs font-semibold">
          <span>{queryError}</span>
          <button onClick={() => setQueryError(null)} className="ml-4 text-red-400 hover:text-red-600 font-bold text-sm leading-none">&times;</button>
        </div>
      )}

      <Card padding="none">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-900">
            Resultados
            {rows.length > 0 && <Badge variant="primary" className="ml-2">{rows.length}</Badge>}
          </h3>
          {loading && <Spinner />}
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-surface-100">
                <TH>{tr('common.ticket')}</TH>
                <TH>{tr('common.servicio')}</TH>
                <TH>{tr('common.estado')}</TH>
                <TH>{tr('common.prioridad')}</TH>
                <TH>{tr('common.canal')}</TH>
                <TH className="text-right">{tr('reportes.t_espera')}</TH>
                <TH className="text-right">{tr('reportes.t_atencion')}</TH>
                <TH>{tr('common.fecha')}</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <TD><code className="font-mono font-bold text-primary-700 text-xs">{row.ticketCode}</code></TD>
                  <TD className="text-surface-700">{row.medicalServiceName}</TD>
                  <TD className="font-medium text-surface-700">{statusLabel(row.status)}</TD>
                  <TD><PriorityBadge priority={row.priorityLevel} /></TD>
                  <TD className="text-surface-600">{channelLabel(row.channel)}</TD>
                  <TD className="text-right font-mono text-amber-700">{fmtSeconds(row.waitTimeSeconds)}</TD>
                  <TD className="text-right font-mono text-green-700">{fmtSeconds(row.attentionTimeSeconds)}</TD>
                  <TD className="text-surface-500 text-xs">{row.reportDate}</TD>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-surface-400 text-sm">
                    {searched ? tr('reportes.sin_resultados') : tr('reportes.aplica_filtros')}
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
