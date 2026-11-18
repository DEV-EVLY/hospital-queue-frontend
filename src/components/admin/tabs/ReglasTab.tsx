import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Edit2, Trash2, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardHeader, Badge, Button, Input, Modal, Select } from '../../ui';
import { priorityRulesApi } from '../../../services/api';
import { FormError } from './_shared';

// ── Diccionarios (backend envía códigos en inglés) ───────────────────────────

const CONDITION_LABELS: Record<string, string> = {
  URGENT_TRIAGE:         'Triaje urgente',
  DISABILITY:            'Discapacidad',
  PREGNANT:              'Gestante',
  ELDERLY:               'Adulto mayor',
  SCHEDULED_APPOINTMENT: 'Cita programada',
  MINOR_AGE:             'Menor de edad',
  CUSTOM:                'Personalizada',
};

const CONDITION_HINTS: Record<string, string> = {
  URGENT_TRIAGE:         'Paciente clasificado como urgencia en el triaje',
  DISABILITY:            'Paciente con discapacidad declarada',
  PREGNANT:              'Paciente en estado de gestación',
  ELDERLY:               'Paciente con edad mayor o igual al umbral',
  SCHEDULED_APPOINTMENT: 'Paciente con cita dentro de la ventana de tolerancia',
  MINOR_AGE:             'Paciente con edad menor o igual al umbral',
  CUSTOM:                'Condición definida mediante una expresión personalizada',
};

const LEVEL_LABELS: Record<string, string> = {
  URGENT: 'Urgente', PREFERENTIAL: 'Preferencial', NORMAL: 'Normal',
};
const LEVEL_VARIANT: Record<string, 'danger' | 'warning' | 'primary'> = {
  URGENT: 'danger', PREFERENTIAL: 'warning', NORMAL: 'primary',
};

// Nombres de las reglas sembradas por defecto (la base los guarda en inglés)
const SEED_NAME_ES: Record<string, string> = {
  'Urgent Triage (Red)':   'Triaje Urgente (Rojo)',
  'Disability Priority':   'Prioridad por Discapacidad',
  'Pregnant Women':        'Gestantes',
  'Elderly Priority':      'Prioridad Adulto Mayor',
  'Scheduled Appointment': 'Cita Programada',
  'Minor Patient':         'Paciente Menor de Edad',
};
const ruleName = (n: string) => SEED_NAME_ES[n] ?? n;

const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }));
const LEVEL_OPTIONS = [
  { value: 'URGENT',       label: 'Urgente' },
  { value: 'PREFERENTIAL', label: 'Preferencial' },
  { value: 'NORMAL',       label: 'Normal' },
];

const BLANK_RULE = {
  name: '', condition: 'ELDERLY', resultLevel: 'PREFERENTIAL',
  priorityPoints: 10, maxWaitMinutes: 60, evaluationOrder: 0,
  ageThreshold: '' as number | '', toleranceWindowMin: '' as number | '', customConditionExpr: '',
};

const numOrNull = (v: number | '') => (v === '' ? null : Number(v));

export const ReglasTab: React.FC = () => {
  const [rules,     setRules]     = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,      setForm]      = useState<any>({ ...BLANK_RULE });
  const [error,     setError]     = useState<string | null>(null);

  const load = async () => {
    try { setRules(await priorityRulesApi.list() as any[]); }
    catch (e: any) { setError(`Error al cargar reglas: ${e.message}`); }
  };

  useEffect(() => { load(); }, []);

  const set = (patch: Record<string, any>) => setForm((f: any) => ({ ...f, ...patch }));

  const openCreate = () => {
    setForm({ ...BLANK_RULE, evaluationOrder: rules.length + 1 });
    setEditingId(null); setError(null); setShowModal(true);
  };

  const openEdit = (r: any) => {
    setForm({
      name: ruleName(r.name),
      condition: r.condition,
      resultLevel: r.resultLevel,
      priorityPoints: r.priorityPoints,
      maxWaitMinutes: r.maxWaitMinutes,
      evaluationOrder: r.evaluationOrder,
      ageThreshold: r.parameters?.ageThreshold ?? '',
      toleranceWindowMin: r.parameters?.toleranceWindowMin ?? '',
      customConditionExpr: r.parameters?.customConditionExpr ?? '',
    });
    setEditingId(r.id); setError(null); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setError(null); };

  const save = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (form.condition === 'CUSTOM' && !form.customConditionExpr.trim()) {
      setError('Indica la expresión de la condición personalizada.'); return;
    }
    if (form.maxWaitMinutes < 1) { setError('El SLA debe ser de al menos 1 minuto.'); return; }
    setError(null);
    const payload = {
      name: form.name.trim(),
      condition: form.condition,
      resultLevel: form.resultLevel,
      priorityPoints: Number(form.priorityPoints),
      maxWaitMinutes: Number(form.maxWaitMinutes),
      evaluationOrder: Number(form.evaluationOrder),
      parameters: {
        ageThreshold: numOrNull(form.ageThreshold),
        toleranceWindowMin: numOrNull(form.toleranceWindowMin),
        customConditionExpr: form.condition === 'CUSTOM' ? form.customConditionExpr.trim() : null,
      },
    };
    try {
      if (editingId) {
        const updated = await priorityRulesApi.update(editingId, payload);
        setRules(prev => prev.map(r => r.id === editingId ? updated : r));
      } else {
        const created = await priorityRulesApi.create(payload);
        setRules(prev => [...prev, created]);
      }
      setShowModal(false);
    } catch (e: any) { setError(e.message); }
  };

  const toggleRule = async (id: string) => {
    try {
      await priorityRulesApi.toggle(id);
      setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    } catch (e: any) { setError(`Error al alternar: ${e.message}`); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('¿Eliminar esta regla de priorización?')) return;
    try {
      await priorityRulesApi.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (e: any) { setError(`Error al eliminar: ${e.message}`); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Motor de Priorización Parametrizable"
          subtitle="Reglas evaluadas en tiempo real al dispensar tickets"
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
                Recargar
              </Button>
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                Nueva Regla
              </Button>
            </div>
          }
        />
        {!showModal && <FormError msg={error} onDismiss={() => setError(null)} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...rules].sort((a, b) => a.evaluationOrder - b.evaluationOrder).map(r => (
            <div
              key={r.id}
              className={`rounded-xl border p-5 transition-all ${
                r.active ? 'border-surface-200 bg-white shadow-sm' : 'border-surface-100 bg-surface-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Badge variant={LEVEL_VARIANT[r.resultLevel] ?? 'primary'}>
                      {LEVEL_LABELS[r.resultLevel] ?? r.resultLevel}
                    </Badge>
                    <span className="text-[11px] text-surface-400">Orden {r.evaluationOrder}</span>
                  </div>
                  <h4 className="font-semibold text-surface-900">{ruleName(r.name)}</h4>
                  <p className="text-xs text-surface-500 mt-0.5">{CONDITION_HINTS[r.condition] ?? ''}</p>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => openEdit(r)}
                    title="Editar regla"
                    className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRule(r.id)}
                    title="Eliminar regla"
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleRule(r.id)} className="ml-1" title={r.active ? 'Desactivar' : 'Activar'}>
                    {r.active
                      ? <ToggleRight className="w-8 h-8 text-green-500" />
                      : <ToggleLeft  className="w-8 h-8 text-surface-300" />}
                  </button>
                </div>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 space-y-1.5 text-xs border border-surface-100">
                <div className="flex justify-between">
                  <span className="text-surface-500">Condición:</span>
                  <span className="font-semibold text-primary-700">{CONDITION_LABELS[r.condition] ?? r.condition}</span>
                </div>
                {r.parameters?.ageThreshold != null && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">Edad umbral:</span>
                    <span className="font-semibold text-surface-700">{r.parameters.ageThreshold} años</span>
                  </div>
                )}
                {r.parameters?.toleranceWindowMin != null && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">Ventana de tolerancia:</span>
                    <span className="font-semibold text-surface-700">{r.parameters.toleranceWindowMin} min</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-surface-500">Puntos de prioridad:</span>
                  <span className="font-semibold text-green-700">+{r.priorityPoints} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Tiempo máximo de espera:</span>
                  <span className="font-semibold text-amber-700">{r.maxWaitMinutes} min</span>
                </div>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="col-span-2 py-8 text-center text-surface-400 text-sm">
              No hay reglas de priorización configuradas
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingId ? 'Editar Regla de Priorización' : 'Nueva Regla de Priorización'}
        description="Define los criterios para modificar la prioridad automáticamente"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={save}>
              {editingId ? 'Guardar Cambios' : 'Crear Regla'}
            </Button>
          </>
        }
      >
        <FormError msg={error} onDismiss={() => setError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre *" placeholder="Adulto Mayor"
            value={form.name} onChange={e => set({ name: e.target.value })} fullWidth />
          <Select label="Condición *" value={form.condition}
            onChange={v => set({ condition: v })} options={CONDITION_OPTIONS} fullWidth />
          <Select label="Nivel de prioridad resultante" value={form.resultLevel}
            onChange={v => set({ resultLevel: v })} options={LEVEL_OPTIONS} fullWidth />
          <Input label="Puntos de prioridad" type="number" min={0} max={999}
            value={form.priorityPoints} onChange={e => set({ priorityPoints: +e.target.value })} fullWidth />
          <Input label="Tiempo máx. de espera (min)" type="number" min={1}
            value={form.maxWaitMinutes} onChange={e => set({ maxWaitMinutes: +e.target.value })} fullWidth />
          <Input label="Orden de evaluación" type="number" min={0}
            value={form.evaluationOrder} onChange={e => set({ evaluationOrder: +e.target.value })} fullWidth />

          {(form.condition === 'ELDERLY' || form.condition === 'MINOR_AGE') && (
            <Input label="Edad umbral (años)" type="number" min={0} placeholder={form.condition === 'ELDERLY' ? '60' : '12'}
              value={form.ageThreshold}
              onChange={e => set({ ageThreshold: e.target.value === '' ? '' : +e.target.value })} fullWidth />
          )}
          {form.condition === 'SCHEDULED_APPOINTMENT' && (
            <Input label="Ventana de tolerancia (min)" type="number" min={0} placeholder="15"
              value={form.toleranceWindowMin}
              onChange={e => set({ toleranceWindowMin: e.target.value === '' ? '' : +e.target.value })} fullWidth />
          )}
          {form.condition === 'CUSTOM' && (
            <div className="sm:col-span-2">
              <Input label="Expresión personalizada *" placeholder="age > 70 && hasDisability"
                value={form.customConditionExpr}
                onChange={e => set({ customConditionExpr: e.target.value })} fullWidth />
            </div>
          )}
        </div>
        <p className="text-xs text-surface-400 mt-3">{CONDITION_HINTS[form.condition]}</p>
      </Modal>
    </div>
  );
};
