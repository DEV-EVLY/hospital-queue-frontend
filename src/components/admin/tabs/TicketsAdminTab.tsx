import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, XCircle, ArrowUpDown } from 'lucide-react';
import { Card, Badge, Button, Modal, Select, Spinner, DatePicker, Pagination } from '../../ui';
import type { SelectOption } from '../../ui';
import { ticketsApi, medicalServicesApi, getErrorMessage } from '../../../services/api';
import { FormError, TH, TD, STATUS_LABELS, CHANNEL_LABELS } from './_shared';
import type { Ticket, MedicalService, PriorityLevel, TicketStatus } from '../../../types/api';

// Local calendar day (toISOString would give the UTC day, wrong after 19:00 in Lima)
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const PRIORITY_OPTIONS: SelectOption<PriorityLevel | ''>[] = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'URGENT',       label: 'Urgente' },
  { value: 'PREFERENTIAL', label: 'Preferencial' },
  { value: 'NORMAL',       label: 'Normal' },
];

const STATUS_OPTIONS: SelectOption<TicketStatus | ''>[] = [
  { value: '',            label: 'Todos los estados' },
  { value: 'WAITING',     label: 'En Espera' },
  { value: 'CALLED',      label: 'Llamado' },
  { value: 'IN_ATTENTION', label: 'En Atención' },
  { value: 'ATTENDED',    label: 'Atendido' },
  { value: 'NOT_ATTENDED', label: 'No Presentado' },
  { value: 'REFERRED',    label: 'Derivado' },
  { value: 'CANCELLED',   label: 'Cancelado' },
];

const ACTIVE_STATUSES = new Set(['WAITING', 'CALLED', 'IN_ATTENTION']);

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—';

const PAGE_SIZE = 50;

export const TicketsAdminTab: React.FC = () => {
  const [date,           setDate]           = useState(today());
  const [tickets,        setTickets]        = useState<Ticket[]>([]);
  const [page,           setPage]           = useState(0);
  const [totalElements,  setTotalElements]  = useState(0);
  const [totalPages,     setTotalPages]     = useState(0);
  const [services,       setServices]       = useState<MedicalService[]>([]);
  const [filterService,  setFilterService]  = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [reprioTarget,   setReprioTarget]   = useState<Ticket | null>(null);
  const [newPriority,    setNewPriority]    = useState<PriorityLevel>('URGENT');

  const loadTickets = useCallback(async (d: string, p: number) => {
    setLoading(true);
    try {
      const data = await ticketsApi.adminList(d, p, PAGE_SIZE);
      setTickets(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
      setTotalPages(data.totalPages ?? 0);
    }
    catch (e: unknown) { setError(`Error al cargar tickets: ${getErrorMessage(e)}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    medicalServicesApi.list()
      .then(setServices)
      .catch((e: unknown) => setError(`Error al cargar servicios: ${getErrorMessage(e)}`));
  }, []);

  useEffect(() => { loadTickets(date, page); }, [date, page, loadTickets]);

  const filtered = tickets.filter(t =>
    (!filterService  || t.medicalServiceId === filterService) &&
    (!filterStatus   || t.status           === filterStatus)  &&
    (!filterPriority || t.priorityLevel    === filterPriority)
  );

  const handleCancel = async (t: Ticket) => {
    setError(null);
    try {
      const updated = await ticketsApi.cancel(t.id);
      setTickets(prev => prev.map(x => x.id === t.id ? updated : x));
    } catch (e: unknown) { setError(`No se pudo cancelar: ${getErrorMessage(e)}`); }
  };

  const handleReprioritize = async () => {
    if (!reprioTarget) return;
    setError(null);
    try {
      const updated = await ticketsApi.reprioritize(reprioTarget.id, newPriority);
      setTickets(prev => prev.map(x => x.id === reprioTarget.id ? updated : x));
      setReprioTarget(null);
    } catch (e: unknown) { setError(`No se pudo repriorizar: ${getErrorMessage(e)}`); }
  };

  const serviceOptions = [
    { value: '', label: 'Todos los servicios' },
    ...services.map(s => ({ value: s.id, label: s.name })),
  ];

  const serviceName = (id: string) => services.find(s => s.id === id)?.name || id.slice(0, 8) + '…';

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <DatePicker label="Fecha" value={date} onChange={d => { setDate(d); setPage(0); }} max={today()} />
          <Select label="Servicio"  value={filterService}  onChange={setFilterService}  options={serviceOptions}  />
          <Select label="Estado"    value={filterStatus}   onChange={setFilterStatus}   options={STATUS_OPTIONS}  />
          <Select label="Prioridad" value={filterPriority} onChange={setFilterPriority} options={PRIORITY_OPTIONS} />
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} loading={loading}
            onClick={() => loadTickets(date, page)} className="mb-0.5">
            Actualizar
          </Button>
        </div>
      </Card>

      {error && <FormError msg={error} onDismiss={() => setError(null)} />}

      <Card padding="none">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-900">
            Tickets del {date}
            <span className="ml-2 text-xs font-normal text-surface-500">
              ({filtered.length} en esta página · {totalElements} total)
            </span>
          </h3>
          {loading && <Spinner />}
        </div>
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-surface-100">
                <TH>Ticket</TH>
                <TH>Servicio</TH>
                <TH>Estado</TH>
                <TH>Prioridad</TH>
                <TH>Canal</TH>
                <TH>Emisión</TH>
                <TH className="text-right">Acciones</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <TD>
                    <code className="font-mono font-bold text-primary-700 text-xs">{t.ticketCode}</code>
                  </TD>
                  <TD className="text-surface-700">{serviceName(t.medicalServiceId)}</TD>
                  <TD className="font-medium text-surface-700">
                    {STATUS_LABELS[t.status] ?? t.status}
                  </TD>
                  <TD>
                    {t.priorityLevel === 'URGENT'
                      ? <Badge variant="danger">Urgente</Badge>
                      : t.priorityLevel === 'PREFERENTIAL'
                        ? <Badge variant="warning">Preferencial</Badge>
                        : <Badge variant="primary">Normal</Badge>
                    }
                  </TD>
                  <TD className="text-surface-600">{CHANNEL_LABELS[t.channel] ?? t.channel}</TD>
                  <TD className="font-mono text-xs text-surface-500">{fmtTime(t.issuedAt)}</TD>
                  <TD className="text-right">
                    {ACTIVE_STATUSES.has(t.status) && (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => { setReprioTarget(t); setNewPriority(t.priorityLevel || 'NORMAL'); }}
                          title="Cambiar prioridad"
                          className="p-1.5 rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCancel(t)}
                          title="Cancelar ticket"
                          className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </TD>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-surface-400 text-sm">
                    No hay tickets para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6">
          <Pagination
            page={page}
            size={PAGE_SIZE}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={p => setPage(p)}
          />
        </div>
      </Card>

      <Modal
        open={!!reprioTarget}
        onClose={() => setReprioTarget(null)}
        title="Cambiar Prioridad"
        description={`Ticket: ${reprioTarget?.ticketCode}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReprioTarget(null)}>Cancelar</Button>
            <Button onClick={handleReprioritize}>Aplicar</Button>
          </>
        }
      >
        <Select
          label="Nueva prioridad"
          value={newPriority}
          onChange={setNewPriority}
          options={[
            { value: 'URGENT',       label: 'Urgente' },
            { value: 'PREFERENTIAL', label: 'Preferencial' },
            { value: 'NORMAL',       label: 'Normal' },
          ]}
          fullWidth
        />
      </Modal>
    </div>
  );
};
