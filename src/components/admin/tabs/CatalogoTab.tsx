import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, RefreshCw, Edit2, Save, Stethoscope, Building2 } from 'lucide-react';
import { Card, Badge, Button, Input, Modal, Tabs, Select } from '../../ui';
import { medicalServicesApi, consultingRoomsApi, getErrorMessage } from '../../../services/api';
import { FormError, TH, TD } from './_shared';
import type { MedicalService, ConsultingRoom } from '../../../types/api';
import { tr, roomStatusLabel, iconOptions } from '../../../i18n';

interface ServiceForm { name: string; ticketPrefix: string; iconName: string; estimatedMinutes: number }
interface RoomForm { name: string; code: string; medicalServiceId: string; location: string }

const BLANK_SERVICE: ServiceForm = { name: '', ticketPrefix: '', iconName: 'stethoscope', estimatedMinutes: 20 };
const BLANK_ROOM: RoomForm = { name: '', code: '', medicalServiceId: '', location: '' };

const ROOM_VARIANT: Record<string, 'success' | 'warning' | 'primary' | 'gray'> = {
  AVAILABLE: 'success', BUSY: 'warning', PAUSED: 'primary', CLOSED: 'gray',
};

const catalogTabs = () => [
  { key: 'SERVICIOS',    label: tr('catalogo.servicios_medicos'), icon: <Stethoscope className="w-4 h-4" /> },
  { key: 'CONSULTORIOS', label: tr('catalogo.consultorios'),      icon: <Building2 className="w-4 h-4" /> },
];

export const CatalogoTab: React.FC = () => {
  const [services, setServices] = useState<MedicalService[]>([]);
  const [rooms,    setRooms]    = useState<ConsultingRoom[]>([]);
  const [subTab,   setSubTab]   = useState<'SERVICIOS' | 'CONSULTORIOS'>('SERVICIOS');

  // Service modal (create + edit)
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm,      setServiceForm]      = useState<ServiceForm>({ ...BLANK_SERVICE });
  const [serviceError,     setServiceError]     = useState<string | null>(null);

  // Room modal (create + edit)
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomForm,      setRoomForm]      = useState<RoomForm>({ ...BLANK_ROOM });
  const [roomError,     setRoomError]     = useState<string | null>(null);

  const loadServices = async () => {
    try { setServices(await medicalServicesApi.list()); }
    catch (e: unknown) { setServiceError(tr('common.error_cargar_servicios_error', { error: getErrorMessage(e) })); }
  };
  const loadRooms = async () => {
    try { setRooms(await consultingRoomsApi.list()); }
    catch (e: unknown) { setRoomError(tr('catalogo.error_cargar_consultorios_error', { error: getErrorMessage(e) })); }
  };

  useEffect(() => { loadServices(); loadRooms(); }, []);

  // ── Service handlers ───────────────────────────────────────────────────────

  const openCreateService = () => {
    setServiceForm({ ...BLANK_SERVICE }); setEditingServiceId(null); setServiceError(null); setShowServiceModal(true);
  };
  const openEditService = (s: MedicalService) => {
    setServiceForm({ name: s.name, ticketPrefix: s.ticketPrefix, iconName: s.iconName || 'stethoscope', estimatedMinutes: s.estimatedMinutes });
    setEditingServiceId(s.id); setServiceError(null); setShowServiceModal(true);
  };
  const closeServiceModal = () => {
    setShowServiceModal(false); setServiceForm({ ...BLANK_SERVICE }); setServiceError(null);
  };

  const saveService = async () => {
    if (!serviceForm.name || !serviceForm.ticketPrefix) {
      setServiceError(tr('catalogo.nombre_y_prefijo_ticket_son')); return;
    }
    setServiceError(null);
    try {
      if (editingServiceId) {
        const updated = await medicalServicesApi.update(editingServiceId, serviceForm);
        setServices(prev => prev.map(s => s.id === editingServiceId ? updated : s));
      } else {
        const created = await medicalServicesApi.create(serviceForm);
        setServices(prev => [...prev, created]);
      }
      setShowServiceModal(false);
    } catch (e: unknown) { setServiceError(getErrorMessage(e)); }
  };

  const toggleService = async (id: string) => {
    try {
      await medicalServicesApi.toggleActive(id);
      setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    } catch (e: unknown) { setServiceError(tr('common.error_error', { error: getErrorMessage(e) })); }
  };

  // ── Room handlers ──────────────────────────────────────────────────────────

  const openCreateRoom = () => {
    setRoomForm({ ...BLANK_ROOM }); setEditingRoomId(null); setRoomError(null); setShowRoomModal(true);
  };
  const openEditRoom = (r: ConsultingRoom) => {
    setRoomForm({ name: r.name, code: r.code, medicalServiceId: r.medicalServiceId || '', location: r.location || '' });
    setEditingRoomId(r.id); setRoomError(null); setShowRoomModal(true);
  };
  const closeRoomModal = () => {
    setShowRoomModal(false); setRoomForm({ ...BLANK_ROOM }); setRoomError(null);
  };

  const saveRoom = async () => {
    if (!roomForm.name || !roomForm.code) {
      setRoomError(tr('catalogo.nombre_y_codigo_son_obligatorios')); return;
    }
    setRoomError(null);
    const payload = { ...roomForm, medicalServiceId: roomForm.medicalServiceId || null };
    try {
      if (editingRoomId) {
        const updated = await consultingRoomsApi.update(editingRoomId, payload);
        setRooms(prev => prev.map(r => r.id === editingRoomId ? updated : r));
      } else {
        const created = await consultingRoomsApi.create(payload);
        setRooms(prev => [...prev, created]);
      }
      setShowRoomModal(false);
    } catch (e: unknown) { setRoomError(getErrorMessage(e)); }
  };

  const toggleRoom = async (id: string) => {
    try {
      const updated = await consultingRoomsApi.toggleActive(id);
      setRooms(prev => prev.map(r => r.id === id ? updated : r));
    } catch (e: unknown) { setRoomError(tr('common.error_error', { error: getErrorMessage(e) })); }
  };

  const activeServiceOptions = [
    { value: '', label: tr('common.sin_asignar') },
    ...services.filter(s => s.active).map(s => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="space-y-6">
      <Tabs
        tabs={catalogTabs()}
        active={subTab}
        onChange={key => setSubTab(key as 'SERVICIOS' | 'CONSULTORIOS')}
        className="w-fit"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── Servicios ─────────────────────────────────────────────────── */}
          {subTab === 'SERVICIOS' && (
            <Card padding="none">
              <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">{tr('catalogo.servicios_medicos')}</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{services.length} servicios registrados</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadServices}>
                    {tr('common.recargar')}
                  </Button>
                  <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateService}>
                    {tr('common.agregar')}
                  </Button>
                </div>
              </div>
              {serviceError && <div className="px-6 pt-3"><FormError msg={serviceError} onDismiss={() => setServiceError(null)} /></div>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <TH>{tr('common.nombre')}</TH>
                      <TH>{tr('catalogo.prefijo')}</TH>
                      <TH className="text-right">{tr('catalogo.t_est')}</TH>
                      <TH>{tr('common.estado')}</TH>
                      <TH className="text-right">{tr('common.acciones')}</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(s => (
                      <tr key={s.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                        <TD><span className="font-semibold text-surface-900">{s.name}</span></TD>
                        <TD><Badge variant="primary">[{s.ticketPrefix}]</Badge></TD>
                        <TD className="text-right text-surface-600 font-mono">{s.estimatedMinutes} min</TD>
                        <TD>
                          <button onClick={() => toggleService(s.id)}>
                            {s.active
                              ? <Badge variant="success" dot>{tr('common.activo')}</Badge>
                              : <Badge variant="gray" dot>{tr('common.inactivo')}</Badge>}
                          </button>
                        </TD>
                        <TD className="text-right">
                          <button
                            onClick={() => openEditService(s)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </TD>
                      </tr>
                    ))}
                    {services.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-surface-400 text-sm">
                          {tr('catalogo.no_hay_servicios_medicos_registrados')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Consultorios ──────────────────────────────────────────────── */}
          {subTab === 'CONSULTORIOS' && (
            <Card padding="none">
              <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">{tr('catalogo.consultorios')}</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{rooms.length} consultorios registrados</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadRooms}>
                    {tr('common.recargar')}
                  </Button>
                  <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateRoom}>
                    {tr('common.agregar')}
                  </Button>
                </div>
              </div>
              {roomError && <div className="px-6 pt-3"><FormError msg={roomError} onDismiss={() => setRoomError(null)} /></div>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <TH>{tr('common.nombre')}</TH>
                      <TH>{tr('common.codigo')}</TH>
                      <TH>{tr('common.servicio')}</TH>
                      <TH>{tr('common.ubicacion')}</TH>
                      <TH>{tr('common.estado')}</TH>
                      <TH className="text-right">{tr('common.acciones')}</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(r => (
                      <tr key={r.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                        <TD><span className="font-semibold text-surface-900">{r.name}</span></TD>
                        <TD><code className="text-xs font-mono text-primary-700">{r.code}</code></TD>
                        <TD className="text-surface-600">
                          {services.find(s => s.id === r.medicalServiceId)?.name || <span className="text-surface-300">—</span>}
                        </TD>
                        <TD className="text-surface-500">
                          {r.location || <span className="text-surface-300">—</span>}
                        </TD>
                        <TD>
                          <button onClick={() => toggleRoom(r.id)}
                            title={r.status === 'CLOSED' ? tr('catalogo.reabrir_consultorio') : tr('catalogo.cerrar_consultorio')}>
                            <Badge variant={ROOM_VARIANT[r.status] ?? 'gray'} dot>
                              {roomStatusLabel(r.status)}
                            </Badge>
                          </button>
                        </TD>
                        <TD className="text-right">
                          <button
                            onClick={() => openEditRoom(r)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </TD>
                      </tr>
                    ))}
                    {rooms.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-surface-400 text-sm">
                          {tr('catalogo.no_hay_consultorios_registrados')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Service modal (create / edit) ──────────────────────────────────── */}
      <Modal
        open={showServiceModal}
        onClose={closeServiceModal}
        title={editingServiceId ? tr('catalogo.editar_servicio') : tr('catalogo.nuevo_servicio')}
        description={tr('catalogo.configura_servicio_prefijo_ticket_y')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeServiceModal}>{tr('common.cancelar')}</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveService}>
              {editingServiceId ? tr('common.guardar_cambios') : tr('catalogo.crear_servicio')}
            </Button>
          </>
        }
      >
        <FormError msg={serviceError} onDismiss={() => setServiceError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={tr('common.nombre_2')} maxLength={100} placeholder={tr('common.cardiologia')}
            value={serviceForm.name}
            onChange={e => setServiceForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
          <Input label={tr('catalogo.prefijo_ticket')} placeholder="C" maxLength={3}
            value={serviceForm.ticketPrefix}
            onChange={e => setServiceForm((f) => ({ ...f, ticketPrefix: e.target.value.toUpperCase() }))} fullWidth />
          <Input label={tr('catalogo.tiempo_estimado_min')} type="number" min={1} max={480}
            value={serviceForm.estimatedMinutes}
            onChange={e => setServiceForm((f) => ({ ...f, estimatedMinutes: +e.target.value }))} fullWidth />
          <Select
            label={tr('catalogo.icono')}
            value={serviceForm.iconName}
            onChange={val => setServiceForm((f) => ({ ...f, iconName: val }))}
            options={iconOptions()}
            fullWidth
          />
        </div>
      </Modal>

      {/* ── Room modal (create / edit) ─────────────────────────────────────── */}
      <Modal
        open={showRoomModal}
        onClose={closeRoomModal}
        title={editingRoomId ? tr('catalogo.editar_consultorio') : tr('catalogo.nuevo_consultorio')}
        description={tr('catalogo.registra_codigo_servicio_asignado_y')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeRoomModal}>{tr('common.cancelar')}</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveRoom}>
              {editingRoomId ? tr('common.guardar_cambios') : tr('catalogo.crear_consultorio')}
            </Button>
          </>
        }
      >
        <FormError msg={roomError} onDismiss={() => setRoomError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={tr('common.nombre_2')} maxLength={100} placeholder={tr('catalogo.consultorio_1')}
            value={roomForm.name}
            onChange={e => setRoomForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
          <Input label={tr('common.codigo_2')} maxLength={20} placeholder="C-01"
            value={roomForm.code}
            onChange={e => setRoomForm((f) => ({ ...f, code: e.target.value }))} fullWidth />
          <Select
            label={tr('catalogo.servicio_medico')}
            value={roomForm.medicalServiceId}
            onChange={val => setRoomForm((f) => ({ ...f, medicalServiceId: val }))}
            options={activeServiceOptions}
            fullWidth
          />
          <Input label={tr('common.ubicacion')} maxLength={100} placeholder={tr('catalogo.planta_baja_ala_a')}
            value={roomForm.location}
            onChange={e => setRoomForm((f) => ({ ...f, location: e.target.value }))} fullWidth
            className="sm:col-span-2" />
        </div>
      </Modal>
    </div>
  );
};
