// Lógica pura de la jerarquía de grupos (sin React ni red).

import type { Role, UserGroup, UserGroupMembership } from '../../../../types/api';

/** Solo personal asistencial se organiza en grupos (no administradores ni cuentas de kiosko). */
export const GROUP_ROLES: Role[] = ['OPERATOR', 'SUPERVISOR', 'DOCTOR'];

export interface GroupForm { code: string; name: string; description: string; parentId: string }
export const BLANK_FORM: GroupForm = { code: '', name: '', description: '', parentId: '' };

export type ChildrenMap = Map<string | null, UserGroup[]>;

/** Hijos directos de cada grupo (clave null = grupos raíz). */
export const buildChildren = (groups: UserGroup[]): ChildrenMap => {
  const map: ChildrenMap = new Map();
  groups.forEach(g => {
    const key = g.parentId ?? null;
    map.set(key, [...(map.get(key) ?? []), g]);
  });
  return map;
};

/** El grupo y todos los que cuelgan de él. */
export const descendantIds = (children: ChildrenMap, id: string): Set<string> => {
  const out = new Set<string>([id]);
  const walk = (parentId: string) => (children.get(parentId) ?? []).forEach(c => { out.add(c.id); walk(c.id); });
  walk(id);
  return out;
};

/** Solo los que cuelgan de él (sin incluirlo). */
export const strictDescendantIds = (children: ChildrenMap, id: string): Set<string> => {
  const ids = descendantIds(children, id);
  ids.delete(id);
  return ids;
};

/** Ruta legible: "Medicina › Pediatría › Urgencias". */
export const pathOf = (byId: Map<string, UserGroup>, id: string): string => {
  const parts: string[] = [];
  let cur = byId.get(id);
  while (cur) { parts.unshift(cur.name); cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
  return parts.join(' › ');
};

/** Opciones de "grupo padre" en orden de árbol, sin el propio grupo ni sus descendientes (evita ciclos). */
export const parentOptions = (
  children: ChildrenMap, editingId: string | null, noParentLabel: string,
): { value: string; label: string }[] => {
  const blocked = editingId ? descendantIds(children, editingId) : new Set<string>();
  const options = [{ value: '', label: noParentLabel }];
  const walk = (parent: string | null, depth: number) => {
    (children.get(parent) ?? []).forEach(g => {
      if (!blocked.has(g.id)) options.push({ value: g.id, label: `${'— '.repeat(depth)}${g.name}` });
      walk(g.id, depth + 1);
    });
  };
  walk(null, 0);
  return options;
};

/** Miembros del grupo que no pertenecen al nuevo padre: mientras haya alguno, el grupo no se puede mover. */
export const membersMissingInParent = (
  memberships: UserGroupMembership[], groupId: string, newParentId: string,
): number => {
  const inParent = new Set(memberships.filter(m => m.groupId === newParentId).map(m => m.userId));
  return memberships.filter(m => m.groupId === groupId && !inParent.has(m.userId)).length;
};

/** Cuántos subgrupos pierden a este usuario si se le quita del grupo. */
export const subgroupsHoldingUser = (
  children: ChildrenMap, memberships: UserGroupMembership[], groupId: string, userId: string,
): number => {
  const below = strictDescendantIds(children, groupId);
  return memberships.filter(m => m.userId === userId && below.has(m.groupId)).length;
};

/** Cuántos subgrupos pierden este servicio si se le quita al grupo. */
export const subgroupsHoldingService = (
  children: ChildrenMap, groups: UserGroup[], groupId: string, serviceId: string,
): number => {
  const below = strictDescendantIds(children, groupId);
  return groups.filter(g => below.has(g.id) && g.serviceIds.includes(serviceId)).length;
};
