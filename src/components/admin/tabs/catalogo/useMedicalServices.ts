import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, medicalServicesApi } from '../../../../services/api';
import type { MedicalService } from '../../../../types/api';
import { tr } from '../../../../i18n';
import type { ServiceForm } from './catalogForms';

export interface MedicalServicesList {
  services: MedicalService[];
  /** Error de la lista o de activar/desactivar (los del formulario los muestra el propio modal) */
  error: string | null;
  setError: (message: string | null) => void;
  reload: () => void;
  /** Lanzan el error si fallan: el modal lo muestra. */
  save: (editingId: string | null, form: ServiceForm) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
}

/** Catálogo de servicios médicos: lista, alta, edición y activar/desactivar. */
export function useMedicalServices(): MedicalServicesList {
  const [services, setServices] = useState<MedicalService[]>([]);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setServices(await medicalServicesApi.list()); }
    catch (e: unknown) { setError(tr('common.error_cargar_servicios_error', { error: getErrorMessage(e) })); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (editingId: string | null, form: ServiceForm) => {
    if (editingId) {
      const updated = await medicalServicesApi.update(editingId, form);
      setServices(prev => prev.map(s => s.id === editingId ? updated : s));
    } else {
      const created = await medicalServicesApi.create(form);
      setServices(prev => [...prev, created]);
    }
  };

  const toggleActive = async (id: string) => {
    try {
      await medicalServicesApi.toggleActive(id);
      setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    } catch (e: unknown) { setError(tr('common.error_error', { error: getErrorMessage(e) })); }
  };

  return { services, error, setError, reload: () => { void load(); }, save, toggleActive };
}
