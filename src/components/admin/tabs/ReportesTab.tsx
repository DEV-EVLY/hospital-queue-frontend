import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Card, CardHeader, CardFooter, Badge, Button, Spinner } from '../../ui';
import { DatePicker } from '../../ui';
import { Select } from '../../ui';
import { reportsApi, medicalServicesApi } from '../../../services/api';
import { TH, TD, STATUS_LABELS, CHANNEL_LABELS, fmtSeconds } from './_shared';

const today = () => new Date().toISOString().split('T')[0];

export const ReportesTab: React.FC = () => {
  const [services,     setServices]     = useState<any[]>([]);
  const [fechaInicio,  setFechaInicio]  = useState(today());
  const [fechaFin,     setFechaFin]     = useState(today());
  const [servicio,     setServicio]     = useState('');
  const [prioridad,    setPrioridad]    = useState('');
  const [canal,        setCanal]        = useState('');
  const [rows,         setRows]         = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [queryError,   setQueryError]   = useState<string | null>(null);

  useEffect(() => {
    medicalServicesApi.list().then(s => setServices(s as any[])).catch(() => {/* ok */});
  }, []);

  const serviceOptions = [
    { value: '', label: 'Todos los servicios' },
    ...services.map(s => ({ value: s.id, label: s.name })),
  ];

  const runQuery = async () => {
    setLoading(true);
    setQueryError(null);
    try {
      const params: Record<string, string> = { startDate: fechaInicio, endDate: fechaFin, format: 'json' };
      if (servicio)  params.serviceId     = servicio;
      if (prioridad) params.priorityLevel = prioridad;
      if (canal)     params.channel       = canal;
      const result = await reportsApi.export(params) as any[];
      setRows(Array.isArray(result) ? result : []);
    } catch (e: any) {
      setQueryError(e.message || 'Error al generar el reporte. Intenta de nuevo.');
    } finally { setLoading(false); }
  };

  const downloadCsv = async () => {
    setLoading(true);
    setQueryError(null);
    try {
      await reportsApi.downloadCsv({
        startDate: fechaInicio, endDate: fechaFin,
        ...(servicio  ? { serviceId:     servicio  } : {}),
        ...(prioridad ? { priorityLevel: prioridad } : {}),
        ...(canal     ? { channel:       canal     } : {}),
      });
    } catch (e: any) {
      setQueryError(e.message || 'Error al exportar el CSV.');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Filtros de Exportación y Análisis" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DatePicker
            label="Fecha inicio"
            value={fechaInicio}
            onChange={setFechaInicio}
            max={fechaFin || undefined}
            fullWidth
          />
          <DatePicker
            label="Fecha fin"
            value={fechaFin}
            onChange={setFechaFin}
            min={fechaInicio || undefined}
            fullWidth
          />
          <Select
            label="Servicio"
            value={servicio}
            onChange={setServicio}
            options={serviceOptions}
            fullWidth
          />
          <Select
            label="Prioridad"
            value={prioridad}
            onChange={setPrioridad}
            options={[
              { value: '', label: 'Todas' },
              { value: 'URGENT', label: 'Urgente' },
              { value: 'PREFERENTIAL', label: 'Preferencial' },
              { value: 'NORMAL', label: 'Normal' },
            ]}
            fullWidth
          />
          <Select
            label="Canal"
            value={canal}
            onChange={setCanal}
            options={[
              { value: '', label: 'Todos los canales' },
              { value: 'KIOSK', label: 'Kiosko' },
              { value: 'OPERATOR', label: 'Operador' },
              { value: 'WEB', label: 'Web' },
              { value: 'HIS_AUTO', label: 'HIS Automático' },
            ]}
            fullWidth
          />
        </div>
        <CardFooter className="mt-4 pt-4">
          <Button
            variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}
            loading={loading} onClick={downloadCsv}
          >
            Exportar CSV
          </Button>
          <Button size="sm" loading={loading} onClick={runQuery}>
            Buscar
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
                <TH>Ticket</TH>
                <TH>Servicio</TH>
                <TH>Estado</TH>
                <TH>Prioridad</TH>
                <TH>Canal</TH>
                <TH className="text-right">T. Espera</TH>
                <TH className="text-right">T. Atención</TH>
                <TH>Fecha</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <TD><code className="font-mono font-bold text-primary-700 text-xs">{row.ticketCode}</code></TD>
                  <TD className="text-surface-700">{row.medicalServiceName}</TD>
                  <TD className="font-medium text-surface-700">{STATUS_LABELS[row.status] ?? row.status}</TD>
                  <TD>
                    {row.priorityLevel === 'URGENT'
                      ? <Badge variant="danger">Urgente</Badge>
                      : row.priorityLevel === 'PREFERENTIAL'
                        ? <Badge variant="warning">Preferencial</Badge>
                        : <Badge variant="primary">Normal</Badge>
                    }
                  </TD>
                  <TD className="text-surface-600">{CHANNEL_LABELS[row.channel] ?? row.channel}</TD>
                  <TD className="text-right font-mono text-amber-700">{fmtSeconds(row.waitTimeSeconds)}</TD>
                  <TD className="text-right font-mono text-green-700">{fmtSeconds(row.attentionTimeSeconds)}</TD>
                  <TD className="text-surface-500 text-xs">{row.reportDate}</TD>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-surface-400 text-sm">
                    Aplica filtros y presiona Buscar para ver resultados
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
