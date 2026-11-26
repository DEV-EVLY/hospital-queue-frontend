import React from 'react';
import { FolderTree } from 'lucide-react';
import { Card, CardHeader } from '../../../ui';
import type { MedicalService, User, UserGroup, UserGroupMembership } from '../../../../types/api';
import { tr } from '../../../../i18n';
import { GroupMembersSection } from './GroupMembersSection';
import { GroupServicesSection } from './GroupServicesSection';

interface Props {
  group: UserGroup | null;
  parentGroup: UserGroup | null;
  path: string;
  services: MedicalService[];
  members: User[];
  users: User[];
  memberships: UserGroupMembership[];
  onToggleService: (serviceId: string) => void;
  onAddMember: (userId: string) => Promise<void>;
  onRemoveMember: (userId: string) => void;
}

/** Panel derecho: detalle del grupo seleccionado (servicios y personas), o una invitación a elegir uno. */
export const GroupDetailPanel: React.FC<Props> = ({
  group, parentGroup, path, services, members, users, memberships, onToggleService, onAddMember, onRemoveMember,
}) => (
  <Card padding="none" className="lg:col-span-3">
    {!group ? (
      <div className="py-20 text-center text-sm text-surface-400 flex flex-col items-center gap-2">
        <FolderTree className="w-8 h-8 text-surface-300" />
        {tr('grupos.selecciona_grupo_para_ver_y')}
      </div>
    ) : (
      <>
        <div className="px-6 pt-5 pb-4 border-b border-surface-100">
          <CardHeader title={group.name} subtitle={path} />
          {group.description && <p className="text-sm text-surface-600 -mt-2">{group.description}</p>}
        </div>
        <GroupServicesSection group={group} parentGroup={parentGroup} services={services} onToggle={onToggleService} />
        {/* La `key` reinicia el selector de personas al cambiar de grupo */}
        <GroupMembersSection key={group.id} group={group} parentGroup={parentGroup} members={members}
          users={users} memberships={memberships} onAdd={onAddMember} onRemove={onRemoveMember} />
      </>
    )}
  </Card>
);
