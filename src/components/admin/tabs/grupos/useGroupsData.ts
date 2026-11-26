import { useCallback, useEffect, useMemo, useState } from 'react';
import { getErrorMessage, medicalServicesApi, userGroupsApi, usersApi } from '../../../../services/api';
import type { MedicalService, User, UserGroup, UserGroupMembership } from '../../../../types/api';
import { tr } from '../../../../i18n';
import { buildChildren, type ChildrenMap } from './groupTree';

export interface GroupsData {
  groups: UserGroup[];
  memberships: UserGroupMembership[];
  /** Servicios activos (los únicos que se pueden asignar) */
  services: MedicalService[];
  users: User[];
  /** Miembros del grupo seleccionado */
  members: User[];
  /** Hijos directos de cada grupo (clave null = raíces) */
  tree: ChildrenMap;
  byId: Map<string, UserGroup>;
  error: string | null;
  setError: (message: string | null) => void;
  reloadGroups: () => Promise<void>;
  reloadMembers: () => Promise<void>;
}

/** Carga los datos de la pantalla de grupos: grupos, membresías, servicios, usuarios y miembros del seleccionado. */
export function useGroupsData(selectedId: string | null): GroupsData {
  const [groups, setGroups]           = useState<UserGroup[]>([]);
  const [memberships, setMemberships] = useState<UserGroupMembership[]>([]);
  const [services, setServices]       = useState<MedicalService[]>([]);
  const [users, setUsers]             = useState<User[]>([]);
  const [members, setMembers]         = useState<User[]>([]);
  const [error, setError]             = useState<string | null>(null);

  const reloadGroups = useCallback(async () => {
    try {
      const [g, m] = await Promise.all([userGroupsApi.list(), userGroupsApi.memberships()]);
      setGroups(g);
      setMemberships(m);
    } catch (e: unknown) { setError(tr('grupos.error_cargar_grupos_error', { error: getErrorMessage(e) })); }
  }, []);

  const reloadMembers = useCallback(async () => {
    if (!selectedId) return;
    try { setMembers(await userGroupsApi.members(selectedId)); }
    catch (e: unknown) { setError(tr('grupos.error_cargar_miembros_error', { error: getErrorMessage(e) })); }
  }, [selectedId]);

  useEffect(() => {
    void reloadGroups();
    medicalServicesApi.list().then(list => setServices(list.filter(s => s.active)))
      .catch((e: unknown) => setError(tr('common.error_cargar_servicios_error', { error: getErrorMessage(e) })));
    usersApi.list(0, 500).then(page => setUsers(page.content))
      .catch((e: unknown) => setError(tr('common.error_cargar_usuarios_error', { error: getErrorMessage(e) })));
  }, [reloadGroups]);

  useEffect(() => {
    if (selectedId) void reloadMembers(); else setMembers([]);
  }, [selectedId, reloadMembers]);

  const tree = useMemo(() => buildChildren(groups), [groups]);
  const byId = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);

  return { groups, memberships, services, users, members, tree, byId, error, setError, reloadGroups, reloadMembers };
}
