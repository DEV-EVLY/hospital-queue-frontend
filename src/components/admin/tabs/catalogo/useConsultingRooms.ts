import { useCallback, useEffect, useState } from 'react';
import { consultingRoomsApi, getErrorMessage } from '../../../../services/api';
import type { ConsultingRoom } from '../../../../types/api';
import { tr } from '../../../../i18n';
import { toRoomPayload, type RoomForm } from './catalogForms';

export interface ConsultingRoomsList {
  rooms: ConsultingRoom[];
  /** Error de la lista o de abrir/cerrar (los del formulario los muestra el propio modal) */
  error: string | null;
  setError: (message: string | null) => void;
  reload: () => void;
  /** Lanzan el error si fallan: el modal lo muestra. */
  save: (editingId: string | null, form: RoomForm) => Promise<void>;
  toggleOpen: (id: string) => Promise<void>;
}

/** Consultorios: lista, alta, edición y abrir/cerrar. */
export function useConsultingRooms(): ConsultingRoomsList {
  const [rooms, setRooms] = useState<ConsultingRoom[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRooms(await consultingRoomsApi.list()); }
    catch (e: unknown) { setError(tr('catalogo.error_cargar_consultorios_error', { error: getErrorMessage(e) })); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (editingId: string | null, form: RoomForm) => {
    const payload = toRoomPayload(form);
    if (editingId) {
      const updated = await consultingRoomsApi.update(editingId, payload);
      setRooms(prev => prev.map(r => r.id === editingId ? updated : r));
    } else {
      const created = await consultingRoomsApi.create(payload);
      setRooms(prev => [...prev, created]);
    }
  };

  const toggleOpen = async (id: string) => {
    try {
      const updated = await consultingRoomsApi.toggleActive(id);
      setRooms(prev => prev.map(r => r.id === id ? updated : r));
    } catch (e: unknown) { setError(tr('common.error_error', { error: getErrorMessage(e) })); }
  };

  return { rooms, error, setError, reload: () => { void load(); }, save, toggleOpen };
}
