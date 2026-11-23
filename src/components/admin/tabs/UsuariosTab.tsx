import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Edit2, Save } from 'lucide-react';
import { Card, Badge, Button, Input, Modal, Pagination } from '../../ui';
import { Select } from '../../ui';
import type { SelectOption } from '../../ui';
import { usersApi, userGroupsApi, getErrorMessage } from '../../../services/api';
import { getUserId } from '../../../services/auth';
import { FormError, TH, TD } from './_shared';
import type { User, UserGroup, UserGroupMembership, Role, CreateUserRequest } from '../../../types/api';
import { tr, roleLabel, roleOptions } from '../../../i18n';

const BLANK_USER: CreateUserRequest = { username: '', fullName: '', password: '', role: 'OPERATOR' };

const ROLE_VARIANT: Record<Role, 'purple' | 'warning' | 'primary' | 'gray'> = {
  ADMIN: 'purple', SUPERVISOR: 'warning', DOCTOR: 'primary', KIOSK: 'gray', OPERATOR: 'primary',
};
const roleBadge = (role: Role) => <Badge variant={ROLE_VARIANT[role]}>{roleLabel(role)}</Badge>;

const PAGE_SIZE = 20;

export const UsuariosTab: React.FC = () => {
  const [userList,     setUserList]     = useState<User[]>([]);
  const [page,         setPage]         = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages,   setTotalPages]   = useState(0);
  const [showNewUser,  setShowNewUser]  = useState(false);
  const [newUser,      setNewUser]      = useState<CreateUserRequest>({ ...BLANK_USER });
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editingUser,  setEditingUser]  = useState<Pick<User, 'fullName' | 'role'> | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [groups,       setGroups]       = useState<UserGroup[]>([]);
  const [memberships,  setMemberships]  = useState<UserGroupMembership[]>([]);
  const [filterGroup,  setFilterGroup]  = useState('');

  const currentUserId = getUserId();

  const load = async (p = page) => {
    try {
      const data = await usersApi.list(p, PAGE_SIZE, filterGroup || undefined);
      setUserList(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (e: unknown) {
      setError(tr('common.error_cargar_usuarios_error', { error: getErrorMessage(e) }));
    }
  };

  const loadGroups = async () => {
    try {
      const [g, m] = await Promise.all([userGroupsApi.list(), userGroupsApi.memberships()]);
      setGroups(g);
      setMemberships(m);
    } catch { /* groups are optional for this tab */ }
  };

  useEffect(() => { load(page); }, [page, filterGroup]);
  useEffect(() => { loadGroups(); }, []);

  const groupName = useMemo(() => new Map(groups.map(g => [g.id, g.name] as const)), [groups]);
  const groupsOfUser = useMemo(() => {
    const map = new Map<string, string[]>();
    memberships.forEach(m => {
      const name = groupName.get(m.groupId);
      if (name) map.set(m.userId, [...(map.get(m.userId) ?? []), name]);
    });
    return map;
  }, [memberships, groupName]);

  // Indented tree order for the filter options
  const groupOptions = useMemo(() => {
    const kids = new Map<string | null, UserGroup[]>();
    groups.forEach(g => kids.set(g.parentId ?? null, [...(kids.get(g.parentId ?? null) ?? []), g]));
    const opts: { value: string; label: string }[] = [{ value: '', label: tr('usuarios.todos_los_grupos') }];
    const walk = (parent: string | null, depth: number) =>
      (kids.get(parent) ?? []).forEach(g => {
        opts.push({ value: g.id, label: `${'— '.repeat(depth)}${g.name}` });
        walk(g.id, depth + 1);
      });
    walk(null, 0);
    return opts;
  }, [groups]);

  const saveNew = async () => {
    if (!newUser.username || !newUser.fullName || !newUser.password) {
      setError(tr('usuarios.usuario_nombre_completo_y_contrasena')); return;
    }
    if (newUser.password.length < 8) { setError(tr('usuarios.contrasena_debe_tener_menos_8')); return; }
    setError(null);
    try {
      await usersApi.create(newUser);
      setNewUser({ ...BLANK_USER });
      setShowNewUser(false);
      load(page);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const saveEdit = async () => {
    if (!editingUser?.fullName) { setError(tr('usuarios.nombre_completo_es_obligatorio')); return; }
    setError(null);
    try {
      await usersApi.update(editingId!, { fullName: editingUser.fullName, role: editingUser.role });
      setEditingId(null); setEditingUser(null);
      load(page);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const toggleUser = async (id: string) => {
    if (id === currentUserId) {
      setError(tr('usuarios.no_puedes_desactivar_tu_propia'));
      return;
    }
    try {
      const updated = await usersApi.toggleActive(id);
      setUserList(prev => prev.map(u => u.id === id ? updated : u));
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  return (
    <div className="space-y-6">
      <Card padding="none">
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
          <div>
            <h3 className="text-sm font-semibold text-surface-900">{tr('usuarios.gestion_usuarios')}</h3>
            <p className="text-xs text-surface-500 mt-0.5">{tr('usuarios.personal_medico_y_administrativo_con')}</p>
          </div>
          <div className="flex gap-2">
            {groups.length > 0 && (
              <Select value={filterGroup} onChange={v => { setFilterGroup(v); setPage(0); }}
                options={groupOptions} className="w-52" />
            )}
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { load(page); loadGroups(); }}>
              {tr('common.recargar')}
            </Button>
            <Button size="sm" icon={<Plus className="w-4 h-4" />}
              onClick={() => { setShowNewUser(true); setError(null); }}>
              {tr('usuarios.nuevo_usuario')}
            </Button>
          </div>
        </div>
        <div className="px-6 pt-3 pb-0">
          <FormError msg={error} onDismiss={() => setError(null)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <TH>{tr('common.usuario')}</TH>
                <TH>{tr('common.nombre_completo')}</TH>
                <TH>{tr('common.rol')}</TH>
                <TH>{tr('usuarios.grupos')}</TH>
                <TH>{tr('common.estado')}</TH>
                <TH className="text-right">{tr('common.acciones')}</TH>
              </tr>
            </thead>
            <tbody>
              {userList.map(u => (
                <tr key={u.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  {editingId === u.id && editingUser ? (
                    <>
                      <TD>
                        <code className="text-xs font-mono text-surface-500">{u.username}</code>
                      </TD>
                      <TD>
                        <Input value={editingUser.fullName}
                          onChange={e => setEditingUser(p => p && { ...p, fullName: e.target.value })} fullWidth />
                      </TD>
                      <TD>
                        <Select
                          value={editingUser.role}
                          onChange={val => setEditingUser(p => p && { ...p, role: val })}
                          options={roleOptions()}
                          fullWidth
                        />
                      </TD>
                      <TD></TD>
                      <TD></TD>
                      <TD className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" icon={<Save className="w-3.5 h-3.5" />} onClick={saveEdit}>
                            {tr('usuarios.guardar')}
                          </Button>
                          <Button size="sm" variant="ghost"
                            onClick={() => { setEditingId(null); setEditingUser(null); }}>
                            ✕
                          </Button>
                        </div>
                      </TD>
                    </>
                  ) : (
                    <>
                      <TD>
                        <code className="text-xs font-mono font-semibold text-primary-700">{u.username}</code>
                        {u.id === currentUserId && (
                          <span className="ml-2 text-xs text-surface-400">{tr('usuarios.tu')}</span>
                        )}
                      </TD>
                      <TD>
                        <span className="font-semibold text-surface-900">{u.fullName}</span>
                      </TD>
                      <TD>{roleBadge(u.role)}</TD>
                      <TD>
                        {(() => {
                          const gs = groupsOfUser.get(u.id) ?? [];
                          if (gs.length === 0) return <span className="text-surface-300">—</span>;
                          return (
                            <div className="flex flex-wrap gap-1">
                              {gs.slice(0, 2).map(n => <Badge key={n} variant="gray">{n}</Badge>)}
                              {gs.length > 2 && <span title={gs.slice(2).join(', ')} className="text-xs text-surface-400 self-center">+{gs.length - 2}</span>}
                            </div>
                          );
                        })()}
                      </TD>
                      <TD>
                        <button
                          onClick={() => toggleUser(u.id)}
                          disabled={u.id === currentUserId}
                          title={u.id === currentUserId ? tr('usuarios.no_puedes_desactivar_tu_propia') : undefined}
                        >
                          {u.active
                            ? <Badge variant="success" dot>{tr('common.activo')}</Badge>
                            : <Badge variant="gray" dot>{tr('common.inactivo')}</Badge>}
                        </button>
                      </TD>
                      <TD className="text-right">
                        <button
                          onClick={() => { setEditingId(u.id); setEditingUser({ fullName: u.fullName, role: u.role }); setError(null); }}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </TD>
                    </>
                  )}
                </tr>
              ))}
              {userList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-surface-400 text-sm">
                    {filterGroup ? tr('usuarios.ningun_usuario_grupo') : tr('usuarios.no_hay_usuarios')}
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
            onPageChange={p => setPage(p)}
          />
        </div>
      </Card>

      <Modal
        open={showNewUser}
        onClose={() => { setShowNewUser(false); setNewUser({ ...BLANK_USER }); setError(null); }}
        title={tr('usuarios.nuevo_usuario')}
        description={tr('usuarios.crea_cuenta_acceso_para_personal')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowNewUser(false); setNewUser({ ...BLANK_USER }); }}>
              {tr('common.cancelar')}
            </Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveNew}>
              {tr('usuarios.crear_usuario')}
            </Button>
          </>
        }
      >
        <FormError msg={error} onDismiss={() => setError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={tr('usuarios.usuario_login')} placeholder={tr('usuarios.dr_garcia')}
            value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} fullWidth />
          <Input label={tr('usuarios.nombre_completo')} placeholder={tr('usuarios.dr_juan_garcia')}
            value={newUser.fullName} onChange={e => setNewUser(u => ({ ...u, fullName: e.target.value }))} fullWidth />
          <Input label={tr('usuarios.contrasena_inicial')} type="password" placeholder="••••••••"
            value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} fullWidth />
          <Select
            label={tr('common.rol')}
            value={newUser.role}
            onChange={val => setNewUser(u => ({ ...u, role: val }))}
            options={roleOptions()}
            fullWidth
          />
        </div>
      </Modal>
    </div>
  );
};
