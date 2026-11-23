import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { tr } from '../../i18n';

interface PaginationProps {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page, size, totalElements, totalPages, onPageChange, className = ''
}) => {
  if (totalPages <= 1 && totalElements <= size) return null;

  const from = totalElements === 0 ? 0 : page * size + 1;
  const to   = Math.min((page + 1) * size, totalElements);

  return (
    <div className={`flex items-center justify-between gap-4 px-1 py-3 border-t border-surface-100 ${className}`}>
      <span className="text-xs text-surface-500">
        {totalElements === 0
          ? tr('ui.pagination.sin_resultados')
          : tr('ui.pagination.mostrando', { from, to, total: totalElements })}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<ChevronLeft className="w-4 h-4" />}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          {tr('ui.pagination.anterior')}
        </Button>
        <span className="text-xs text-surface-600 font-medium min-w-[52px] text-center">
          {totalPages > 0 ? `${page + 1} / ${totalPages}` : '1 / 1'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          iconEnd={<ChevronRight className="w-4 h-4" />}
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          {tr('ui.pagination.siguiente')}
        </Button>
      </div>
    </div>
  );
};
