import React from 'react';
import { Checkbox } from '../../../ui';
import type { MedicalService, UserGroup } from '../../../../types/api';
import { tr } from '../../../../i18n';

interface Props {
  group: UserGroup;
  parentGroup: UserGroup | null;
  /** Servicios activos del catálogo */
  services: MedicalService[];
  onToggle: (serviceId: string) => void;
}

/** Servicios que atiende el grupo. Un subgrupo solo puede elegir entre los de su grupo padre. */
export const GroupServicesSection: React.FC<Props> = ({ group, parentGroup, services, onToggle }) => {
  const choices = parentGroup ? services.filter(s => parentGroup.serviceIds.includes(s.id)) : services;
  return (
    <div className="px-6 py-4 border-b border-surface-100">
      <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">
        {tr('grupos.1_servicios_que_atiende_este')}
      </p>
      {choices.length === 0 ? (
        <p className="text-xs text-surface-400">
          {parentGroup ? tr('grupos.padre_sin_servicios', { parent: parentGroup.name }) : tr('grupos.sin_servicios_activos')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {choices.map(s => (
            <Checkbox key={s.id} variant="card" label={s.name} checked={group.serviceIds.includes(s.id)}
              onChange={() => onToggle(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
};
