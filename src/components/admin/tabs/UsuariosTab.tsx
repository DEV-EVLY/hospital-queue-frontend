import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Edit2, Save } from 'lucide-react';
import { Card, Badge, Button, Input, Modal } from '../../ui';
import { Select } from '../../ui';
import { usersApi } from '../../../services/api';
import { FormError, TH, TD } from './_shared';

const BLANK_USER = { username: '', fullName: '', password: '', role: 'OPERATOR' as 'OPERATOR' | 'ADMIN' };

const ROLE_OPTIONS = [
  { value: 'OPERATOR', label: 'Operador / Médico' },
  { value: 'ADMIN',    label: 'Administrador' },
];

export const UsuariosTab: React.FC = () => {
  const [userList,     setUserList]     = useState<any[]>([]);
  const [showNewUser,  setShowNewUser]  = useState(false);
  const [newUser,      setNewUser]      = useState({ ...BLANK_USER });
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editingUser,  setEditingUser]  = useState<any>(null);
  const [error,        setError]        = useState<string | null>(null);

  const load = async () => { try { setUserList(await usersApi.list() as any[]); } catch { /* ok */ } };

  useEffect(() => { load(); }, []);

  const saveNew = async () => {
    if (!newUser.username || !newUser.fullName || !newUser.password) {
      setError('Usuario, nombre completo y contraseña son obligatorios.'); return;
    }
    setError(null);
    try {
      const created = await usersApi.create(newUser);
      setUserList(prev => [...prev, created]);
      setNewUser({ ...BLANK_USER });
      setShowNewUser(false);
    } catch (e: any) { setError(e.message); }
  };

  const saveEdit = async () => {
    if (!editingUser?.fullName) { setError('El nombre completo es obligatorio.'); return; }
    setError(null);
    try {
      const updated = await usersApi.update(editingId!, { fullName: editingUser.fullName, role: editingUser.role });
      setUserList(prev => prev.map(u => u.id === editingId ? updated : u));
      setEditingId(null); setEditingUser(null);
    } catch (e: any) { setError(e.message); }
  };

  const toggleUser = async (id: string) => {
    try {
      await usersApi.toggleActive(id);
      setUserList(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
    } catch (e: any) { setError(`Error: ${e.message}`); }
  };

  return (
    <div className="space-y-6">
      <Card padding="none">
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
          <div>
            <h3 className="text-sm font-semibold text-surface-900">Gestión de Usuarios</h3>
            <p className="text-xs text-surface-500 mt-0.5">Personal médico y administrativo con acceso al sistema</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
              Recargar
            </Button>
            <Button size="sm" icon={<Plus className="w-4 h-4" />}
              onClick={() => { setShowNewUser(true); setError(null); }}>
              Nuevo Usuario
            </Button>
          </div>
        </div>
        <div className="px-6 py-3">
          <FormError msg={error} onDismiss={() => setError(null)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <TH>Usuario</TH>
                <TH>Nombre completo</TH>
                <TH>Rol</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </tr>
            </thead>
            <tbody>
              {userList.map(u => (
                <tr key={u.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  {editingId === u.id ? (
                    <>
                      <TD>
                        <code className="text-xs font-mono text-surface-500">{u.username}</code>
                      </TD>
                      <TD>
                        <Input value={editingUser.fullName}
                          onChange={e => setEditingUser((p: any) => ({ ...p, fullName: e.target.value }))} fullWidth />
                      </TD>
                      <TD>
                        <Select
                          value={editingUser.role}
                          onChange={val => setEditingUser((p: any) => ({ ...p, role: val }))}
                          options={ROLE_OPTIONS}
                          fullWidth
                        />
                      </TD>
                      <TD></TD>
                      <TD className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" icon={<Save className="w-3.5 h-3.5" />} onClick={saveEdit}>
                            Guardar
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
                      </TD>
                      <TD>
                        <span className="font-semibold text-surface-900">{u.fullName}</span>
                      </TD>
                      <TD>
                        {u.role === 'ADMIN'
                          ? <Badge variant="purple">Administrador</Badge>
                          : <Badge variant="primary">Operador</Badge>}
                      </TD>
                      <TD>
                        <button onClick={() => toggleUser(u.id)}>
                          {u.active
                            ? <Badge variant="success" dot>Activo</Badge>
                            : <Badge variant="gray" dot>Inactivo</Badge>}
                        </button>
                      </TD>
                      <TD className="text-right">
                        <button
                          onClick={() => { setEditingId(u.id); setEditingUser({ ...u }); setError(null); }}
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
                  <td colSpan={5} className="px-4 py-8 text-center text-surface-400 text-sm">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={showNewUser}
        onClose={() => { setShowNewUser(false); setNewUser({ ...BLANK_USER }); setError(null); }}
        title="Nuevo Usuario"
        description="Crea una cuenta de acceso para personal médico o administrativo"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowNewUser(false); setNewUser({ ...BLANK_USER }); }}>
              Cancelar
            </Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={saveNew}>
              Crear Usuario
            </Button>
          </>
        }
      >
        <FormError msg={error} onDismiss={() => setError(null)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Usuario (login) *" placeholder="dr.garcia"
            value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} fullWidth />
          <Input label="Nombre completo *" placeholder="Dr. Juan García"
            value={newUser.fullName} onChange={e => setNewUser(u => ({ ...u, fullName: e.target.value }))} fullWidth />
          <Input label="Contraseña inicial *" type="password" placeholder="••••••••"
            value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} fullWidth />
          <Select
            label="Rol"
            value={newUser.role}
            onChange={val => setNewUser(u => ({ ...u, role: val as 'OPERATOR' | 'ADMIN' }))}
            options={ROLE_OPTIONS}
            fullWidth
          />
        </div>
      </Modal>
    </div>
  );
};
