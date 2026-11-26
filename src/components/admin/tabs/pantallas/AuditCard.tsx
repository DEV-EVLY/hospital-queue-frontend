import React from 'react';
import { Card, Pagination } from '../../../ui';
import type { DeviceAuditEntry, PageResponse } from '../../../../types/api';
import { formatDate, formatTime, tr } from '../../../../i18n';

interface Props {
  audit: PageResponse<DeviceAuditEntry> | null;
  onPageChange: (page: number) => void;
}

/** Actividad reciente de los dispositivos (vinculaciones, PIN, cambios de perfil), paginada en el servidor. */
export const AuditCard: React.FC<Props> = ({ audit, onPageChange }) => (
  <Card className="flex flex-col gap-3">
    <h2 className="text-base font-bold text-surface-900">{tr('devices.actividad')}</h2>
    {!audit || audit.content.length === 0 ? (
      <p className="text-sm text-surface-500">{tr('devices.sin_actividad')}</p>
    ) : (
      <ul className="divide-y divide-surface-100 text-sm">
        {audit.content.map(a => (
          <li key={a.id} className="py-2 flex items-center justify-between gap-4">
            <span className="text-surface-800">
              <span className="font-semibold">{tr(`devices.evento.${a.event}`)}</span>
              {a.profileName && <span className="text-surface-500"> · {a.profileName}</span>}
              {a.detail && <span className="text-surface-400"> · {a.detail}</span>}
            </span>
            <span className="text-xs font-mono text-surface-500 whitespace-nowrap">
              {formatDate(new Date(a.createdAt), { day: '2-digit', month: '2-digit', year: 'numeric' })} {formatTime(a.createdAt, true)}
            </span>
          </li>
        ))}
      </ul>
    )}
    {audit && (
      <Pagination page={audit.page} size={audit.size} totalElements={audit.totalElements}
        totalPages={audit.totalPages} onPageChange={onPageChange} />
    )}
  </Card>
);
