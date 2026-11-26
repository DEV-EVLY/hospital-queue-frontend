import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, Modal, Select } from '../../../ui';
import { getErrorMessage } from '../../../../services/api';
import type { UserGroup, UserGroupMembership } from '../../../../types/api';
import { tr, trp } from '../../../../i18n';
import { FormError } from '../_shared';
import { BLANK_FORM, membersMissingInParent, parentOptions, type ChildrenMap, type GroupForm } from './groupTree';
import type { GroupPayload } from './useGroupActions';

interface Props {
  open: boolean;
  /** Grupo que se edita (null = crear) */
  editing: UserGroup | null;
  /** Padre preseleccionado al crear un subgrupo */
  initialParentId: string | null;
  groups: UserGroup[];
  tree: ChildrenMap;
  memberships: UserGroupMembership[];
  onClose: () => void;
  /** Debe lanzar el error si falla: el modal lo muestra sin cerrarse. */
  onSave: (editingId: string | null, payload: GroupPayload) => Promise<void>;
}

const formOf = (g: UserGroup): GroupForm => ({ code: g.code, name: g.name, description: g.description ?? '', parentId: g.parentId ?? '' });

/** Crear o editar un grupo. El formulario y sus errores son estado propio del modal. */
export const GroupFormModal: React.FC<Props> = ({ open, editing, initialParentId, groups, tree, memberships, onClose, onSave }) => {
  const [form, setForm]   = useState<GroupForm>({ ...BLANK_FORM });
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre, parte del grupo que se edita (o de un formulario vacío)
  useEffect(() => {
    if (!open) return;
    setForm(editing ? formOf(editing) : { ...BLANK_FORM, parentId: initialParentId ?? '' });
    setError(null);
  }, [open, editing, initialParentId]);

  const set = (patch: Partial<GroupForm>) => setForm(f => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.name.trim() || (!editing && !form.code.trim())) {
      setError(editing ? tr('grupos.nombre_obligatorio') : tr('grupos.codigo_nombre_obligatorios'));
      return;
    }
    // Mover un grupo bajo otro padre exige que todos sus miembros ya pertenezcan a ese padre
    if (editing && form.parentId && form.parentId !== (editing.parentId ?? '')) {
      const missing = membersMissingInParent(memberships, editing.id, form.parentId);
      if (missing > 0) {
        setError(trp('grupos.mover_bloqueado', missing, { parent: groups.find(g => g.id === form.parentId)?.name ?? '' }));
        return;
      }
    }
    setError(null);
    try {
      await onSave(editing?.id ?? null, {
        code: form.code.trim(), name: form.name.trim(),
        description: form.description.trim() || null, parentId: form.parentId || null,
      });
      onClose();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('grupos.editar_grupo_titulo') : tr('grupos.nuevo_grupo_titulo')}
      description={tr('grupos.grupos_organizan_usuarios_grupo_puede')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('common.cancelar')}</Button>
          <Button icon={<Save className="w-4 h-4" />} onClick={submit}>
            {editing ? tr('common.guardar_cambios') : tr('grupos.crear_grupo')}
          </Button>
        </>
      }
    >
      <FormError msg={error} onDismiss={() => setError(null)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={tr('common.codigo_2')} placeholder="PED" maxLength={30} disabled={!!editing}
          value={form.code} onChange={e => set({ code: e.target.value.toUpperCase() })} fullWidth />
        <Input label={tr('common.nombre_2')} maxLength={100} placeholder={tr('grupos.pediatria')}
          value={form.name} onChange={e => set({ name: e.target.value })} fullWidth />
        <div className="sm:col-span-2">
          <Select label={tr('grupos.grupo_padre')} value={form.parentId} onChange={v => set({ parentId: v })}
            options={parentOptions(tree, editing?.id ?? null, tr('grupos.sin_padre'))} fullWidth />
        </div>
        <div className="sm:col-span-2">
          <Input label={tr('common.descripcion')} placeholder={tr('common.descripcion_opcional')} maxLength={255}
            value={form.description} onChange={e => set({ description: e.target.value })} fullWidth />
        </div>
      </div>
    </Modal>
  );
};
