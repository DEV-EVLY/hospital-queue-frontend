import React from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Card } from '../../../ui';
import { tr, trp } from '../../../../i18n';
import { FormError, TD, TH } from '../_shared';
import type { SpecialtiesList } from './useSpecialties';

/** Pestaña "Especialidades": catálogo de solo lectura con alta de nuevas. */
export const SpecialtiesPanel: React.FC<{ list: SpecialtiesList; onNew: () => void }> = ({ list, onNew }) => (
  <Card padding="none">
    <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
      <div>
        <h3 className="text-sm font-semibold text-surface-900">{tr('medicos.especialidades_medicas')}</h3>
        <p className="text-xs text-surface-500 mt-0.5">{trp('medicos.n_registradas', list.specialties.length)}</p>
      </div>
      <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNew}>{tr('medicos.nueva_especialidad')}</Button>
    </div>

    {list.error && <div className="px-6 pt-3"><FormError msg={list.error} onDismiss={() => list.setError(null)} /></div>}

    <div className="overflow-x-auto max-h-[550px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-surface-100">
            <TH>{tr('common.codigo')}</TH><TH>{tr('common.nombre')}</TH><TH>{tr('common.descripcion')}</TH><TH>{tr('common.estado')}</TH>
          </tr>
        </thead>
        <tbody>
          {list.specialties.map(s => (
            <tr key={s.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
              <TD><Badge variant="primary">{s.code}</Badge></TD>
              <TD className="font-semibold text-surface-900">{s.name}</TD>
              <TD className="text-surface-500">{s.description || '—'}</TD>
              <TD>
                {s.active
                  ? <Badge variant="success" dot>{tr('medicos.activa')}</Badge>
                  : <Badge variant="gray" dot>{tr('medicos.inactiva')}</Badge>}
              </TD>
            </tr>
          ))}
          {list.specialties.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-surface-400 text-sm">{tr('medicos.no_hay_especialidades_registradas')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Card>
);
