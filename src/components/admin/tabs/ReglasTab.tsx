import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Edit2, Trash2, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardHeader, Badge, Button, Input, Modal, Select } from '../../ui';
import type { SelectOption } from '../../ui';
import { priorityRulesApi, getErrorMessage } from '../../../services/api';
import { FormError } from './_shared';
import type { PriorityRule, PriorityRuleRequest, RuleCondition, PriorityLevel } from '../../../types/api';
import { tr, priorityLabel, conditionHint, conditionLabel, ruleDisplayName, conditionOptions, priorityOptions } from '../../../i18n';

interface RuleForm {
  name: string; condition: RuleCondition; resultLevel: PriorityLevel;
  priorityPoints: number; maxWaitMinutes: number; evaluationOrder: number;
  ageThreshold: number | ''; toleranceWindowMin: number | ''; customConditionExpr: string;
}

const LEVEL_VARIANT: Record<PriorityLevel, 'danger' | 'warning' | 'primary'> = {
  URGENT: 'danger', PREFERENTIAL: 'warning', NORMAL: 'primary',
};

const BLANK_RULE: RuleForm = {
  name: '', condition: 'ELDERLY', resultLevel: 'PREFERENTIAL',
  priorityPoints: 10, maxWaitMinutes: 60, evaluationOrder: 0,
  ageThreshold: '', toleranceWindowMin: '', customConditionExpr: '',
};

const numOrNull = (v: number | '') => (v === '' ? null : Number(v));

export const ReglasTab: React.FC = () => {
  const [rules,     setRules]     = useState<PriorityRule[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,      setForm]      = useState<RuleForm>({ ...BLANK_RULE });
  const [error,     setError]     = useState<string | null>(null);

  const load = async () => {
    try { setRules(await priorityRulesApi.list()); }
    catch (e: unknown) { setError(tr('reglas.error_cargar_reglas_error', { error: getErrorMessage(e) })); }
  };

  useEffect(() => { load(); }, []);

  const set = (patch: Partial<RuleForm>) => setForm(f => ({ ...f, ...patch }));

  const openCreate = () => {
    setForm({ ...BLANK_RULE, evaluationOrder: rules.length + 1 });
    setEditingId(null); setError(null); setShowModal(true);
  };

  const openEdit = (r: PriorityRule) => {
    setForm({
      name: ruleDisplayName(r.name),
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
    if (!form.name.trim()) { setError(tr('reglas.nombre_es_obligatorio')); return; }
    if (form.condition === 'CUSTOM' && !form.customConditionExpr.trim()) {
      setError(tr('reglas.indica_expresion_condicion_personalizada')); return;
    }
    if (form.maxWaitMinutes < 1) { setError(tr('reglas.sla_debe_ser_menos_1')); return; }
    setError(null);
    const payload: PriorityRuleRequest = {
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
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const toggleRule = async (id: string) => {
    try {
      await priorityRulesApi.toggle(id);
      setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    } catch (e: unknown) { setError(tr('reglas.error_alternar_error', { error: getErrorMessage(e) })); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm(tr('reglas.eliminar_esta_regla_priorizacion'))) return;
    try {
      await priorityRulesApi.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (e: unknown) { setError(tr('reglas.error_eliminar_error', { error: getErrorMessage(e) })); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={tr('reglas.motor_priorizacion_parametrizable')}
          subtitle={tr('reglas.reglas_evaluadas_tiempo_real_dispensar')}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
                {tr('common.recargar')}
              </Button>
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                {tr('reglas.nueva_regla')}
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
                      {priorityLabel(r.resultLevel)}
                    </Badge>
                    <span className="text-[11px] text-surface-400">Orden {r.evaluationOrder}</span>
                  </div>
                  <h4 className="font-semibold text-surface-900">{ruleDisplayName(r.name)}</h4>
                  <p className="text-xs text-surface-500 mt-0.5">{conditionHint(r.condition)}</p>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => openEdit(r)}
                    title={tr('reglas.editar_regla')}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRule(r.id)}
                    title={tr('reglas.eliminar_regla')}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleRule(r.id)} className="ml-1" title={r.active ? tr('common.desactivar') : tr('common.activar')}>
                    {r.active
                      ? <ToggleRight className="w-8 h-8 text-green-500" />
                      : <ToggleLeft  className="w-8 h-8 text-surface-300" />}
                  </button>
                </div>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 space-y-1.5 text-xs border border-surface-100">
                <div className="flex justify-between">
                  <span className="text-surface-500">{tr('reglas.condicion')}</span>
                  <span className="font-semibold text-primary-700">{conditionLabel(r.condition)}</span>
                </div>
                {r.parameters?.ageThreshold != null && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">{tr('reglas.edad_umbral')}</span>
                    <span className="font-semibold text-surface-700">{tr('reglas.anos', { n: r.parameters.ageThreshold })}</span>
                  </div>
                )}
                {r.parameters?.toleranceWindowMin != null && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">{tr('reglas.ventana_tolerancia')}</span>
                    <span className="font-semibold text-surface-700">{r.parameters.toleranceWindowMin} min</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-surface-500">{tr('reglas.puntos_prioridad')}</span>
                  <span className="font-semibold text-green-700">+{r.priorityPoints} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">{tr('reglas.tiempo_maximo_espera')}</span>
                  <span className="font-semibold text-amber-700">{r.maxWaitMinutes} min</span>
                </div>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="col-span-2 py-8 text-center text-surface-400 text-sm">
              {tr('reglas.no_hay_reglas_priorizacion_configuradas')}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingId ? tr('reglas.editar_regla_titulo') : tr('reglas.nueva_regla_titulo')}
        description={tr('reglas.define_criterios_para_modificar_prioridad')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{tr('common.cancelar')}</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={save}>
              {editingId ? tr('common.guardar_cambios') : tr('reglas.crear_regla')}
            </Button>
          </>
        }
      >
        <FormError msg={error} onDismiss={() => setError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={tr('common.nombre_2')} placeholder={tr('common.adulto_mayor')}
            value={form.name} onChange={e => set({ name: e.target.value })} fullWidth />
          <Select label={tr('reglas.condicion_2')} value={form.condition}
            onChange={v => set({ condition: v })} options={conditionOptions()} fullWidth />
          <Select label={tr('reglas.nivel_prioridad_resultante')} value={form.resultLevel}
            onChange={v => set({ resultLevel: v })} options={priorityOptions()} fullWidth />
          <Input label={tr('reglas.puntos_prioridad_2')} type="number" min={0} max={999}
            value={form.priorityPoints} onChange={e => set({ priorityPoints: +e.target.value })} fullWidth />
          <Input label={tr('reglas.tiempo_max_espera_min')} type="number" min={1}
            value={form.maxWaitMinutes} onChange={e => set({ maxWaitMinutes: +e.target.value })} fullWidth />
          <Input label={tr('reglas.orden_evaluacion')} type="number" min={0}
            value={form.evaluationOrder} onChange={e => set({ evaluationOrder: +e.target.value })} fullWidth />

          {(form.condition === 'ELDERLY' || form.condition === 'MINOR_AGE') && (
            <Input label={tr('reglas.edad_umbral_anos')} type="number" min={0} placeholder={form.condition === 'ELDERLY' ? '60' : '12'}
              value={form.ageThreshold}
              onChange={e => set({ ageThreshold: e.target.value === '' ? '' : +e.target.value })} fullWidth />
          )}
          {form.condition === 'SCHEDULED_APPOINTMENT' && (
            <Input label={tr('reglas.ventana_tolerancia_min')} type="number" min={0} placeholder="15"
              value={form.toleranceWindowMin}
              onChange={e => set({ toleranceWindowMin: e.target.value === '' ? '' : +e.target.value })} fullWidth />
          )}
          {form.condition === 'CUSTOM' && (
            <div className="sm:col-span-2">
              <Input label={tr('reglas.expresion_personalizada')} placeholder="age > 70 && hasDisability"
                value={form.customConditionExpr}
                onChange={e => set({ customConditionExpr: e.target.value })} fullWidth />
            </div>
          )}
        </div>
        <p className="text-xs text-surface-400 mt-3">{conditionHint(form.condition)}</p>
      </Modal>
    </div>
  );
};
