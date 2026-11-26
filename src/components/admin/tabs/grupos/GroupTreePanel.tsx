import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button, Card } from '../../../ui';
import type { UserGroup } from '../../../../types/api';
import { tr, trp } from '../../../../i18n';
import { GroupTreeNode, type TreeHandlers } from './GroupTreeNode';
import type { ChildrenMap } from './groupTree';

interface Props extends TreeHandlers {
  groups: UserGroup[];
  tree: ChildrenMap;
  collapsed: Set<string>;
  selectedId: string | null;
  onRefresh: () => void;
  onCreateRoot: () => void;
}

/** Panel izquierdo: el árbol de grupos con su cabecera (recargar y crear). */
export const GroupTreePanel: React.FC<Props> = ({ groups, tree, collapsed, selectedId, onRefresh, onCreateRoot, ...handlers }) => {
  const roots = tree.get(null) ?? [];
  return (
    <Card padding="none" className="lg:col-span-2">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
        <div>
          <h3 className="text-sm font-semibold text-surface-900">{tr('grupos.grupos_usuarios')}</h3>
          <p className="text-xs text-surface-500 mt-0.5">{trp('grupos.grupos', groups.length)} · {tr('grupos.organizacion_jerarquica')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={onRefresh} />
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={onCreateRoot}>{tr('common.nuevo')}</Button>
        </div>
      </div>
      <div className="p-3 max-h-[560px] overflow-y-auto">
        {roots.length === 0
          ? <p className="py-10 text-center text-sm text-surface-400">{tr('grupos.aun_no_hay_grupos_crea')}</p>
          : roots.map(g => (
              <GroupTreeNode key={g.id} group={g} depth={0} tree={tree}
                collapsed={collapsed} selectedId={selectedId} {...handlers} />
            ))}
      </div>
    </Card>
  );
};
