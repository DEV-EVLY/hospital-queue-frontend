import { useEffect, useRef, useState } from 'react';
import { medicalServicesApi } from '../../services/api';
import type { DeviceProfile, MedicalService } from '../../types/api';

/**
 * Servicios que ofrece el kiosko: los activos del catálogo, limitados a los del perfil del equipo
 * (sin perfil o con la lista vacía = todos). Se recarga si cambia el perfil.
 */
export function useKioskServices(profile: DeviceProfile | null, onLoadError: () => void): MedicalService[] {
  const [services, setServices] = useState<MedicalService[]>([]);

  const errorRef = useRef(onLoadError);
  errorRef.current = onLoadError;

  const profileKey = `${profile?.id ?? ''}:${(profile?.serviceIds ?? []).join(',')}`;

  useEffect(() => {
    const allowed = (id: string): boolean =>
      !profile || profile.serviceIds.length === 0 || profile.serviceIds.includes(id);
    medicalServicesApi.list()
      .then(list => setServices(list.filter(s => s.active && allowed(s.id))))
      .catch(() => errorRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey]);

  return services;
}
