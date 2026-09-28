import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, RefreshCw, Edit2, Save, Stethoscope, Building2 } from 'lucide-react';
import { Card, Badge, Button, Input, Modal, Tabs } from '../../ui';
import { Select } from '../../ui';
import { medicalServicesApi, consultingRoomsApi } from '../../../services/api';
import { FormError, TH, TD } from './_shared';

const BLANK_SERVICE = { name: '', ticketPrefix: '', iconName: 'stethoscope', estimatedMinutes: 20 };
const BLANK_ROOM    = { name: '', code: '', medicalServiceId: '', floor: '', wing: '' };

const CATALOG_TABS = [
  { key: 'SERVICIOS',    label: 'Servicios Médicos', icon: <Stethoscope className="w-4 h-4" /> },
  { key: 'CONSULTORIOS', label: 'Consultorios',      icon: <Building2 className="w-4 h-4" /> },
];

export const CatalogoTab: React.FC = () => {
  const [services,         setServices]         = useState<any[]>([]);
  const [rooms,            setRooms]            = useState<any[]>([]);
  const [subTab,           setSubTab]           = useState<'SERVICIOS' | 'CONSULTORIOS'>('SERVICIOS');

  // Services CRUD
  const [showNewService,   setShowNewService]   = useState(false);
  const [newService,       setNewService]       = useState({ ...BLANK_SERVICE });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingService,   setEditingService]   = useState<any>(null);
  const [serviceError,     setServiceError]     = useState<string | null>(null);

  // Rooms CRUD
  const [showNewRoom,   setShowNewRoom]   = useState(false);
  const [newRoom,       setNewRoom]       = useState({ ...BLANK_ROOM });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoom,   setEditingRoom]   = useState<any>(null);
  const [roomError,     setRoomError]     = useState<string | null>(null);

  const loadServices = async () => { try { setServices(await medicalServicesApi.list() as any[]); } catch { /* ok */ } };
  const loadRooms    = async () => { try { setRooms(await consultingRoomsApi.list() as any[]); } catch { /* ok */ } };

  useEffect(() => { loadServices(); loadRooms(); }, []);

  // ── Services handlers ──────────────────────────────────────────────────────
  const saveNewService = async () => {
    if (!newService.name || !newService.ticketPrefix) {
      setServiceError('Nombre y prefijo de ticket son obligatorios.'); return;
    }
    setServiceError(null);
    try {
      const created = await medicalServicesApi.create(newService);
      setServices(prev => [...prev, created]);
      setNewService({ ...BLANK_SERVICE });
      setShowNewService(false);
    } catch (e: any) { setServiceError(e.message); }
  };

  const saveEditService = async () => {
    if (!editingService?.name) { setServiceError('El nombre es obligatorio.'); return; }
    setServiceError(null);
    try {
      const updated = await medicalServicesApi.update(editingServiceId!, editingService);
      setServices(prev => prev.map(s => s.id === editingServiceId ? updated : s));
      setEditingServiceId(null); setEditingService(null);
    } catch (e: any) { setServiceError(e.message); }
  };

  const toggleService = async (id: string) => {
    try {
      await medicalServicesApi.toggleActive(id);
      setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    } catch (e: any) { setServiceError(`Error: ${e.message}`); }
  };

  // ── Rooms handlers ─────────────────────────────────────────────────────────
  const saveNewRoom = async () => {
    if (!newRoom.name || !newRoom.code) {
      setRoomError('Nombre y código son obligatorios.'); return;
    }
    setRoomError(null);
    try {
      const created = await consultingRoomsApi.create(newRoom);
      setRooms(prev => [...prev, created]);
      setNewRoom({ ...BLANK_ROOM });
      setShowNewRoom(false);
    } catch (e: any) { setRoomError(e.message); }
  };

  const saveEditRoom = async () => {
    if (!editingRoom?.name) { setRoomError('El nombre es obligatorio.'); return; }
    setRoomError(null);
    try {
      const updated = await consultingRoomsApi.update(editingRoomId!, editingRoom);
      setRooms(prev => prev.map(r => r.id === editingRoomId ? updated : r));
      setEditingRoomId(null); setEditingRoom(null);
    } catch (e: any) { setRoomError(e.message); }
  };

  const toggleRoom = async (id: string) => {
    try {
      await consultingRoomsApi.toggleActive(id);
      setRooms(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    } catch (e: any) { setRoomError(`Error: ${e.message}`); }
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
                  <Button size="sm" icon={<Plus className="w-4 h-4" />}
                    onClick={() => { setShowNewService(true); setServiceError(null); }}>
                    Agregar
                  </Button>
                </div>
              </div>
              <div className="px-6 py-3">
                <FormError msg={serviceError} onDismiss={() => setServiceError(null)} />
              </div>
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
                        {editingServiceId === s.id ? (
                          <>
                            <td className="px-4 py-2" colSpan={3}>
                              <div className="grid grid-cols-3 gap-2">
                                <Input value={editingService.name} placeholder="Nombre"
                                  onChange={e => setEditingService((p: any) => ({ ...p, name: e.target.value }))} fullWidth />
                                <Input value={editingService.ticketPrefix} placeholder="Prefijo" maxLength={3}
                                  onChange={e => setEditingService((p: any) => ({ ...p, ticketPrefix: e.target.value.toUpperCase() }))} fullWidth />
                                <Input type="number" value={editingService.estimatedMinutes}
                                  onChange={e => setEditingService((p: any) => ({ ...p, estimatedMinutes: +e.target.value }))} fullWidth />
                              </div>
                            </td>
                            <TD></TD>
                            <TD className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" icon={<Save className="w-3.5 h-3.5" />} onClick={saveEditService}>
                                  Guardar
                                </Button>
                                <Button size="sm" variant="ghost"
                                  onClick={() => { setEditingServiceId(null); setEditingService(null); }}>
                                  ✕
                                </Button>
                              </div>
                            </TD>
                          </>
                        ) : (
                          <>
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
                                onClick={() => { setEditingServiceId(s.id); setEditingService({ ...s }); setServiceError(null); }}
                                className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </TD>
                          </>
                        )}
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
                  <Button size="sm" icon={<Plus className="w-4 h-4" />}
                    onClick={() => { setShowNewRoom(true); setRoomError(null); }}>
                    Agregar
                  </Button>
                </div>
              </div>
              <div className="px-6 py-3">
                <FormError msg={roomError} onDismiss={() => setRoomError(null)} />
              </div>
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
                        {editingRoomId === r.id ? (
                          <>
                            <td className="px-4 py-2" colSpan={4}>
                              <div className="grid grid-cols-4 gap-2">
                                <Input value={editingRoom.name} placeholder="Nombre"
                                  onChange={e => setEditingRoom((p: any) => ({ ...p, name: e.target.value }))} fullWidth />
                                <Input value={editingRoom.code} placeholder="Código"
                                  onChange={e => setEditingRoom((p: any) => ({ ...p, code: e.target.value }))} fullWidth />
                                <Select
                                  value={editingRoom.medicalServiceId || ''}
                                  onChange={val => setEditingRoom((p: any) => ({ ...p, medicalServiceId: val }))}
                                  options={activeServiceOptions}
                                  fullWidth
                                />
                                <Input value={editingRoom.floor || ''} placeholder="Piso"
                                  onChange={e => setEditingRoom((p: any) => ({ ...p, floor: e.target.value }))} fullWidth />
                              </div>
                            </td>
                            <TD></TD>
                            <TD className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" icon={<Save className="w-3.5 h-3.5" />} onClick={saveEditRoom}>
                                  Guardar
                                </Button>
                                <Button size="sm" variant="ghost"
                                  onClick={() => { setEditingRoomId(null); setEditingRoom(null); }}>
                                  ✕
                                </Button>
                              </div>
                            </TD>
                          </>
                        ) : (
                          <>
                            <TD><span className="font-semibold text-surface-900">{r.name}</span></TD>
                            <TD><code className="text-xs font-mono text-primary-700">{r.code}</code></TD>
                            <TD className="text-surface-600">
                              {services.find(s => s.id === r.medicalServiceId)?.name || <span className="text-surface-300">—</span>}
                            </TD>
                            <TD className="text-surface-500">
                              {[r.floor, r.wing].filter(Boolean).join(' / ') || <span className="text-surface-300">—</span>}
                            </TD>
                            <TD>
                              <button onClick={() => toggleRoom(r.id)}>
                                {r.active
                                  ? <Badge variant="success" dot>Activo</Badge>
                                  : <Badge variant="gray" dot>Inactivo</Badge>}
                              </button>
                            </TD>
                            <TD className="text-right">
                              <button
                                onClick={() => { setEditingRoomId(r.id); setEditingRoom({ ...r }); setRoomError(null); }}
                                className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </TD>
                          </>
                        )}
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

      {/* New service modal */}
      <Modal
        open={showNewService}
        onClose={() => { setShowNewService(false); setNewService({ ...BLANK_SERVICE }); setServiceError(null); }}
        title="Nuevo Servicio Médico"
        description="Configura el servicio, prefijo de ticket y tiempo estimado"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowNewService(false); setNewService({ ...BLANK_SERVICE }); }}>
              Cancelar
            </Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveNewService}>
              Crear Servicio
            </Button>
          </>
        }
      >
        <FormError msg={serviceError} onDismiss={() => setServiceError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre *" placeholder="Cardiología"
            value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} fullWidth />
          <Input label="Prefijo de ticket *" placeholder="C" maxLength={3}
            value={newService.ticketPrefix}
            onChange={e => setNewService(s => ({ ...s, ticketPrefix: e.target.value.toUpperCase() }))} fullWidth />
          <Input label="Tiempo estimado (min)" type="number" min={1}
            value={newService.estimatedMinutes}
            onChange={e => setNewService(s => ({ ...s, estimatedMinutes: +e.target.value }))} fullWidth />
          <Select
            label="Ícono"
            value={newService.iconName}
            onChange={val => setNewService(s => ({ ...s, iconName: val }))}
            options={[
              { value: 'stethoscope', label: 'Estetoscopio' },
              { value: 'heart', label: 'Corazón' },
              { value: 'baby', label: 'Pediatría' },
              { value: 'activity', label: 'Emergencia' },
              { value: 'flask-conical', label: 'Laboratorio' },
            ]}
            fullWidth
          />
        </div>
      </Modal>

      {/* New room modal */}
      <Modal
        open={showNewRoom}
        onClose={() => { setShowNewRoom(false); setNewRoom({ ...BLANK_ROOM }); setRoomError(null); }}
        title="Nuevo Consultorio"
        description="Registra código, servicio asignado y ubicación"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowNewRoom(false); setNewRoom({ ...BLANK_ROOM }); }}>
              Cancelar
            </Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveNewRoom}>
              Crear Consultorio
            </Button>
          </>
        }
      >
        <FormError msg={roomError} onDismiss={() => setRoomError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre *" placeholder="Consultorio 1"
            value={newRoom.name} onChange={e => setNewRoom(r => ({ ...r, name: e.target.value }))} fullWidth />
          <Input label="Código *" placeholder="C-01"
            value={newRoom.code} onChange={e => setNewRoom(r => ({ ...r, code: e.target.value }))} fullWidth />
          <Select
            label="Servicio médico"
            value={newRoom.medicalServiceId}
            onChange={val => setNewRoom(r => ({ ...r, medicalServiceId: val }))}
            options={activeServiceOptions}
            fullWidth
          />
          <Input label="Piso" placeholder="Piso 1"
            value={newRoom.floor} onChange={e => setNewRoom(r => ({ ...r, floor: e.target.value }))} fullWidth />
          <Input label="Ala / Pabellón" placeholder="Pabellón Central"
            value={newRoom.wing} onChange={e => setNewRoom(r => ({ ...r, wing: e.target.value }))} fullWidth
            className="sm:col-span-2" />
        </div>
      </Modal>
    </div>
  );
};
