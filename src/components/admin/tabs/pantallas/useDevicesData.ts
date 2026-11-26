import { useCallback, useEffect, useRef, useState } from 'react';
import { devicesApi, getErrorMessage, medicalServicesApi, userGroupsApi } from '../../../../services/api';
import type {
  DeviceAuditEntry, DeviceProfile, DeviceStatus, MedicalService, PageResponse, UserGroup,
} from '../../../../types/api';

export const AUDIT_PAGE_SIZE = 10;

export interface DevicesData {
  status: DeviceStatus | null;
  profiles: DeviceProfile[];
  services: MedicalService[];
  groups: UserGroup[];
  /** Una página del registro de actividad (null hasta la primera carga) */
  audit: PageResponse<DeviceAuditEntry> | null;
  /** Solo la primera carga: después se recarga sin tapar la pantalla */
  loading: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  reload: () => Promise<void>;
  /** Cambia de página de la actividad (el resto de la pantalla no se recarga). */
  changeAuditPage: (page: number) => Promise<void>;
}

/** Datos de la pantalla de dispositivos: estado del PIN, perfiles, catálogos y registro de actividad paginado. */
export function useDevicesData(): DevicesData {
  const [status, setStatus]     = useState<DeviceStatus | null>(null);
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [groups, setGroups]     = useState<UserGroup[]>([]);
  const [audit, setAudit]       = useState<PageResponse<DeviceAuditEntry> | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  // La página de actividad en que se está: una recarga general debe respetarla
  const auditPage = useRef(0);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [st, pr, sv, gr, au] = await Promise.all([
        devicesApi.status(), devicesApi.profiles(), medicalServicesApi.list(),
        userGroupsApi.list(), devicesApi.audit(auditPage.current, AUDIT_PAGE_SIZE),
      ]);
      setStatus(st); setProfiles(pr); setServices(sv); setGroups(gr); setAudit(au);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const changeAuditPage = useCallback(async (page: number) => {
    try {
      const next = await devicesApi.audit(page, AUDIT_PAGE_SIZE);
      auditPage.current = page;
      setAudit(next);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  return { status, profiles, services, groups, audit, loading, error, setError, reload, changeAuditPage };
}
