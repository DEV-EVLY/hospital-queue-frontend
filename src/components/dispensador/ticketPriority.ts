import { tr } from '../../i18n';

/** Texto de la prioridad en el idioma del kiosko. */
export const priorityText = (level: string): string => {
  if (level === 'URGENT')       return tr('kiosk.priority_urgent');
  if (level === 'PREFERENTIAL') return tr('kiosk.priority_preferential');
  return tr('kiosk.priority_normal');
};

/** Clases de la insignia de prioridad del ticket. */
export const priorityClasses = (level: string): string => {
  if (level === 'URGENT')       return 'bg-red-100 text-red-700 border border-red-200';
  if (level === 'PREFERENTIAL') return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-primary-50 text-primary-700 border border-primary-100';
};
