import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Stethoscope } from 'lucide-react';
import { Tabs } from '../../ui';
import type { ConsultingRoom, MedicalService } from '../../../types/api';
import { tr } from '../../../i18n';
import { RoomFormModal } from './catalogo/RoomFormModal';
import { RoomsPanel } from './catalogo/RoomsPanel';
import { ServiceFormModal } from './catalogo/ServiceFormModal';
import { ServicesPanel } from './catalogo/ServicesPanel';
import { useConsultingRooms } from './catalogo/useConsultingRooms';
import { useMedicalServices } from './catalogo/useMedicalServices';

type SubTab = 'SERVICIOS' | 'CONSULTORIOS';

const subTabs = () => [
  { key: 'SERVICIOS',    label: tr('catalogo.servicios_medicos'), icon: <Stethoscope className="w-4 h-4" /> },
  { key: 'CONSULTORIOS', label: tr('catalogo.consultorios'),      icon: <Building2 className="w-4 h-4" /> },
];

/** Catálogo del hospital: servicios médicos y consultorios. */
export const CatalogoTab: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('SERVICIOS');
  // Modales de alta/edición: `editing` null = crear
  const [serviceModal, setServiceModal] = useState<{ open: boolean; editing: MedicalService | null }>({ open: false, editing: null });
  const [roomModal, setRoomModal]       = useState<{ open: boolean; editing: ConsultingRoom | null }>({ open: false, editing: null });

  const services = useMedicalServices();
  const rooms = useConsultingRooms();

  return (
    <div className="space-y-6">
      <Tabs tabs={subTabs()} active={subTab} onChange={key => setSubTab(key as SubTab)} className="w-fit" />

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {subTab === 'SERVICIOS' ? (
            <ServicesPanel
              list={services}
              onNew={() => { services.setError(null); setServiceModal({ open: true, editing: null }); }}
              onEdit={s => { services.setError(null); setServiceModal({ open: true, editing: s }); }}
            />
          ) : (
            <RoomsPanel
              list={rooms}
              services={services.services}
              onNew={() => { rooms.setError(null); setRoomModal({ open: true, editing: null }); }}
              onEdit={r => { rooms.setError(null); setRoomModal({ open: true, editing: r }); }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <ServiceFormModal
        open={serviceModal.open}
        editing={serviceModal.editing}
        onClose={() => setServiceModal(m => ({ ...m, open: false }))}
        onSave={services.save}
      />
      <RoomFormModal
        open={roomModal.open}
        editing={roomModal.editing}
        services={services.services}
        onClose={() => setRoomModal(m => ({ ...m, open: false }))}
        onSave={rooms.save}
      />
    </div>
  );
};
