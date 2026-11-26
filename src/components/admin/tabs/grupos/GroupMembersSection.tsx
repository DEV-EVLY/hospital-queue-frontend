import React, { useState } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { Badge, Button, Select } from '../../../ui';
import type { User, UserGroup, UserGroupMembership } from '../../../../types/api';
import { tr, roleLabel } from '../../../../i18n';
import { TD, TH } from '../_shared';
import { GROUP_ROLES } from './groupTree';

interface Props {
  group: UserGroup;
  parentGroup: UserGroup | null;
  members: User[];
  /** Todos los usuarios (de aquí salen los candidatos) */
  users: User[];
  memberships: UserGroupMembership[];
  onAdd: (userId: string) => Promise<void>;
  onRemove: (userId: string) => void;
}

/** Personas del grupo: selector para agregar y tabla para quitar. Un subgrupo solo admite miembros de su padre. */
export const GroupMembersSection: React.FC<Props> = ({ group, parentGroup, members, users, memberships, onAdd, onRemove }) => {
  const [userToAdd, setUserToAdd] = useState('');

  const hasServices = group.serviceIds.length > 0;
  const memberIds = new Set(members.map(m => m.id));
  const parentMemberIds = parentGroup
    ? new Set(memberships.filter(m => m.groupId === parentGroup.id).map(m => m.userId))
    : null;
  const candidates = users.filter(u =>
    u.active && GROUP_ROLES.includes(u.role) && !memberIds.has(u.id)
    && (parentMemberIds === null || parentMemberIds.has(u.id)));

  const options = [
    { value: '', label: candidates.length === 0 ? tr('grupos.sin_usuarios_disponibles') : tr('grupos.selecciona_usuario') },
    ...candidates.map(u => ({ value: u.id, label: `${u.fullName} (${u.username})` })),
  ];

  const hint = !hasServices
    ? tr('grupos.primero_servicios')
    : parentGroup && candidates.length === 0 ? tr('grupos.solo_miembros_del_padre', { parent: parentGroup.name }) : undefined;

  const add = async () => { await onAdd(userToAdd); setUserToAdd(''); };

  return (
    <>
      <div className="px-6 py-4 flex flex-wrap items-end gap-3 border-b border-surface-100">
        <p className="w-full text-xs font-semibold uppercase tracking-wider text-surface-500 -mb-1">
          {tr('grupos.2_personas_grupo_operadores_supervisores')}
        </p>
        <div className="flex-1 min-w-[220px]">
          <Select
            label={parentGroup ? tr('grupos.agregar_miembro_del_grupo', { parent: parentGroup.name }) : tr('grupos.agregar_miembro')}
            value={userToAdd} onChange={setUserToAdd} options={options} fullWidth
            disabled={!hasServices} hint={hint}
          />
        </div>
        <Button size="sm" icon={<UserPlus className="w-4 h-4" />} disabled={!userToAdd || !hasServices} onClick={add} className="mb-0.5">
          {tr('common.agregar')}
        </Button>
      </div>

      <div className="overflow-x-auto max-h-[420px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-surface-100">
              <TH>{tr('common.usuario')}</TH><TH>{tr('common.nombre_completo')}</TH><TH>{tr('common.rol')}</TH>
              <TH className="text-right">{tr('grupos.quitar')}</TH>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                <TD><code className="text-xs font-mono font-semibold text-primary-700">{m.username}</code></TD>
                <TD className="font-semibold text-surface-900">{m.fullName}</TD>
                <TD><Badge variant="primary">{roleLabel(m.role)}</Badge></TD>
                <TD className="text-right">
                  <button onClick={() => onRemove(m.id)} title={tr('grupos.quitar_grupo')}
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
  );
};
