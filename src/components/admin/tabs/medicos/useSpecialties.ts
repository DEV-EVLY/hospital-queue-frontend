import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, specialtiesApi } from '../../../../services/api';
import type { Specialty } from '../../../../types/api';
import { tr } from '../../../../i18n';
import type { SpecialtyForm } from './doctorForm';

export interface SpecialtiesList {
  specialties: Specialty[];
  error: string | null;
  setError: (message: string | null) => void;
  /** Lanza el error si falla: el modal lo muestra. */
  create: (form: SpecialtyForm) => Promise<void>;
}

/** Catálogo de especialidades médicas. */
export function useSpecialties(): SpecialtiesList {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [error, setError]             = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setSpecialties(await specialtiesApi.list()); }
    catch (e: unknown) { setError(tr('medicos.error_cargar_datos_error', { error: getErrorMessage(e) })); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async (form: SpecialtyForm) => {
    const created = await specialtiesApi.create(form);
    setSpecialties(prev => [...prev, created]);
  };

  return { specialties, error, setError, create };
}
