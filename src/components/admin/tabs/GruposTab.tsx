import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, RefreshCw, Edit2, Trash2, Save, ChevronRight, ChevronDown, FolderTree, FolderPlus, UserPlus, UserMinus,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Checkbox, Input, Modal, Select } from '../../ui';
import { userGroupsApi, usersApi, medicalServicesApi, getErrorMessage } from '../../../services/api';
import { FormError, TH, TD } from './_shared';
import type { UserGroup as Group, UserGroupMembership, User, MedicalService, Role } from '../../../types/api';
import { tr, trp, roleLabel } from '../../../i18n';

/** Solo personal asistencial se organiza en grupos (no administradores ni cuentas de kiosko). */
const GROUP_ROLES: Role[] = ['OPERATOR', 'SUPERVISOR', 'DOCTOR'];

const BLANK_FORM = { code: '', name: '', description: '', parentId: '' };

export const GruposTab: React.FC = () => {
  const [groups,     setGroups]     = useState<Group[]>([]);
  const [allUsers,   setAllUsers]   = useState<User[]>([]);
  const [members,    setMembers]    = useState<User[]>([]);
  const [memberships, setMemberships] = useState<UserGroupMembership[]>([]);
  const [services,   setServices]   = useState<MedicalService[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed,  setCollapsed]  = useState<Set<string>>(new Set());
  const [error,      setError]      = useState<string | null>(null);

  // group modal (create + edit)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,      setForm]      = useState({ ...BLANK_FORM });
  const [modalErr,  setModalErr]  = useState<string | null>(null);

  // member picker
  const [userToAdd, setUserToAdd] = useState('');

  // ── data ───────────────────────────────────────────────────────────────────

  const loadGroups = async () => {
    try {
      const [g, m] = await Promise.all([userGroupsApi.list(), userGroupsApi.memberships()]);
      setGroups(g);
      setMemberships(m);
    } catch (e: unknown) { setError(tr('grupos.error_cargar_grupos_error', { error: getErrorMessage(e) })); }
  };

  const loadMembers = async (id: string) => {
    try { setMembers(await userGroupsApi.members(id)); }
    catch (e: unknown) { setError(tr('grupos.error_cargar_miembros_error', { error: getErrorMessage(e) })); }
  };

  useEffect(() => {
    loadGroups();
    medicalServicesApi.list().then(s => setServices(s.filter(x => x.active)))
      .catch((e: unknown) => setError(tr('common.error_cargar_servicios_error', { error: getErrorMessage(e) })));
    usersApi.list(0, 500).then(d => setAllUsers(d.content))
      .catch((e: unknown) => setError(tr('common.error_cargar_usuarios_error', { error: getErrorMessage(e) })));
  }, []);

  useEffect(() => {
    if (selectedId) loadMembers(selectedId); else setMembers([]);
    setUserToAdd('');
  }, [selectedId]);

  // ── tree helpers ───────────────────────────────────────────────────────────

  const children = useMemo(() => {
    const map = new Map<string | null, Group[]>();
    groups.forEach(g => {
      const key = g.parentId ?? null;
      map.set(key, [...(map.get(key) ?? []), g]);
    });
    return map;
  }, [groups]);

  const byId = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);

  const descendantIds = (id: string): Set<string> => {
    const out = new Set<string>([id]);
    const walk = (pid: string) => (children.get(pid) ?? []).forEach(c => { out.add(c.id); walk(c.id); });
    walk(id);
    return out;
  };

  const pathOf = (id: string): string => {
    const parts: string[] = [];
    let cur = byId.get(id);
    while (cur) { parts.unshift(cur.name); cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
    return parts.join(' › ');
  };

  const parentOptions = useMemo(() => {
    const blocked = editingId ? descendantIds(editingId) : new Set<string>();
    const opts: { value: string; label: string }[] = [{ value: '', label: tr('grupos.sin_padre') }];
    const walk = (parent: string | null, depth: number) => {
      (children.get(parent) ?? []).forEach(g => {
        if (!blocked.has(g.id)) opts.push({ value: g.id, label: `${'— '.repeat(depth)}${g.name}` });
        walk(g.id, depth + 1);
      });
    };
    walk(null, 0);
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, editingId]);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  // ── group actions ──────────────────────────────────────────────────────────

  const openCreate = (parentId: string | null = null) => {
    setForm({ ...BLANK_FORM, parentId: parentId ?? '' });
    setEditingId(null); setModalErr(null); setShowModal(true);
  };

  const openEdit = (g: Group) => {
    setForm({ code: g.code, name: g.name, description: g.description ?? '', parentId: g.parentId ?? '' });
    setEditingId(g.id); setModalErr(null); setShowModal(true);
  };

  const saveGroup = async () => {
    if (!form.name.trim() || (!editingId && !form.code.trim())) {
      setModalErr(editingId ? tr('grupos.nombre_obligatorio') : tr('grupos.codigo_nombre_obligatorios')); return;
    }
    if (editingId && form.parentId && form.parentId !== (byId.get(editingId)?.parentId ?? '')) {
      const inParent = new Set(memberships.filter(m => m.groupId === form.parentId).map(m => m.userId));
      const missing = memberships.filter(m => m.groupId === editingId && !inParent.has(m.userId)).length;
      if (missing > 0) {
        setModalErr(trp('grupos.mover_bloqueado', missing, { parent: byId.get(form.parentId)?.name ?? '' }));
        return;
      }
    }
    setModalErr(null);
    const payload = {
      code: form.code.trim(), name: form.name.trim(),
      description: form.description.trim() || null, parentId: form.parentId || null,
    };
    try {
      if (editingId) await userGroupsApi.update(editingId, payload);
      else           await userGroupsApi.create(payload);
      setShowModal(false);
      if (payload.parentId) setCollapsed(prev => { const n = new Set(prev); n.delete(payload.parentId!); return n; });
      await loadGroups();
    } catch (e: unknown) { setModalErr(getErrorMessage(e)); }
  };

  const toggleGroup = async (g: Group) => {
    try { await userGroupsApi.toggleActive(g.id); await loadGroups(); }
    catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const deleteGroup = async (g: Group) => {
    if (!confirm(tr('grupos.eliminar_grupo_name_se_quitaran', { name: g.name }))) return;
    try {
      await userGroupsApi.remove(g.id);
      if (selectedId === g.id) setSelectedId(null);
      await loadGroups();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  // ── member actions ─────────────────────────────────────────────────────────

  const addMember = async () => {
    if (!selectedId || !userToAdd) return;
    try {
      await userGroupsApi.addMember(selectedId, userToAdd);
      setUserToAdd('');
      await Promise.all([loadMembers(selectedId), loadGroups()]);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const removeMember = async (userId: string) => {
    if (!selectedId) return;
    const below = descendantIds(selectedId);
    below.delete(selectedId);
    const affected = memberships.filter(m => m.userId === userId && below.has(m.groupId)).length;
    if (affected > 0 && !confirm(trp('grupos.confirm_quitar_usuario', affected))) return;
    try {
      await userGroupsApi.removeMember(selectedId, userId);
      await Promise.all([loadMembers(selectedId), loadGroups()]);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const memberIds = new Set(members.map(m => m.id));
  const parentGroup = selected?.parentId ? byId.get(selected.parentId) ?? null : null;
  // Un subgrupo solo admite usuarios que ya pertenecen a su grupo padre
  const parentMemberIds = parentGroup
    ? new Set(memberships.filter(m => m.groupId === parentGroup.id).map(m => m.userId))
    : null;
  const candidates = allUsers.filter(u =>
    u.active && GROUP_ROLES.includes(u.role) && !memberIds.has(u.id)
    && (parentMemberIds === null || parentMemberIds.has(u.id)));
  const hasServices = (selected?.serviceIds.length ?? 0) > 0;
  // Servicios que se pueden elegir: todos (grupo principal) o solo los del padre (subgrupo)
  const serviceChoices = parentGroup
    ? services.filter(s => parentGroup.serviceIds.includes(s.id))
    : services;
  const serviceName = (id: string) => services.find(s => s.id === id)?.name ?? id.slice(0, 8);

  const toggleService = async (serviceId: string) => {
    if (!selected) return;
    const has = selected.serviceIds.includes(serviceId);
    if (has) {
      const below = descendantIds(selected.id);
      below.delete(selected.id);
      const affected = groups.filter(g => below.has(g.id) && g.serviceIds.includes(serviceId)).length;
      if (affected > 0 && !confirm(trp('grupos.confirm_quitar_servicio', affected, { service: serviceName(serviceId) }))) return;
    }
    const next = has ? selected.serviceIds.filter(id => id !== serviceId) : [...selected.serviceIds, serviceId];
    try { await userGroupsApi.setServices(selected.id, next); await loadGroups(); }
    catch (e: unknown) { setError(getErrorMessage(e)); }
  };
  const addOptions = [
    { value: '', label: candidates.length === 0 ? tr('grupos.sin_usuarios_disponibles') : tr('grupos.selecciona_usuario') },
    ...candidates.map(u => ({ value: u.id, label: `${u.fullName} (${u.username})` })),
  ];

  const toggleCollapse = (id: string) =>
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── render ─────────────────────────────────────────────────────────────────

  const renderNode = (g: Group, depth: number): React.ReactNode => {
    const kids = children.get(g.id) ?? [];
    const isOpen = !collapsed.has(g.id);
    const isSel = selectedId === g.id;
    return (
      <div key={g.id}>
        <div
          className={`group flex items-center gap-1 rounded-lg pr-1 cursor-pointer transition-colors ${
            isSel ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-surface-50'
          } ${g.active ? '' : 'opacity-60'}`}
          style={{ paddingLeft: depth * 20 + 4 }}
          onClick={() => setSelectedId(g.id)}
        >
          <button
            className="p-1 text-surface-400 hover:text-surface-700 shrink-0"
            onClick={e => { e.stopPropagation(); if (kids.length) toggleCollapse(g.id); }}
            style={{ visibility: kids.length ? 'visible' : 'hidden' }}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="flex-1 min-w-0 py-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-surface-900 truncate">{g.name}</span>
              {!g.active && <Badge variant="gray">{tr('common.inactivo')}</Badge>}
            </div>
            <div className="text-[11px] text-surface-400 font-mono">{g.code} · {trp('grupos.miembros', g.memberCount)} · {trp('grupos.servicios', g.serviceIds.length)}</div>
          </div>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button title={tr('grupos.agregar_subgrupo')} onClick={e => { e.stopPropagation(); openCreate(g.id); }}
              className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50"><FolderPlus className="w-4 h-4" /></button>
            <button title={tr('grupos.editar')} onClick={e => { e.stopPropagation(); openEdit(g); }}
              className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50"><Edit2 className="w-4 h-4" /></button>
            <button title={g.active ? tr('common.desactivar') : tr('common.activar')} onClick={e => { e.stopPropagation(); toggleGroup(g); }}
              className="px-1.5 text-[11px] font-semibold rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50">
              {g.active ? tr('common.desactivar') : tr('common.activar')}
            </button>
            <button title={tr('grupos.eliminar')} onClick={e => { e.stopPropagation(); deleteGroup(g); }}
              className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        {isOpen && kids.map(k => renderNode(k, depth + 1))}
      </div>
    );
  };

  const roots = children.get(null) ?? [];

  return (
    <div className="space-y-6">
      <FormError msg={showModal ? null : error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Tree */}
        <Card padding="none" className="lg:col-span-2">
          <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
            <div>
              <h3 className="text-sm font-semibold text-surface-900">{tr('grupos.grupos_usuarios')}</h3>
              <p className="text-xs text-surface-500 mt-0.5">{trp('grupos.grupos', groups.length)} · {tr('grupos.organizacion_jerarquica')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadGroups} />
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => openCreate(null)}>{tr('common.nuevo')}</Button>
            </div>
          </div>
          <div className="p-3 max-h-[560px] overflow-y-auto">
            {roots.length === 0
              ? <p className="py-10 text-center text-sm text-surface-400">{tr('grupos.aun_no_hay_grupos_crea')}</p>
              : roots.map(g => renderNode(g, 0))}
          </div>
        </Card>

        {/* Detail */}
        <Card padding="none" className="lg:col-span-3">
          {!selected ? (
            <div className="py-20 text-center text-sm text-surface-400 flex flex-col items-center gap-2">
              <FolderTree className="w-8 h-8 text-surface-300" />
              {tr('grupos.selecciona_grupo_para_ver_y')}
            </div>
          ) : (
            <>
              <div className="px-6 pt-5 pb-4 border-b border-surface-100">
                <CardHeader title={selected.name} subtitle={pathOf(selected.id)} />
                {selected.description && <p className="text-sm text-surface-600 -mt-2">{selected.description}</p>}
              </div>
              <div className="px-6 py-4 border-b border-surface-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">
                  {tr('grupos.1_servicios_que_atiende_este')}
                </p>
                {serviceChoices.length === 0 ? (
                  <p className="text-xs text-surface-400">
                    {parentGroup
                      ? tr('grupos.padre_sin_servicios', { parent: parentGroup.name })
                      : tr('grupos.sin_servicios_activos')}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {serviceChoices.map(s => {
                      const on = selected.serviceIds.includes(s.id);
                      return (
                        <Checkbox key={s.id} variant="card" label={s.name} checked={on}
                          onChange={() => toggleService(s.id)} />
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 flex flex-wrap items-end gap-3 border-b border-surface-100">
                <p className="w-full text-xs font-semibold uppercase tracking-wider text-surface-500 -mb-1">
                  {tr('grupos.2_personas_grupo_operadores_supervisores')}
                </p>
                <div className="flex-1 min-w-[220px]">
                  <Select
                    label={parentGroup ? tr('grupos.agregar_miembro_del_grupo', { parent: parentGroup.name }) : tr('grupos.agregar_miembro')}
                    value={userToAdd} onChange={setUserToAdd} options={addOptions} fullWidth
                    disabled={!hasServices}
                    hint={!hasServices ? tr('grupos.primero_servicios') : parentGroup && candidates.length === 0
                      ? tr('grupos.solo_miembros_del_padre', { parent: parentGroup.name })
                      : undefined}
                  />
                </div>
                <Button size="sm" icon={<UserPlus className="w-4 h-4" />} disabled={!userToAdd || !hasServices} onClick={addMember} className="mb-0.5">
                  {tr('common.agregar')}
                </Button>
              </div>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-surface-100">
                      <TH>{tr('common.usuario')}</TH><TH>{tr('common.nombre_completo')}</TH><TH>{tr('common.rol')}</TH><TH className="text-right">{tr('grupos.quitar')}</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                        <TD><code className="text-xs font-mono font-semibold text-primary-700">{m.username}</code></TD>
                        <TD className="font-semibold text-surface-900">{m.fullName}</TD>
                        <TD><Badge variant="primary">{roleLabel(m.role)}</Badge></TD>
                        <TD className="text-right">
                          <button onClick={() => removeMember(m.id)} title={tr('grupos.quitar_grupo')}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </TD>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-surface-400 text-sm">{tr('grupos.este_grupo_aun_no_tiene')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? tr('grupos.editar_grupo_titulo') : tr('grupos.nuevo_grupo_titulo')}
        description={tr('grupos.grupos_organizan_usuarios_grupo_puede')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{tr('common.cancelar')}</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveGroup}>
              {editingId ? tr('common.guardar_cambios') : tr('grupos.crear_grupo')}
            </Button>
          </>
        }
      >
        <FormError msg={modalErr} onDismiss={() => setModalErr(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={tr('common.codigo_2')} placeholder="PED" maxLength={30} disabled={!!editingId}
            value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} fullWidth />
          <Input label={tr('common.nombre_2')} maxLength={100} placeholder={tr('grupos.pediatria')}
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
          <div className="sm:col-span-2">
            <Select label={tr('grupos.grupo_padre')} value={form.parentId}
              onChange={v => setForm(f => ({ ...f, parentId: v }))} options={parentOptions} fullWidth />
          </div>
          <div className="sm:col-span-2">
            <Input label={tr('common.descripcion')} placeholder={tr('common.descripcion_opcional')} maxLength={255}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth />
          </div>
        </div>
      </Modal>
    </div>
  );
};
