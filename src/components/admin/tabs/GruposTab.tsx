import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, RefreshCw, Edit2, Trash2, Save, ChevronRight, ChevronDown, FolderTree, FolderPlus, UserPlus, UserMinus,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Input, Modal, Select } from '../../ui';
import { userGroupsApi, usersApi } from '../../../services/api';
import { FormError, TH, TD } from './_shared';

interface Group {
  id: string; code: string; name: string; description: string | null;
  parentId: string | null; active: boolean; memberCount: number;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', DOCTOR: 'Médico', OPERATOR: 'Operador', KIOSK: 'Kiosko',
};

const BLANK_FORM = { code: '', name: '', description: '', parentId: '' };

export const GruposTab: React.FC = () => {
  const [groups,     setGroups]     = useState<Group[]>([]);
  const [allUsers,   setAllUsers]   = useState<any[]>([]);
  const [members,    setMembers]    = useState<any[]>([]);
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
    try { setGroups(await userGroupsApi.list() as Group[]); }
    catch (e: any) { setError(`Error al cargar grupos: ${e.message}`); }
  };

  const loadMembers = async (id: string) => {
    try { setMembers(await userGroupsApi.members(id) as any[]); }
    catch (e: any) { setError(`Error al cargar miembros: ${e.message}`); }
  };

  useEffect(() => {
    loadGroups();
    usersApi.list(0, 500).then((d: any) => setAllUsers(d.content ?? []))
      .catch((e: any) => setError(`Error al cargar usuarios: ${e.message}`));
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
    const opts: { value: string; label: string }[] = [{ value: '', label: 'Sin grupo padre (nivel principal)' }];
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
      setModalErr(editingId ? 'El nombre es obligatorio.' : 'Código y nombre son obligatorios.'); return;
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
    } catch (e: any) { setModalErr(e.message); }
  };

  const toggleGroup = async (g: Group) => {
    try { await userGroupsApi.toggleActive(g.id); await loadGroups(); }
    catch (e: any) { setError(e.message); }
  };

  const deleteGroup = async (g: Group) => {
    if (!confirm(`¿Eliminar el grupo "${g.name}"? Se quitarán sus miembros del grupo (los usuarios no se eliminan).`)) return;
    try {
      await userGroupsApi.remove(g.id);
      if (selectedId === g.id) setSelectedId(null);
      await loadGroups();
    } catch (e: any) { setError(e.message?.includes('subgroups') ? 'El grupo tiene subgrupos. Muévelos o elimínalos primero.' : e.message); }
  };

  // ── member actions ─────────────────────────────────────────────────────────

  const addMember = async () => {
    if (!selectedId || !userToAdd) return;
    try {
      await userGroupsApi.addMember(selectedId, userToAdd);
      setUserToAdd('');
      await Promise.all([loadMembers(selectedId), loadGroups()]);
    } catch (e: any) { setError(e.message); }
  };

  const removeMember = async (userId: string) => {
    if (!selectedId) return;
    try {
      await userGroupsApi.removeMember(selectedId, userId);
      await Promise.all([loadMembers(selectedId), loadGroups()]);
    } catch (e: any) { setError(e.message); }
  };

  const memberIds = new Set(members.map(m => m.id));
  const addOptions = [
    { value: '', label: 'Selecciona un usuario…' },
    ...allUsers.filter(u => u.active && !memberIds.has(u.id))
      .map(u => ({ value: u.id, label: `${u.fullName} (${u.username})` })),
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
              {!g.active && <Badge variant="gray">Inactivo</Badge>}
            </div>
            <div className="text-[11px] text-surface-400 font-mono">{g.code} · {g.memberCount} miembro{g.memberCount === 1 ? '' : 's'}</div>
          </div>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button title="Agregar subgrupo" onClick={e => { e.stopPropagation(); openCreate(g.id); }}
              className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50"><FolderPlus className="w-4 h-4" /></button>
            <button title="Editar" onClick={e => { e.stopPropagation(); openEdit(g); }}
              className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50"><Edit2 className="w-4 h-4" /></button>
            <button title={g.active ? 'Desactivar' : 'Activar'} onClick={e => { e.stopPropagation(); toggleGroup(g); }}
              className="px-1.5 text-[11px] font-semibold rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50">
              {g.active ? 'Desactivar' : 'Activar'}
            </button>
            <button title="Eliminar" onClick={e => { e.stopPropagation(); deleteGroup(g); }}
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
              <h3 className="text-sm font-semibold text-surface-900">Grupos de Usuarios</h3>
              <p className="text-xs text-surface-500 mt-0.5">{groups.length} grupo{groups.length === 1 ? '' : 's'} · organización jerárquica</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadGroups} />
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => openCreate(null)}>Nuevo</Button>
            </div>
          </div>
          <div className="p-3 max-h-[560px] overflow-y-auto">
            {roots.length === 0
              ? <p className="py-10 text-center text-sm text-surface-400">Aún no hay grupos. Crea el primero con “Nuevo”.</p>
              : roots.map(g => renderNode(g, 0))}
          </div>
        </Card>

        {/* Detail */}
        <Card padding="none" className="lg:col-span-3">
          {!selected ? (
            <div className="py-20 text-center text-sm text-surface-400 flex flex-col items-center gap-2">
              <FolderTree className="w-8 h-8 text-surface-300" />
              Selecciona un grupo para ver y administrar sus miembros
            </div>
          ) : (
            <>
              <div className="px-6 pt-5 pb-4 border-b border-surface-100">
                <CardHeader title={selected.name} subtitle={pathOf(selected.id)} />
                {selected.description && <p className="text-sm text-surface-600 -mt-2">{selected.description}</p>}
              </div>
              <div className="px-6 py-4 flex flex-wrap items-end gap-3 border-b border-surface-100">
                <div className="flex-1 min-w-[220px]">
                  <Select label="Agregar miembro" value={userToAdd} onChange={setUserToAdd} options={addOptions} fullWidth />
                </div>
                <Button size="sm" icon={<UserPlus className="w-4 h-4" />} disabled={!userToAdd} onClick={addMember} className="mb-0.5">
                  Agregar
                </Button>
              </div>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-surface-100">
                      <TH>Usuario</TH><TH>Nombre completo</TH><TH>Rol</TH><TH className="text-right">Quitar</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                        <TD><code className="text-xs font-mono font-semibold text-primary-700">{m.username}</code></TD>
                        <TD className="font-semibold text-surface-900">{m.fullName}</TD>
                        <TD><Badge variant="primary">{ROLE_LABELS[m.role] ?? m.role}</Badge></TD>
                        <TD className="text-right">
                          <button onClick={() => removeMember(m.id)} title="Quitar del grupo"
                            className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </TD>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-surface-400 text-sm">Este grupo aún no tiene miembros directos</td></tr>
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
        title={editingId ? 'Editar Grupo' : 'Nuevo Grupo'}
        description="Los grupos organizan usuarios; un grupo puede estar dentro de otro"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveGroup}>
              {editingId ? 'Guardar Cambios' : 'Crear Grupo'}
            </Button>
          </>
        }
      >
        <FormError msg={modalErr} onDismiss={() => setModalErr(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Código *" placeholder="PED" maxLength={30} disabled={!!editingId}
            value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} fullWidth />
          <Input label="Nombre *" placeholder="Pediatría"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
          <div className="sm:col-span-2">
            <Select label="Grupo padre" value={form.parentId}
              onChange={v => setForm(f => ({ ...f, parentId: v }))} options={parentOptions} fullWidth />
          </div>
          <div className="sm:col-span-2">
            <Input label="Descripción" placeholder="Descripción opcional" maxLength={255}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth />
          </div>
        </div>
      </Modal>
    </div>
  );
};
