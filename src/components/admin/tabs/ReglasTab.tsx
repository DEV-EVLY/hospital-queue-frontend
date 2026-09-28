import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Edit2, Trash2, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardHeader, Badge, Button, Input, Modal } from '../../ui';
import { priorityRulesApi } from '../../../services/api';
import { FormError } from './_shared';

const BLANK_RULE = { code: '', name: '', description: '', condition: '', priorityPoints: 10, maxWaitMinutes: 60 };

export const ReglasTab: React.FC = () => {
  const [rules,         setRules]         = useState<any[]>([]);
  const [showNewRule,   setShowNewRule]   = useState(false);
  const [newRule,       setNewRule]       = useState({ ...BLANK_RULE });
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editingRule,   setEditingRule]   = useState<any>(null);
  const [error,         setError]         = useState<string | null>(null);

  const load = async () => { try { setRules(await priorityRulesApi.list() as any[]); } catch { /* ok */ } };

  useEffect(() => { load(); }, []);

  const toggleRule = async (id: string) => {
    try {
      await priorityRulesApi.toggle(id);
      setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    } catch (e: any) { setError(`Error al alternar: ${e.message}`); }
  };

  const saveNew = async () => {
    if (!newRule.code || !newRule.name || !newRule.condition) {
      setError('Código, nombre y condición son obligatorios.'); return;
    }
    setError(null);
    try {
      const created = await priorityRulesApi.create(newRule);
      setRules(prev => [...prev, created]);
      setNewRule({ ...BLANK_RULE });
      setShowNewRule(false);
    } catch (e: any) { setError(e.message); }
  };

  const saveEdit = async () => {
    if (!editingRule?.code || !editingRule?.name) { setError('Código y nombre son obligatorios.'); return; }
    setError(null);
    try {
      const updated = await priorityRulesApi.update(editingId!, editingRule);
      setRules(prev => prev.map(r => r.id === editingId ? updated : r));
      setEditingId(null); setEditingRule(null);
    } catch (e: any) { setError(e.message); }
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
              <Button
                variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}
                onClick={() => { setShowNewRule(true); setError(null); }}
              >
                Nueva Regla
              </Button>
            </div>
          }
        />
        <FormError msg={error} onDismiss={() => setError(null)} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map(r => (
            <div
              key={r.id}
              className={`rounded-xl border p-5 transition-all ${
                r.active ? 'border-surface-200 bg-white shadow-sm' : 'border-surface-100 bg-surface-50 opacity-60'
              }`}
            >
              {editingId === r.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Código" value={editingRule.code}
                      onChange={e => setEditingRule((p: any) => ({ ...p, code: e.target.value }))} />
                    <Input label="Nombre" value={editingRule.name}
                      onChange={e => setEditingRule((p: any) => ({ ...p, name: e.target.value }))} />
                    <Input label="Condición" value={editingRule.condition}
                      onChange={e => setEditingRule((p: any) => ({ ...p, condition: e.target.value }))} />
                    <Input label="Descripción" value={editingRule.description}
                      onChange={e => setEditingRule((p: any) => ({ ...p, description: e.target.value }))} />
                    <Input label="Puntos" type="number" value={editingRule.priorityPoints}
                      onChange={e => setEditingRule((p: any) => ({ ...p, priorityPoints: +e.target.value }))} />
                    <Input label="SLA (min)" type="number" value={editingRule.maxWaitMinutes}
                      onChange={e => setEditingRule((p: any) => ({ ...p, maxWaitMinutes: +e.target.value }))} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" icon={<Save className="w-3.5 h-3.5" />} onClick={saveEdit}>Guardar</Button>
                    <Button size="sm" variant="secondary" onClick={() => { setEditingId(null); setEditingRule(null); }}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant="primary" className="mb-1.5">{r.code}</Badge>
                      <h4 className="font-semibold text-surface-900">{r.name}</h4>
                      {r.description && <p className="text-xs text-surface-500 mt-0.5">{r.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => { setEditingId(r.id); setEditingRule({ ...r }); setError(null); }}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteRule(r.id)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleRule(r.id)} className="ml-1">
                        {r.active
                          ? <ToggleRight className="w-8 h-8 text-green-500" />
                          : <ToggleLeft  className="w-8 h-8 text-surface-300" />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-surface-50 rounded-lg p-3 space-y-1.5 text-xs border border-surface-100">
                    <div className="flex justify-between">
                      <span className="text-surface-500">Condición:</span>
                      <code className="font-mono font-semibold text-primary-700">{r.condition}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-500">Puntos de prioridad:</span>
                      <span className="font-semibold text-green-700">+{r.priorityPoints} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-500">SLA máximo:</span>
                      <span className="font-semibold text-amber-700">{r.maxWaitMinutes} min</span>
                    </div>
                  </div>
                </>
              )}
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
        open={showNewRule}
        onClose={() => { setShowNewRule(false); setNewRule({ ...BLANK_RULE }); setError(null); }}
        title="Nueva Regla de Priorización"
        description="Define los criterios para modificar la prioridad automáticamente"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowNewRule(false); setNewRule({ ...BLANK_RULE }); }}>
              Cancelar
            </Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveNew}>
              Crear Regla
            </Button>
          </>
        }
      >
        <FormError msg={error} onDismiss={() => setError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Código *" placeholder="PREFERENTIAL_SENIOR"
            value={newRule.code} onChange={e => setNewRule(r => ({ ...r, code: e.target.value }))} fullWidth />
          <Input label="Nombre *" placeholder="Adulto Mayor"
            value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} fullWidth />
          <Input label="Condición *" placeholder="elderly == true"
            value={newRule.condition} onChange={e => setNewRule(r => ({ ...r, condition: e.target.value }))} fullWidth />
          <Input label="Descripción" placeholder="Descripción breve"
            value={newRule.description} onChange={e => setNewRule(r => ({ ...r, description: e.target.value }))} fullWidth />
          <Input label="Puntos de prioridad" type="number" min={1} max={999}
            value={newRule.priorityPoints} onChange={e => setNewRule(r => ({ ...r, priorityPoints: +e.target.value }))} fullWidth />
          <Input label="SLA máx. (minutos)" type="number" min={1}
            value={newRule.maxWaitMinutes} onChange={e => setNewRule(r => ({ ...r, maxWaitMinutes: +e.target.value }))} fullWidth />
        </div>
      </Modal>
    </div>
  );
};
