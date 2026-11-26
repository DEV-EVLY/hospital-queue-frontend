import React from 'react';
import { ChevronDown, ChevronRight, Edit2, FolderPlus, Trash2 } from 'lucide-react';
import { Badge } from '../../../ui';
import type { UserGroup } from '../../../../types/api';
import { tr, trp } from '../../../../i18n';
import type { ChildrenMap } from './groupTree';

export interface TreeHandlers {
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onAddSubgroup: (parentId: string) => void;
  onEdit: (group: UserGroup) => void;
  onToggleActive: (group: UserGroup) => void;
  onDelete: (group: UserGroup) => void;
}

interface Props extends TreeHandlers {
  group: UserGroup;
  depth: number;
  tree: ChildrenMap;
  collapsed: Set<string>;
  selectedId: string | null;
}

const iconButton = 'p-1.5 rounded-lg text-surface-400';

/** Un grupo del árbol (con sus subgrupos, de forma recursiva) y sus acciones al pasar el cursor. */
export const GroupTreeNode: React.FC<Props> = ({ group, depth, tree, collapsed, selectedId, ...on }) => {
  const kids = tree.get(group.id) ?? [];
  const isOpen = !collapsed.has(group.id);
  const isSelected = selectedId === group.id;
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg pr-1 cursor-pointer transition-colors ${
          isSelected ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-surface-50'
        } ${group.active ? '' : 'opacity-60'}`}
        style={{ paddingLeft: depth * 20 + 4 }}
        onClick={() => on.onSelect(group.id)}
      >
        <button
          className="p-1 text-surface-400 hover:text-surface-700 shrink-0"
          onClick={stop(() => { if (kids.length) on.onToggleCollapse(group.id); })}
          style={{ visibility: kids.length ? 'visible' : 'hidden' }}
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0 py-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-surface-900 truncate">{group.name}</span>
            {!group.active && <Badge variant="gray">{tr('common.inactivo')}</Badge>}
          </div>
          <div className="text-[11px] text-surface-400 font-mono">
            {group.code} · {trp('grupos.miembros', group.memberCount)} · {trp('grupos.servicios', group.serviceIds.length)}
          </div>
        </div>

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button title={tr('grupos.agregar_subgrupo')} onClick={stop(() => on.onAddSubgroup(group.id))}
            className={`${iconButton} hover:text-primary-600 hover:bg-primary-50`}><FolderPlus className="w-4 h-4" /></button>
          <button title={tr('grupos.editar')} onClick={stop(() => on.onEdit(group))}
            className={`${iconButton} hover:text-primary-600 hover:bg-primary-50`}><Edit2 className="w-4 h-4" /></button>
          <button
            title={group.active ? tr('common.desactivar') : tr('common.activar')}
            onClick={stop(() => on.onToggleActive(group))}
            className="px-1.5 text-[11px] font-semibold rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50">
            {group.active ? tr('common.desactivar') : tr('common.activar')}
          </button>
          <button title={tr('grupos.eliminar')} onClick={stop(() => on.onDelete(group))}
            className={`${iconButton} hover:text-red-600 hover:bg-red-50`}><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {isOpen && kids.map(kid => (
        <GroupTreeNode key={kid.id} group={kid} depth={depth + 1} tree={tree}
          collapsed={collapsed} selectedId={selectedId} {...on} />
      ))}
    </div>
  );
};
