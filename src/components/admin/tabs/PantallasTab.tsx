import React, { useState } from 'react';
import { Spinner } from '../../ui';
import { devicesApi, getErrorMessage } from '../../../services/api';
import type { DeviceProfile, DeviceProfileRequest } from '../../../types/api';
import { tr } from '../../../i18n';
import { FormError } from './_shared';
import { AuditCard } from './pantallas/AuditCard';
import { PinCard } from './pantallas/PinCard';
import { ProfileFormModal } from './pantallas/ProfileFormModal';
import { ProfilesCard } from './pantallas/ProfilesCard';
import { isLastActive } from './pantallas/profileForm';
import { useDevicesData } from './pantallas/useDevicesData';

/** Administración de pantallas: PIN de configuración, perfiles de kiosko y cartelera, y su actividad. */
export const PantallasTab: React.FC = () => {
  const data = useDevicesData();
  // Modal de perfil: `editing` null = crear
  const [modal, setModal] = useState<{ open: boolean; editing: DeviceProfile | null }>({ open: false, editing: null });

  const saveProfile = async (editing: DeviceProfile | null, body: DeviceProfileRequest) => {
    if (editing) await devicesApi.update(editing.id, body);
    else         await devicesApi.create(body);
    await data.reload();
  };

  const removeProfile = async (p: DeviceProfile) => {
    if (isLastActive(data.profiles, p) && !confirm(tr('devices.ultimo_perfil_confirm', { type: tr(`devices.tipo.${p.type}`) }))) return;
    if (!confirm(tr('devices.eliminar_confirm', { name: p.name }))) return;
    try { await devicesApi.remove(p.id); await data.reload(); }
    catch (e) { data.setError(getErrorMessage(e)); }
  };

  if (data.loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="flex flex-col gap-6">
      <FormError msg={data.error} onDismiss={() => data.setError(null)} />

      <PinCard status={data.status} onChanged={data.reload} onError={data.setError} />
      <ProfilesCard
        profiles={data.profiles}
        services={data.services}
        onNew={() => setModal({ open: true, editing: null })}
        onEdit={p => setModal({ open: true, editing: p })}
        onDelete={removeProfile}
      />
      <AuditCard audit={data.audit} onPageChange={p => { void data.changeAuditPage(p); }} />

      <ProfileFormModal
        open={modal.open}
        editing={modal.editing}
        profiles={data.profiles}
        services={data.services}
        groups={data.groups}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        onSave={saveProfile}
      />
    </div>
  );
};
