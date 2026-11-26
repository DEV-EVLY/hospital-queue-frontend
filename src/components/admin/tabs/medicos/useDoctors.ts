import { useCallback, useEffect, useState } from 'react';
import { doctorsApi, getErrorMessage } from '../../../../services/api';
import type { Doctor, DoctorRequest, DoctorStatus } from '../../../../types/api';
import { tr } from '../../../../i18n';

export const DOCTORS_PAGE_SIZE = 50;

export interface DoctorsList {
  doctors: Doctor[];
  page: number;
  total: number;
  totalPages: number;
  loading: boolean;
  /** Error de la lista o de una acción de fila (los del formulario los muestra el propio modal) */
  error: string | null;
  setError: (message: string | null) => void;
  setPage: (page: number) => void;
  reload: () => void;
  /** Lanzan el error si fallan: el modal lo muestra. */
  create: (payload: DoctorRequest) => Promise<void>;
  update: (id: string, payload: DoctorRequest) => Promise<void>;
  changeStatus: (doctor: Doctor, status: DoctorStatus) => Promise<void>;
  toggleActive: (doctor: Doctor) => Promise<void>;
}

/** Lista paginada de médicos y sus acciones. Recarga siempre que cambia de página (también al volver a la primera). */
export function useDoctors(): DoctorsList {
  const [doctors, setDoctors]       = useState<Doctor[]>([]);
  const [page, setPage]             = useState(0);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await doctorsApi.list(undefined, p, DOCTORS_PAGE_SIZE);
      setDoctors(data.content ?? []);
      setTotal(data.totalElements ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (e: unknown) { setError(tr('medicos.error_cargar_medicos_error', { error: getErrorMessage(e) })); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(page); }, [page, load]);

  const replace = (updated: Doctor) => setDoctors(prev => prev.map(d => d.id === updated.id ? updated : d));

  const create = async (payload: DoctorRequest) => {
    await doctorsApi.create(payload);
    // El médico nuevo aparece al inicio: se vuelve a la primera página
    if (page === 0) await load(0); else setPage(0);
  };

  const update = async (id: string, payload: DoctorRequest) => { replace(await doctorsApi.update(id, payload)); };

  const changeStatus = async (doctor: Doctor, status: DoctorStatus) => {
    try { replace(await doctorsApi.updateStatus(doctor.id, status)); }
    catch (e: unknown) { setError(tr('medicos.error_cambiar_estado_error', { error: getErrorMessage(e) })); }
  };

  const toggleActive = async (doctor: Doctor) => {
    if (!doctor.specialtyId) { setError(tr('medicos.medico_no_tiene_especialidad_asignada')); return; }
    try {
      replace(await doctorsApi.update(doctor.id, {
        licenseNumber: doctor.licenseNumber, firstName: doctor.firstName, lastName: doctor.lastName,
        specialtyId: doctor.specialtyId, phone: doctor.phone, email: doctor.email, active: !doctor.active,
      }));
    } catch (e: unknown) { setError(tr('common.error_error', { error: getErrorMessage(e) })); }
  };

  return { doctors, page, total, totalPages, loading, error, setError, setPage, reload: () => { void load(page); },
    create, update, changeStatus, toggleActive };
}
