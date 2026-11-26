import { useState } from 'react';
import { getErrorMessage, userGroupsApi } from '../../../../services/api';
import type { UserGroup } from '../../../../types/api';
import { tr, trp } from '../../../../i18n';
import { subgroupsHoldingService, subgroupsHoldingUser } from './groupTree';
import type { GroupsData } from './useGroupsData';

export interface GroupPayload { code: string; name: string; description: string | null; parentId: string | null }

/**
 * Acciones sobre grupos, miembros y servicios, con las confirmaciones que corresponden.
 * Los errores van al aviso general de la pantalla, salvo el guardado del grupo, que se lo devuelve al modal.
 */
export function useGroupActions(data: GroupsData, selectedId: string | null, onDeleted: (id: string) => void) {
  const { groups, memberships, tree, services, byId, setError, reloadGroups, reloadMembers } = data;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const guard = async (action: () => Promise<void>) => {
    try { await action(); } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const toggleCollapse = (id: string) =>
    setCollapsed(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  /** Crea o edita. Si falla lanza el error (lo muestra el modal); si sale bien expande el padre. */
  const saveGroup = async (editingId: string | null, payload: GroupPayload) => {
    if (editingId) await userGroupsApi.update(editingId, payload);
    else           await userGroupsApi.create(payload);
    if (payload.parentId) setCollapsed(prev => { const next = new Set(prev); next.delete(payload.parentId!); return next; });
    await reloadGroups();
  };

  const toggleGroup = (g: UserGroup) => guard(async () => { await userGroupsApi.toggleActive(g.id); await reloadGroups(); });

  const deleteGroup = async (g: UserGroup) => {
    if (!confirm(tr('grupos.eliminar_grupo_name_se_quitaran', { name: g.name }))) return;
    await guard(async () => {
      await userGroupsApi.remove(g.id);
      onDeleted(g.id);
      await reloadGroups();
    });
  };

  const addMember = (userId: string) => guard(async () => {
    if (!selectedId || !userId) return;
    await userGroupsApi.addMember(selectedId, userId);
    await Promise.all([reloadMembers(), reloadGroups()]);
  });

  const removeMember = async (userId: string) => {
    if (!selectedId) return;
    const affected = subgroupsHoldingUser(tree, memberships, selectedId, userId);
    if (affected > 0 && !confirm(trp('grupos.confirm_quitar_usuario', affected))) return;
    await guard(async () => {
      await userGroupsApi.removeMember(selectedId, userId);
      await Promise.all([reloadMembers(), reloadGroups()]);
    });
  };

  const toggleService = async (serviceId: string) => {
    const group = selectedId ? byId.get(selectedId) : undefined;
    if (!group) return;
    const has = group.serviceIds.includes(serviceId);
    if (has) {
      const affected = subgroupsHoldingService(tree, groups, group.id, serviceId);
      const name = services.find(s => s.id === serviceId)?.name ?? serviceId.slice(0, 8);
      if (affected > 0 && !confirm(trp('grupos.confirm_quitar_servicio', affected, { service: name }))) return;
    }
    const next = has ? group.serviceIds.filter(id => id !== serviceId) : [...group.serviceIds, serviceId];
    await guard(async () => { await userGroupsApi.setServices(group.id, next); await reloadGroups(); });
  };

  return { collapsed, toggleCollapse, saveGroup, toggleGroup, deleteGroup, addMember, removeMember, toggleService };
}
