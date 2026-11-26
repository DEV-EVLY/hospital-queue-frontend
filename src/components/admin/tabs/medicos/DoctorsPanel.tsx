import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button, Card, Pagination, Select, Spinner } from '../../../ui';
import type { Doctor, Specialty } from '../../../../types/api';
import { tr, trp } from '../../../../i18n';
import { FormError, TH } from '../_shared';
import { DoctorRow } from './DoctorRow';
import { DOCTORS_PAGE_SIZE, type DoctorsList } from './useDoctors';

interface Props {
  list: DoctorsList;
  specialties: Specialty[];
  onNew: () => void;
  onEdit: (doctor: Doctor) => void;
}

/** Pestaña "Médicos": filtro por especialidad, tabla paginada y acciones. */
export const DoctorsPanel: React.FC<Props> = ({ list, specialties, onNew, onEdit }) => {
  // El filtro es de la página mostrada: al cambiar de página se limpia
  const [filter, setFilter] = useState('');
  const visible = list.doctors.filter(d => !filter || d.specialtyId === filter);
  const specialtyOptions = [
    { value: '', label: tr('medicos.todas_las_especialidades') },
    ...specialties.map(s => ({ value: s.id, label: s.name })),
  ];

  return (
    <Card padding="none">
      <div className="px-6 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
        <div>
          <h3 className="text-sm font-semibold text-surface-900">{tr('medicos.medicos')}</h3>
          <p className="text-xs text-surface-500 mt-0.5">{trp('medicos.n_registrados', list.total)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filter} onChange={setFilter} options={specialtyOptions} className="w-52" />
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} loading={list.loading} onClick={list.reload}>
            {tr('common.recargar')}
          </Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNew}>{tr('common.nuevo')}</Button>
        </div>
      </div>

      {list.error && <div className="px-6 pt-3"><FormError msg={list.error} onDismiss={() => list.setError(null)} /></div>}

      <div className="overflow-x-auto max-h-[550px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-surface-100">
              <TH>{tr('common.medico')}</TH><TH>CMP</TH><TH>{tr('common.especialidad')}</TH><TH>{tr('common.contacto')}</TH>
              <TH>{tr('common.estado')}</TH><TH>{tr('common.activo')}</TH><TH className="text-right">{tr('common.acciones')}</TH>
            </tr>
          </thead>
          <tbody>
            {list.loading && list.doctors.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center"><Spinner /></td></tr>
            )}
            {visible.map(d => (
              <DoctorRow key={d.id} doctor={d} specialty={specialties.find(s => s.id === d.specialtyId)}
                onStatusChange={status => list.changeStatus(d, status)}
                onToggleActive={() => list.toggleActive(d)}
                onEdit={() => onEdit(d)} />
            ))}
            {!list.loading && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-surface-400 text-sm">{tr('medicos.no_hay_medicos_registrados_con')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6">
        <Pagination page={list.page} size={DOCTORS_PAGE_SIZE} totalElements={list.total} totalPages={list.totalPages}
          onPageChange={p => { setFilter(''); list.setPage(p); }} />
      </div>
    </Card>
  );
};
