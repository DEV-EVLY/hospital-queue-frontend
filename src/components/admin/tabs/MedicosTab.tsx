import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, RefreshCw, Edit2, Save, Stethoscope, UserRound } from 'lucide-react';
import { Card, Badge, Button, Input, Modal, Select, Spinner, Tabs, Pagination } from '../../ui';
import { doctorsApi, specialtiesApi } from '../../../services/api';
import { FormError, TH, TD } from './_shared';

const DOCTOR_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible', BUSY: 'Ocupado', ON_LEAVE: 'De Licencia', OFF_DUTY: 'Fuera de Turno',
};
const DOCTOR_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'primary' | 'gray'> = {
  AVAILABLE: 'success', BUSY: 'warning', ON_LEAVE: 'primary', OFF_DUTY: 'gray',
};
const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'BUSY',      label: 'Ocupado' },
  { value: 'ON_LEAVE',  label: 'De Licencia' },
  { value: 'OFF_DUTY',  label: 'Fuera de Turno' },
];

const MEDICOS_TABS = [
  { key: 'MEDICOS',       label: 'Médicos',       icon: <UserRound  className="w-4 h-4" /> },
  { key: 'ESPECIALIDADES', label: 'Especialidades', icon: <Stethoscope className="w-4 h-4" /> },
];

const BLANK_DOCTOR = { licenseNumber: '', firstName: '', lastName: '', specialtyId: '', phone: '', email: '' };
const BLANK_SPECIALTY = { code: '', name: '', description: '' };

const DOC_PAGE_SIZE = 50;

export const MedicosTab: React.FC = () => {
  const [subTab,       setSubTab]       = useState<'MEDICOS' | 'ESPECIALIDADES'>('MEDICOS');
  const [doctors,      setDoctors]      = useState<any[]>([]);
  const [docPage,      setDocPage]      = useState(0);
  const [docTotal,     setDocTotal]     = useState(0);
  const [docTotalPages, setDocTotalPages] = useState(0);
  const [specialties,  setSpecialties]  = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Doctor CRUD
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [doctorForm,      setDoctorForm]      = useState<any>({ ...BLANK_DOCTOR });
  const [filterSpecialty, setFilterSpecialty] = useState('');

  // Specialty create
  const [showNewSpecialty, setShowNewSpecialty] = useState(false);
  const [specialtyForm,    setSpecialtyForm]    = useState<any>({ ...BLANK_SPECIALTY });
  const [specialtyError,   setSpecialtyError]   = useState<string | null>(null);

  const loadDoctors = async (p = docPage) => {
    setLoading(true);
    try {
      const data = await doctorsApi.list(undefined, p, DOC_PAGE_SIZE) as any;
      setDoctors(data.content ?? []);
      setDocTotal(data.totalElements ?? 0);
      setDocTotalPages(data.totalPages ?? 0);
    } catch (e: any) { setError(`Error al cargar médicos: ${e.message}`); }
    finally { setLoading(false); }
  };

  const loadAll = async (p = docPage) => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        doctorsApi.list(undefined, p, DOC_PAGE_SIZE) as Promise<any>,
        specialtiesApi.list() as Promise<any[]>,
      ]);
      setDoctors(data.content ?? []);
      setDocTotal(data.totalElements ?? 0);
      setDocTotalPages(data.totalPages ?? 0);
      setSpecialties(s);
    } catch (e: any) { setError(`Error al cargar datos: ${e.message}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(0); }, []);
  useEffect(() => { if (docPage > 0) loadDoctors(docPage); }, [docPage]);

  const filteredDoctors = doctors.filter(d =>
    !filterSpecialty || d.specialtyId === filterSpecialty
  );

  const specialtyOptions = [
    { value: '', label: 'Todas las especialidades' },
    ...specialties.map(s => ({ value: s.id, label: s.name })),
  ];

  // ── Doctor handlers ─────────────────────────────────────────────────────────

  const openCreateDoctor = () => {
    setDoctorForm({ ...BLANK_DOCTOR }); setEditingDoctorId(null); setError(null); setShowDoctorModal(true);
  };

  const openEditDoctor = (d: any) => {
    setDoctorForm({
      licenseNumber: d.licenseNumber || '',
      firstName:     d.firstName     || '',
      lastName:      d.lastName      || '',
      specialtyId:   d.specialtyId   || '',
      phone:         d.phone         || '',
      email:         d.email         || '',
    });
    setEditingDoctorId(d.id); setError(null); setShowDoctorModal(true);
  };

  const saveDoctor = async () => {
    if (!doctorForm.licenseNumber || !doctorForm.firstName || !doctorForm.lastName) {
      setError('CMP, nombres y apellidos son obligatorios.'); return;
    }
    setError(null);
    try {
      if (editingDoctorId) {
        const updated = await doctorsApi.update(editingDoctorId, doctorForm);
        setDoctors(prev => prev.map(d => d.id === editingDoctorId ? updated : d));
      } else {
        await doctorsApi.create(doctorForm);
        setDocPage(0);
        loadDoctors(0);
      }
      setShowDoctorModal(false);
    } catch (e: any) { setError(e.message); }
  };

  const changeStatus = async (doctor: any, status: string) => {
    try {
      const updated = await doctorsApi.updateStatus(doctor.id, status);
      setDoctors(prev => prev.map(d => d.id === doctor.id ? updated : d));
    } catch (e: any) { setError(`Error al cambiar estado: ${e.message}`); }
  };

  const toggleActive = async (doctor: any) => {
    try {
      const updated = await doctorsApi.update(doctor.id, { ...doctor, active: !doctor.active });
      setDoctors(prev => prev.map(d => d.id === doctor.id ? updated : d));
    } catch (e: any) { setError(`Error: ${e.message}`); }
  };

  // ── Specialty handlers ───────────────────────────────────────────────────────

  const saveSpecialty = async () => {
    if (!specialtyForm.code || !specialtyForm.name) {
      setSpecialtyError('Código y nombre son obligatorios.'); return;
    }
    setSpecialtyError(null);
    try {
      const created = await specialtiesApi.create(specialtyForm);
      setSpecialties(prev => [...prev, created]);
      setSpecialtyForm({ ...BLANK_SPECIALTY });
      setShowNewSpecialty(false);
    } catch (e: any) { setSpecialtyError(e.message); }
  };

  const specialtyForDoctor = (id: string) => specialties.find(s => s.id === id);

  return (
    <div className="space-y-6">
      <Tabs
        tabs={MEDICOS_TABS}
        active={subTab}
        onChange={k => setSubTab(k as 'MEDICOS' | 'ESPECIALIDADES')}
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
          {subTab === 'MEDICOS' && (
            <Card padding="none">
              <div className="px-6 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">Médicos</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{docTotal} registrados</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filterSpecialty} onChange={setFilterSpecialty}
                    options={specialtyOptions} className="w-52" />
                  <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} loading={loading} onClick={() => loadDoctors(docPage)}>
                    Recargar
                  </Button>
                  <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateDoctor}>
                    Nuevo
                  </Button>
                </div>
              </div>
              {error && <div className="px-6 pt-3"><FormError msg={error} onDismiss={() => setError(null)} /></div>}
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-surface-100">
                      <TH>Médico</TH>
                      <TH>CMP</TH>
                      <TH>Especialidad</TH>
                      <TH>Contacto</TH>
                      <TH>Estado</TH>
                      <TH>Activo</TH>
                      <TH className="text-right">Acciones</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && doctors.length === 0 && (
                      <tr><td colSpan={7} className="py-10 text-center"><Spinner /></td></tr>
                    )}
                    {filteredDoctors.map(d => (
                      <tr key={d.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                        <TD>
                          <div className="font-semibold text-surface-900">{d.firstName} {d.lastName}</div>
                        </TD>
                        <TD><code className="text-xs font-mono text-primary-700">{d.licenseNumber}</code></TD>
                        <TD className="text-surface-600">{specialtyForDoctor(d.specialtyId)?.name || <span className="text-surface-300">—</span>}</TD>
                        <TD className="text-surface-600">
                          <div>{d.phone || '—'}</div>
                          <div className="text-xs text-surface-400">{d.email || ''}</div>
                        </TD>
                        <TD>
                          <Select
                            value={d.status || 'AVAILABLE'}
                            onChange={status => changeStatus(d, status)}
                            options={STATUS_OPTIONS}
                          />
                        </TD>
                        <TD>
                          <button onClick={() => toggleActive(d)}>
                            {d.active
                              ? <Badge variant="success" dot>Sí</Badge>
                              : <Badge variant="gray"    dot>No</Badge>}
                          </button>
                        </TD>
                        <TD className="text-right">
                          <button
                            onClick={() => openEditDoctor(d)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </TD>
                      </tr>
                    ))}
                    {!loading && filteredDoctors.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-surface-400 text-sm">
                          No hay médicos registrados con los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6">
                <Pagination
                  page={docPage}
                  size={DOC_PAGE_SIZE}
                  totalElements={docTotal}
                  totalPages={docTotalPages}
                  onPageChange={p => { setDocPage(p); setFilterSpecialty(''); }}
                />
              </div>
            </Card>
          )}

          {subTab === 'ESPECIALIDADES' && (
            <Card padding="none">
              <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">Especialidades Médicas</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{specialties.length} registradas</p>
                </div>
                <Button size="sm" icon={<Plus className="w-4 h-4" />}
                  onClick={() => { setShowNewSpecialty(true); setSpecialtyError(null); }}>
                  Nueva Especialidad
                </Button>
              </div>
              {specialtyError && <div className="px-6 pt-3"><FormError msg={specialtyError} onDismiss={() => setSpecialtyError(null)} /></div>}
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-surface-100">
                      <TH>Código</TH>
                      <TH>Nombre</TH>
                      <TH>Descripción</TH>
                      <TH>Estado</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {specialties.map(s => (
                      <tr key={s.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                        <TD><Badge variant="primary">{s.code}</Badge></TD>
                        <TD className="font-semibold text-surface-900">{s.name}</TD>
                        <TD className="text-surface-500">{s.description || '—'}</TD>
                        <TD>
                          {s.active
                            ? <Badge variant="success" dot>Activa</Badge>
                            : <Badge variant="gray"    dot>Inactiva</Badge>}
                        </TD>
                      </tr>
                    ))}
                    {specialties.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-surface-400 text-sm">
                          No hay especialidades registradas.
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

      {/* Doctor modal */}
      <Modal
        open={showDoctorModal}
        onClose={() => { setShowDoctorModal(false); setError(null); }}
        title={editingDoctorId ? 'Editar Médico' : 'Nuevo Médico'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDoctorModal(false)}>Cancelar</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveDoctor}>
              {editingDoctorId ? 'Guardar Cambios' : 'Crear Médico'}
            </Button>
          </>
        }
      >
        <FormError msg={error} onDismiss={() => setError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="CMP / Nro. de licencia *" placeholder="CMP-12345"
            value={doctorForm.licenseNumber}
            onChange={e => setDoctorForm((f: any) => ({ ...f, licenseNumber: e.target.value }))} fullWidth />
          <Select label="Especialidad" value={doctorForm.specialtyId}
            onChange={v => setDoctorForm((f: any) => ({ ...f, specialtyId: v }))}
            options={[{ value: '', label: 'Sin asignar' }, ...specialties.map(s => ({ value: s.id, label: s.name }))]}
            fullWidth />
          <Input label="Nombres *" placeholder="María"
            value={doctorForm.firstName}
            onChange={e => setDoctorForm((f: any) => ({ ...f, firstName: e.target.value }))} fullWidth />
          <Input label="Apellidos *" placeholder="González Torres"
            value={doctorForm.lastName}
            onChange={e => setDoctorForm((f: any) => ({ ...f, lastName: e.target.value }))} fullWidth />
          <Input label="Teléfono" placeholder="+51 999 999 999"
            value={doctorForm.phone}
            onChange={e => setDoctorForm((f: any) => ({ ...f, phone: e.target.value }))} fullWidth />
          <Input label="Correo electrónico" type="email" placeholder="medico@hospital.pe"
            value={doctorForm.email}
            onChange={e => setDoctorForm((f: any) => ({ ...f, email: e.target.value }))} fullWidth />
        </div>
      </Modal>

      {/* New specialty modal */}
      <Modal
        open={showNewSpecialty}
        onClose={() => { setShowNewSpecialty(false); setSpecialtyError(null); }}
        title="Nueva Especialidad"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewSpecialty(false)}>Cancelar</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveSpecialty}>
              Crear Especialidad
            </Button>
          </>
        }
      >
        <FormError msg={specialtyError} onDismiss={() => setSpecialtyError(null)} />
        <div className="space-y-4">
          <Input label="Código *" placeholder="CARD"
            value={specialtyForm.code}
            onChange={e => setSpecialtyForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} fullWidth />
          <Input label="Nombre *" placeholder="Cardiología"
            value={specialtyForm.name}
            onChange={e => setSpecialtyForm((f: any) => ({ ...f, name: e.target.value }))} fullWidth />
          <Input label="Descripción" placeholder="Descripción opcional"
            value={specialtyForm.description}
            onChange={e => setSpecialtyForm((f: any) => ({ ...f, description: e.target.value }))} fullWidth />
        </div>
      </Modal>
    </div>
  );
};
