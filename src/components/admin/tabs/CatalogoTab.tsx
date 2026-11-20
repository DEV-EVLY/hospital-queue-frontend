import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, RefreshCw, Edit2, Save, Stethoscope, Building2 } from 'lucide-react';
import { Card, Badge, Button, Input, Modal, Tabs, Select } from '../../ui';
import { medicalServicesApi, consultingRoomsApi, getErrorMessage } from '../../../services/api';
import { FormError, TH, TD } from './_shared';
import type { MedicalService, ConsultingRoom } from '../../../types/api';

interface ServiceForm { name: string; ticketPrefix: string; iconName: string; estimatedMinutes: number }
interface RoomForm { name: string; code: string; medicalServiceId: string; location: string }

const BLANK_SERVICE: ServiceForm = { name: '', ticketPrefix: '', iconName: 'stethoscope', estimatedMinutes: 20 };
const BLANK_ROOM: RoomForm = { name: '', code: '', medicalServiceId: '', location: '' };

const ROOM_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'primary' | 'gray' }> = {
  AVAILABLE: { label: 'Disponible', variant: 'success' },
  BUSY:      { label: 'Ocupado',    variant: 'warning' },
  PAUSED:    { label: 'En pausa',   variant: 'primary' },
  CLOSED:    { label: 'Cerrado',    variant: 'gray' },
};

const ICON_OPTIONS = [
  { value: 'stethoscope',   label: 'Estetoscopio' },
  { value: 'heart',         label: 'Corazón' },
  { value: 'baby',          label: 'Pediatría' },
  { value: 'activity',      label: 'Emergencia' },
  { value: 'flask-conical', label: 'Laboratorio' },
];

const CATALOG_TABS = [
  { key: 'SERVICIOS',    label: 'Servicios Médicos', icon: <Stethoscope className="w-4 h-4" /> },
  { key: 'CONSULTORIOS', label: 'Consultorios',      icon: <Building2 className="w-4 h-4" /> },
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
    catch (e: unknown) { setServiceError(`Error al cargar servicios: ${getErrorMessage(e)}`); }
  };
  const loadRooms = async () => {
    try { setRooms(await consultingRoomsApi.list()); }
    catch (e: unknown) { setRoomError(`Error al cargar consultorios: ${getErrorMessage(e)}`); }
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
      setServiceError('Nombre y prefijo de ticket son obligatorios.'); return;
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
    } catch (e: unknown) { setServiceError(`Error: ${getErrorMessage(e)}`); }
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
      setRoomError('Nombre y código son obligatorios.'); return;
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
    } catch (e: unknown) { setRoomError(`Error: ${getErrorMessage(e)}`); }
  };

  const activeServiceOptions = [
    { value: '', label: 'Sin asignar' },
    ...services.filter(s => s.active).map(s => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="space-y-6">
      <Tabs
        tabs={CATALOG_TABS}
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
                  <h3 className="text-sm font-semibold text-surface-900">Servicios Médicos</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{services.length} servicios registrados</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadServices}>
                    Recargar
                  </Button>
                  <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateService}>
                    Agregar
                  </Button>
                </div>
              </div>
              {serviceError && <div className="px-6 pt-3"><FormError msg={serviceError} onDismiss={() => setServiceError(null)} /></div>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <TH>Nombre</TH>
                      <TH>Prefijo</TH>
                      <TH className="text-right">T. Est.</TH>
                      <TH>Estado</TH>
                      <TH className="text-right">Acciones</TH>
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
                              ? <Badge variant="success" dot>Activo</Badge>
                              : <Badge variant="gray" dot>Inactivo</Badge>}
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
                          No hay servicios médicos registrados
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
                  <h3 className="text-sm font-semibold text-surface-900">Consultorios</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{rooms.length} consultorios registrados</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadRooms}>
                    Recargar
                  </Button>
                  <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateRoom}>
                    Agregar
                  </Button>
                </div>
              </div>
              {roomError && <div className="px-6 pt-3"><FormError msg={roomError} onDismiss={() => setRoomError(null)} /></div>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <TH>Nombre</TH>
                      <TH>Código</TH>
                      <TH>Servicio</TH>
                      <TH>Ubicación</TH>
                      <TH>Estado</TH>
                      <TH className="text-right">Acciones</TH>
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
                            title={r.status === 'CLOSED' ? 'Reabrir consultorio' : 'Cerrar consultorio'}>
                            <Badge variant={ROOM_STATUS[r.status]?.variant ?? 'gray'} dot>
                              {ROOM_STATUS[r.status]?.label ?? r.status}
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
                          No hay consultorios registrados
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
        title={editingServiceId ? 'Editar Servicio Médico' : 'Nuevo Servicio Médico'}
        description="Configura el servicio, prefijo de ticket y tiempo estimado"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeServiceModal}>Cancelar</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveService}>
              {editingServiceId ? 'Guardar Cambios' : 'Crear Servicio'}
            </Button>
          </>
        }
      >
        <FormError msg={serviceError} onDismiss={() => setServiceError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre *" maxLength={100} placeholder="Cardiología"
            value={serviceForm.name}
            onChange={e => setServiceForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
          <Input label="Prefijo de ticket *" placeholder="C" maxLength={3}
            value={serviceForm.ticketPrefix}
            onChange={e => setServiceForm((f) => ({ ...f, ticketPrefix: e.target.value.toUpperCase() }))} fullWidth />
          <Input label="Tiempo estimado (min)" type="number" min={1} max={480}
            value={serviceForm.estimatedMinutes}
            onChange={e => setServiceForm((f) => ({ ...f, estimatedMinutes: +e.target.value }))} fullWidth />
          <Select
            label="Ícono"
            value={serviceForm.iconName}
            onChange={val => setServiceForm((f) => ({ ...f, iconName: val }))}
            options={ICON_OPTIONS}
            fullWidth
          />
        </div>
      </Modal>

      {/* ── Room modal (create / edit) ─────────────────────────────────────── */}
      <Modal
        open={showRoomModal}
        onClose={closeRoomModal}
        title={editingRoomId ? 'Editar Consultorio' : 'Nuevo Consultorio'}
        description="Registra código, servicio asignado y ubicación"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeRoomModal}>Cancelar</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveRoom}>
              {editingRoomId ? 'Guardar Cambios' : 'Crear Consultorio'}
            </Button>
          </>
        }
      >
        <FormError msg={roomError} onDismiss={() => setRoomError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre *" maxLength={100} placeholder="Consultorio 1"
            value={roomForm.name}
            onChange={e => setRoomForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
          <Input label="Código *" maxLength={20} placeholder="C-01"
            value={roomForm.code}
            onChange={e => setRoomForm((f) => ({ ...f, code: e.target.value }))} fullWidth />
          <Select
            label="Servicio médico"
            value={roomForm.medicalServiceId}
            onChange={val => setRoomForm((f) => ({ ...f, medicalServiceId: val }))}
            options={activeServiceOptions}
            fullWidth
          />
          <Input label="Ubicación" maxLength={100} placeholder="Planta Baja - Ala A"
            value={roomForm.location}
            onChange={e => setRoomForm((f) => ({ ...f, location: e.target.value }))} fullWidth
            className="sm:col-span-2" />
        </div>
      </Modal>
    </div>
  );
};
