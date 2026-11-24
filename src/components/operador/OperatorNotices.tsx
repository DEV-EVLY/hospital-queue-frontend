import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { tr } from '../../i18n';

const collapse = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
} as const;

/** Aviso mientras el tiempo real está caído. */
export const OfflineNotice: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        {...collapse}
        className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium"
      >
        <WifiOff size={15} className="shrink-0" />
        <span>{tr('operator.sin_conexion_tiempo_real_reconectando')}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

/** Error de una acción, con botón para descartarlo. */
export const ErrorNotice: React.FC<{ message: string | null; onDismiss: () => void }> = ({ message, onDismiss }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        {...collapse}
        className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium"
      >
        <span>{message}</span>
        <button onClick={onDismiss} className="ml-4 text-red-400 hover:text-red-600 text-lg leading-none font-bold">×</button>
      </motion.div>
    )}
  </AnimatePresence>
);

/** El usuario no pertenece a ningún grupo (o sus grupos no tienen consultorios): no puede operar. */
export const NoAssignmentNotice: React.FC<{ hasGroups: boolean }> = ({ hasGroups }) => (
  <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-5 py-4 text-sm font-medium">
    {hasGroups ? tr('operator.sin_consultorios_asignados') : tr('operator.sin_grupo_asignado')}
  </div>
);
