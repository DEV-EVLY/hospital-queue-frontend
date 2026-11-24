import React from 'react';
import { motion } from 'motion/react';
import { PhoneCall, User } from 'lucide-react';
import { Button } from '../ui';
import { tr } from '../../i18n';

/** Sin turno en el consultorio: invita a llamar al siguiente. */
export const NoActiveTicketView: React.FC<{ busy: boolean; onCallNext: () => void }> = ({ busy, onCallNext }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center justify-center py-16 gap-4"
  >
    <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center">
      <User size={28} className="text-surface-300" />
    </div>
    <div className="text-center">
      <h3 className="text-base font-semibold text-surface-700">{tr('operator.sin_turno_activo')}</h3>
      <p className="text-sm text-surface-400 mt-1 max-w-xs">{tr('operator.llame_siguiente_paciente_para_comenzar')}</p>
    </div>
    <Button variant="primary" size="xl" loading={busy} icon={<PhoneCall size={20} />} onClick={onCallNext}>
      {tr('operator.llamar_siguiente')}
    </Button>
  </motion.div>
);
