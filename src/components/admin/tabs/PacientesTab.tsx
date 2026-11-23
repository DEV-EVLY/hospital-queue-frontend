import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Edit2, Save } from 'lucide-react';
import { Card, Badge, Button, Input, Modal, Select, Spinner, Pagination } from '../../ui';
import { patientsApi, getErrorMessage } from '../../../services/api';
import type { SelectOption } from '../../ui';
import { FormError, TH, TD, normalizePhone, phoneError } from './_shared';
import type { Patient, PatientRequest, DocumentType, Gender } from '../../../types/api';
import { tr, docTypeOptions, genderOptions, withEmpty, trp } from '../../../i18n';

interface PatientForm {
  documentType: DocumentType; documentNumber: string; firstName: string; lastName: string;
  birthDate: string; gender: Gender | ''; phone: string; email: string;
  isPregnant: boolean; hasDisability: boolean; active: boolean;
}

type PatientFlag = 'isPregnant' | 'hasDisability' | 'active';

const BLANK: PatientForm = {
  documentType: 'DNI', documentNumber: '', firstName: '', lastName: '',
  birthDate: '', gender: '', phone: '', email: '',
  isPregnant: false, hasDisability: false, active: true,
};

/** El backend valida el teléfono (sin espacios) y espera null en vez de cadenas vacías. */
const toRequest = (f: PatientForm): PatientRequest => ({
  documentType: f.documentType,
  documentNumber: f.documentNumber.trim(),
  firstName: f.firstName.trim(),
  lastName: f.lastName.trim(),
  birthDate: f.birthDate || null,
  gender: f.gender || null,
  phone: normalizePhone(f.phone),
  email: f.email.trim() || null,
  isPregnant: f.isPregnant,
  hasDisability: f.hasDisability,
  active: f.active,
});

const PAGE_SIZE = 20;

export const PacientesTab: React.FC = () => {
  const [patients,       setPatients]       = useState<Patient[]>([]);
  const [page,           setPage]           = useState(0);
  const [totalElements,  setTotalElements]  = useState(0);
  const [totalPages,     setTotalPages]     = useState(0);
  const [search,         setSearch]         = useState('');
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [showModal,      setShowModal]      = useState(false);
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [form,           setForm]           = useState<PatientForm>({ ...BLANK });

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await patientsApi.list(p, PAGE_SIZE);
      setPatients(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
      setTotalPages(data.totalPages ?? 0);
    }
    catch (e: unknown) { setError(tr('pacientes.error_cargar_pacientes_error', { error: getErrorMessage(e) })); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  const filtered = patients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName?.toLowerCase().includes(q) ||
      p.lastName?.toLowerCase().includes(q) ||
      p.documentNumber?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setForm({ ...BLANK }); setEditingId(null); setError(null); setShowModal(true);
  };

  const openEdit = (p: Patient) => {
    setForm({
      documentType:   p.documentType   || 'DNI',
      documentNumber: p.documentNumber || '',
      firstName:      p.firstName      || '',
      lastName:       p.lastName       || '',
      birthDate:      p.birthDate      || '',
      gender:         p.gender         || '',
      phone:          p.phone          || '',
      email:          p.email          || '',
      isPregnant:     p.isPregnant,
      hasDisability:  p.hasDisability,
      active:         p.active,
    });
    setEditingId(p.id); setError(null); setShowModal(true);
  };

  const save = async () => {
    if (!form.documentNumber || !form.firstName || !form.lastName) {
      setError(tr('pacientes.numero_documento_nombres_y_apellidos')); return;
    }
    const phoneProblem = phoneError(form.phone);
    if (phoneProblem) { setError(phoneProblem); return; }
    setError(null);
    try {
      if (editingId) {
        const updated = await patientsApi.update(editingId, toRequest(form));
        setPatients(prev => prev.map(p => p.id === editingId ? updated : p));
      } else {
        await patientsApi.create(toRequest(form));
        load(0);
        setPage(0);
      }
      setShowModal(false);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const toggleActive = async (p: Patient) => {
    try {
      const updated = await patientsApi.update(p.id, toRequest({
        documentType: p.documentType, documentNumber: p.documentNumber, firstName: p.firstName, lastName: p.lastName,
        birthDate: p.birthDate ?? '', gender: p.gender ?? '', phone: p.phone ?? '', email: p.email ?? '',
        isPregnant: p.isPregnant, hasDisability: p.hasDisability, active: !p.active,
      }));
      setPatients(prev => prev.map(x => x.id === p.id ? updated : x));
    } catch (e: unknown) { setError(tr('common.error_error', { error: getErrorMessage(e) })); }
  };

  return (
    <div className="space-y-6">
      <Card padding="none">
        <div className="px-6 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
          <div>
            <h3 className="text-sm font-semibold text-surface-900">{tr('pacientes.pacientes_registrados')}</h3>
            <p className="text-xs text-surface-500 mt-0.5">{trp('pacientes.total_pacientes', totalElements)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder={tr('pacientes.buscar_por_nombre_o_documento')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64"
            />
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} loading={loading} onClick={() => load(page)}>
              {tr('common.recargar')}
            </Button>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              {tr('common.nuevo')}
            </Button>
          </div>
        </div>

        {error && <div className="px-6 pt-3"><FormError msg={error} onDismiss={() => setError(null)} /></div>}

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-surface-100">
                <TH>{tr('pacientes.paciente')}</TH>
                <TH>{tr('pacientes.documento')}</TH>
                <TH>{tr('common.contacto')}</TH>
                <TH>{tr('pacientes.flags')}</TH>
                <TH>{tr('common.estado')}</TH>
                <TH className="text-right">{tr('common.acciones')}</TH>
              </tr>
            </thead>
            <tbody>
              {loading && patients.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center"><Spinner /></td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <TD>
                    <div className="font-semibold text-surface-900">{p.firstName} {p.lastName}</div>
                    <div className="text-xs text-surface-400">{p.birthDate || '—'}</div>
                  </TD>
                  <TD>
                    <Badge variant="primary">{p.documentType}</Badge>
                    <span className="ml-1.5 font-mono text-xs text-surface-700">{p.documentNumber}</span>
                  </TD>
                  <TD className="text-surface-600">
                    <div>{p.phone || '—'}</div>
                    <div className="text-xs text-surface-400">{p.email || ''}</div>
                  </TD>
                  <TD>
                    <div className="flex gap-1 flex-wrap">
                      {p.isPregnant    && <Badge variant="warning">{tr('pacientes.gestante')}</Badge>}
                      {p.isElderly     && <Badge variant="primary">{tr('common.adulto_mayor')}</Badge>}
                      {p.hasDisability && <Badge variant="danger">{tr('pacientes.discap')}</Badge>}
                    </div>
                  </TD>
                  <TD>
                    <button onClick={() => toggleActive(p)}>
                      {p.active
                        ? <Badge variant="success" dot>{tr('common.activo')}</Badge>
                        : <Badge variant="gray"    dot>{tr('common.inactivo')}</Badge>}
                    </button>
                  </TD>
                  <TD className="text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </TD>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-surface-400 text-sm">
                    {search ? tr('pacientes.sin_resultados_pagina') : tr('pacientes.no_hay_pacientes')}
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
            onPageChange={p => { setPage(p); setSearch(''); }}
          />
        </div>
      </Card>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setError(null); }}
        title={editingId ? tr('pacientes.editar_paciente') : tr('pacientes.nuevo_paciente')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{tr('common.cancelar')}</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={save}>
              {editingId ? tr('common.guardar_cambios') : tr('pacientes.crear_paciente')}
            </Button>
          </>
        }
      >
        <FormError msg={error} onDismiss={() => setError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label={tr('pacientes.tipo_documento')} value={form.documentType}
            onChange={v => setForm(f => ({ ...f, documentType: v }))}
            options={docTypeOptions()} fullWidth />
          <Input label={tr('pacientes.numero_documento')} maxLength={20} placeholder="12345678"
            value={form.documentNumber}
            onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))} fullWidth />
          <Input label={tr('common.nombres')} maxLength={100} placeholder={tr('pacientes.juan')}
            value={form.firstName}
            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} fullWidth />
          <Input label={tr('common.apellidos')} maxLength={100} placeholder={tr('pacientes.perez_garcia')}
            value={form.lastName}
            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} fullWidth />
          <Input label={tr('pacientes.fecha_nacimiento')} type="date"
            value={form.birthDate}
            onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} fullWidth />
          <Select label={tr('pacientes.genero')} value={form.gender}
            onChange={v => setForm(f => ({ ...f, gender: v }))}
            options={withEmpty(tr('pacientes.no_especificado'), genderOptions())} fullWidth />
          <Input label={tr('common.telefono')} maxLength={20} placeholder="+51 999 999 999"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} fullWidth />
          <Input label={tr('common.correo_electronico')} maxLength={150} type="email" placeholder="paciente@email.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} fullWidth />
        </div>
        <div className="mt-4 flex flex-wrap gap-5 pt-3 border-t border-surface-100">
          {([
            { key: 'isPregnant',    label: tr('pacientes.flag_gestante') },
            { key: 'hasDisability', label: tr('pacientes.flag_discapacidad') },
            ...(editingId ? [{ key: 'active', label: tr('pacientes.flag_activo') }] : []),
          ] as Array<{ key: PatientFlag; label: string }>).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              {label}
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
};
