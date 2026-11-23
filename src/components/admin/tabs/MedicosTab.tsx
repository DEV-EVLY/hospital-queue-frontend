import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, RefreshCw, Edit2, Save, Stethoscope, UserRound } from 'lucide-react';
import { Card, Badge, Button, Input, Modal, Select, Spinner, Tabs, Pagination } from '../../ui';
import type { SelectOption } from '../../ui';
import { doctorsApi, specialtiesApi, getErrorMessage } from '../../../services/api';
import { FormError, TH, TD, normalizePhone, phoneError } from './_shared';
import type { Doctor, Specialty, DoctorStatus, DoctorRequest } from '../../../types/api';
import { tr, doctorStatusOptions } from '../../../i18n';

interface DoctorForm { licenseNumber: string; firstName: string; lastName: string; specialtyId: string; phone: string; email: string }
interface SpecialtyForm { code: string; name: string; description: string }

const medicosTabs = () => [
  { key: 'MEDICOS',        label: tr('medicos.medicos'),        icon: <UserRound   className="w-4 h-4" /> },
  { key: 'ESPECIALIDADES', label: tr('medicos.especialidades'), icon: <Stethoscope className="w-4 h-4" /> },
];

const BLANK_DOCTOR: DoctorForm = { licenseNumber: '', firstName: '', lastName: '', specialtyId: '', phone: '', email: '' };
const BLANK_SPECIALTY: SpecialtyForm = { code: '', name: '', description: '' };

const DOC_PAGE_SIZE = 50;

export const MedicosTab: React.FC = () => {
  const [subTab,       setSubTab]       = useState<'MEDICOS' | 'ESPECIALIDADES'>('MEDICOS');
  const [doctors,      setDoctors]      = useState<Doctor[]>([]);
  const [docPage,      setDocPage]      = useState(0);
  const [docTotal,     setDocTotal]     = useState(0);
  const [docTotalPages, setDocTotalPages] = useState(0);
  const [specialties,  setSpecialties]  = useState<Specialty[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Doctor CRUD
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [doctorForm,      setDoctorForm]      = useState<DoctorForm>({ ...BLANK_DOCTOR });
  const [filterSpecialty, setFilterSpecialty] = useState('');

  // Specialty create
  const [showNewSpecialty, setShowNewSpecialty] = useState(false);
  const [specialtyForm,    setSpecialtyForm]    = useState<SpecialtyForm>({ ...BLANK_SPECIALTY });
  const [specialtyError,   setSpecialtyError]   = useState<string | null>(null);

  const loadDoctors = async (p = docPage) => {
    setLoading(true);
    try {
      const data = await doctorsApi.list(undefined, p, DOC_PAGE_SIZE);
      setDoctors(data.content ?? []);
      setDocTotal(data.totalElements ?? 0);
      setDocTotalPages(data.totalPages ?? 0);
    } catch (e: unknown) { setError(tr('medicos.error_cargar_medicos_error', { error: getErrorMessage(e) })); }
    finally { setLoading(false); }
  };

  const loadAll = async (p = docPage) => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        doctorsApi.list(undefined, p, DOC_PAGE_SIZE),
        specialtiesApi.list(),
      ]);
      setDoctors(data.content ?? []);
      setDocTotal(data.totalElements ?? 0);
      setDocTotalPages(data.totalPages ?? 0);
      setSpecialties(s);
    } catch (e: unknown) { setError(tr('medicos.error_cargar_datos_error', { error: getErrorMessage(e) })); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(0); }, []);
  useEffect(() => { if (docPage > 0) loadDoctors(docPage); }, [docPage]);

  const filteredDoctors = doctors.filter(d =>
    !filterSpecialty || d.specialtyId === filterSpecialty
  );

  const specialtyOptions = [
    { value: '', label: tr('medicos.todas_las_especialidades') },
    ...specialties.map(s => ({ value: s.id, label: s.name })),
  ];

  // ── Doctor handlers ─────────────────────────────────────────────────────────

  const openCreateDoctor = () => {
    setDoctorForm({ ...BLANK_DOCTOR }); setEditingDoctorId(null); setError(null); setShowDoctorModal(true);
  };

  const openEditDoctor = (d: Doctor) => {
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
      setError(tr('medicos.cmp_nombres_y_apellidos_son')); return;
    }
    if (!doctorForm.specialtyId) { setError(tr('medicos.selecciona_especialidad_2')); return; }
    const phoneProblem = phoneError(doctorForm.phone);
    if (phoneProblem) { setError(phoneProblem); return; }
    setError(null);
    const payload: DoctorRequest = {
      licenseNumber: doctorForm.licenseNumber.trim(),
      firstName: doctorForm.firstName.trim(),
      lastName: doctorForm.lastName.trim(),
      specialtyId: doctorForm.specialtyId,
      phone: normalizePhone(doctorForm.phone),
      email: doctorForm.email.trim() || null,
    };
    try {
      if (editingDoctorId) {
        const updated = await doctorsApi.update(editingDoctorId, payload);
        setDoctors(prev => prev.map(d => d.id === editingDoctorId ? updated : d));
      } else {
        await doctorsApi.create(payload);
        setDocPage(0);
        loadDoctors(0);
      }
      setShowDoctorModal(false);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const changeStatus = async (doctor: Doctor, status: DoctorStatus) => {
    try {
      const updated = await doctorsApi.updateStatus(doctor.id, status);
      setDoctors(prev => prev.map(d => d.id === doctor.id ? updated : d));
    } catch (e: unknown) { setError(tr('medicos.error_cambiar_estado_error', { error: getErrorMessage(e) })); }
  };

  const toggleActive = async (doctor: Doctor) => {
    if (!doctor.specialtyId) { setError(tr('medicos.medico_no_tiene_especialidad_asignada')); return; }
    try {
      const updated = await doctorsApi.update(doctor.id, {
        licenseNumber: doctor.licenseNumber, firstName: doctor.firstName, lastName: doctor.lastName,
        specialtyId: doctor.specialtyId, phone: doctor.phone, email: doctor.email, active: !doctor.active,
      });
      setDoctors(prev => prev.map(d => d.id === doctor.id ? updated : d));
    } catch (e: unknown) { setError(tr('common.error_error', { error: getErrorMessage(e) })); }
  };

  // ── Specialty handlers ───────────────────────────────────────────────────────

  const saveSpecialty = async () => {
    if (!specialtyForm.code || !specialtyForm.name) {
      setSpecialtyError(tr('medicos.codigo_y_nombre_son_obligatorios')); return;
    }
    setSpecialtyError(null);
    try {
      const created = await specialtiesApi.create(specialtyForm);
      setSpecialties(prev => [...prev, created]);
      setSpecialtyForm({ ...BLANK_SPECIALTY });
      setShowNewSpecialty(false);
    } catch (e: unknown) { setSpecialtyError(getErrorMessage(e)); }
  };

  const specialtyForDoctor = (id: string | null) => specialties.find(s => s.id === id);

  return (
    <div className="space-y-6">
      <Tabs
        tabs={medicosTabs()}
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
                  <h3 className="text-sm font-semibold text-surface-900">{tr('medicos.medicos')}</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{docTotal} registrados</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filterSpecialty} onChange={setFilterSpecialty}
                    options={specialtyOptions} className="w-52" />
                  <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} loading={loading} onClick={() => loadDoctors(docPage)}>
                    {tr('common.recargar')}
                  </Button>
                  <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateDoctor}>
                    {tr('common.nuevo')}
                  </Button>
                </div>
              </div>
              {error && <div className="px-6 pt-3"><FormError msg={error} onDismiss={() => setError(null)} /></div>}
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-surface-100">
                      <TH>{tr('common.medico')}</TH>
                      <TH>CMP</TH>
                      <TH>{tr('common.especialidad')}</TH>
                      <TH>{tr('common.contacto')}</TH>
                      <TH>{tr('common.estado')}</TH>
                      <TH>{tr('common.activo')}</TH>
                      <TH className="text-right">{tr('common.acciones')}</TH>
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
                            options={doctorStatusOptions()}
                          />
                        </TD>
                        <TD>
                          <button onClick={() => toggleActive(d)}>
                            {d.active
                              ? <Badge variant="success" dot>{tr('medicos.si')}</Badge>
                              : <Badge variant="gray"    dot>{tr('medicos.no')}</Badge>}
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
                          {tr('medicos.no_hay_medicos_registrados_con')}
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
                  <h3 className="text-sm font-semibold text-surface-900">{tr('medicos.especialidades_medicas')}</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{specialties.length} registradas</p>
                </div>
                <Button size="sm" icon={<Plus className="w-4 h-4" />}
                  onClick={() => { setShowNewSpecialty(true); setSpecialtyError(null); }}>
                  {tr('medicos.nueva_especialidad')}
                </Button>
              </div>
              {specialtyError && <div className="px-6 pt-3"><FormError msg={specialtyError} onDismiss={() => setSpecialtyError(null)} /></div>}
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-surface-100">
                      <TH>{tr('common.codigo')}</TH>
                      <TH>{tr('common.nombre')}</TH>
                      <TH>{tr('common.descripcion')}</TH>
                      <TH>{tr('common.estado')}</TH>
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
                            ? <Badge variant="success" dot>{tr('medicos.activa')}</Badge>
                            : <Badge variant="gray"    dot>{tr('medicos.inactiva')}</Badge>}
                        </TD>
                      </tr>
                    ))}
                    {specialties.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-surface-400 text-sm">
                          {tr('medicos.no_hay_especialidades_registradas')}
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
        title={editingDoctorId ? tr('medicos.editar_medico') : tr('medicos.nuevo_medico')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDoctorModal(false)}>{tr('common.cancelar')}</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveDoctor}>
              {editingDoctorId ? tr('common.guardar_cambios') : tr('medicos.crear_medico')}
            </Button>
          </>
        }
      >
        <FormError msg={error} onDismiss={() => setError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={tr('medicos.cmp_nro_licencia')} maxLength={20} placeholder="CMP-12345"
            value={doctorForm.licenseNumber}
            onChange={e => setDoctorForm((f) => ({ ...f, licenseNumber: e.target.value }))} fullWidth />
          <Select label={tr('medicos.especialidad')} value={doctorForm.specialtyId}
            onChange={v => setDoctorForm((f) => ({ ...f, specialtyId: v }))}
            placeholder={tr('medicos.selecciona_especialidad')}
            options={specialties.map(s => ({ value: s.id, label: s.name }))}
            fullWidth />
          <Input label={tr('common.nombres')} maxLength={100} placeholder={tr('medicos.maria')}
            value={doctorForm.firstName}
            onChange={e => setDoctorForm((f) => ({ ...f, firstName: e.target.value }))} fullWidth />
          <Input label={tr('common.apellidos')} maxLength={100} placeholder={tr('medicos.gonzalez_torres')}
            value={doctorForm.lastName}
            onChange={e => setDoctorForm((f) => ({ ...f, lastName: e.target.value }))} fullWidth />
          <Input label={tr('common.telefono')} maxLength={20} placeholder="+51 999 999 999"
            value={doctorForm.phone}
            onChange={e => setDoctorForm((f) => ({ ...f, phone: e.target.value }))} fullWidth />
          <Input label={tr('common.correo_electronico')} maxLength={150} type="email" placeholder="medico@hospital.pe"
            value={doctorForm.email}
            onChange={e => setDoctorForm((f) => ({ ...f, email: e.target.value }))} fullWidth />
        </div>
      </Modal>

      {/* New specialty modal */}
      <Modal
        open={showNewSpecialty}
        onClose={() => { setShowNewSpecialty(false); setSpecialtyError(null); }}
        title={tr('medicos.nueva_especialidad')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewSpecialty(false)}>{tr('common.cancelar')}</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveSpecialty}>
              {tr('medicos.crear_especialidad')}
            </Button>
          </>
        }
      >
        <FormError msg={specialtyError} onDismiss={() => setSpecialtyError(null)} />
        <div className="space-y-4">
          <Input label={tr('common.codigo_2')} placeholder="CARD"
            value={specialtyForm.code}
            onChange={e => setSpecialtyForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} fullWidth />
          <Input label={tr('common.nombre_2')} placeholder={tr('common.cardiologia')}
            value={specialtyForm.name}
            onChange={e => setSpecialtyForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
          <Input label={tr('common.descripcion')} maxLength={500} placeholder={tr('common.descripcion_opcional')}
            value={specialtyForm.description}
            onChange={e => setSpecialtyForm((f) => ({ ...f, description: e.target.value }))} fullWidth />
        </div>
      </Modal>
    </div>
  );
};
