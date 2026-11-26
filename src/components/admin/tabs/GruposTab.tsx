import React, { useState } from 'react';
import { FormError } from './_shared';
import { GroupDetailPanel } from './grupos/GroupDetailPanel';
import { GroupFormModal } from './grupos/GroupFormModal';
import { GroupTreePanel } from './grupos/GroupTreePanel';
import { pathOf } from './grupos/groupTree';
import { useGroupActions } from './grupos/useGroupActions';
import { useGroupsData } from './grupos/useGroupsData';
import type { UserGroup } from '../../../types/api';

/** Administración de grupos de usuarios: árbol jerárquico, servicios que atiende cada grupo y sus personas. */
export const GruposTab: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Modal de crear/editar: `editing` null = crear
  const [modal, setModal] = useState<{ open: boolean; editing: UserGroup | null; parentId: string | null }>(
    { open: false, editing: null, parentId: null });

  const data = useGroupsData(selectedId);
  const actions = useGroupActions(data, selectedId, id => { if (selectedId === id) setSelectedId(null); });

  const selected = selectedId ? data.byId.get(selectedId) ?? null : null;
  const parentGroup = selected?.parentId ? data.byId.get(selected.parentId) ?? null : null;

  const openCreate = (parentId: string | null) => setModal({ open: true, editing: null, parentId });
  const openEdit = (group: UserGroup) => setModal({ open: true, editing: group, parentId: null });

  return (
    <div className="space-y-6">
      <FormError msg={modal.open ? null : data.error} onDismiss={() => data.setError(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <GroupTreePanel
          groups={data.groups}
          tree={data.tree}
          collapsed={actions.collapsed}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggleCollapse={actions.toggleCollapse}
          onAddSubgroup={openCreate}
          onEdit={openEdit}
          onToggleActive={actions.toggleGroup}
          onDelete={actions.deleteGroup}
          onRefresh={data.reloadGroups}
          onCreateRoot={() => openCreate(null)}
        />
        <GroupDetailPanel
          group={selected}
          parentGroup={parentGroup}
          path={selected ? pathOf(data.byId, selected.id) : ''}
          services={data.services}
          members={data.members}
          users={data.users}
          memberships={data.memberships}
          onToggleService={actions.toggleService}
          onAddMember={actions.addMember}
          onRemoveMember={actions.removeMember}
        />
      </div>

      <GroupFormModal
        open={modal.open}
        editing={modal.editing}
        initialParentId={modal.parentId}
        groups={data.groups}
        tree={data.tree}
        memberships={data.memberships}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        onSave={actions.saveGroup}
      />
    </div>
  );
};
