import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, UserRound } from 'lucide-react';
import { Tabs } from '../../ui';
import type { Doctor } from '../../../types/api';
import { tr } from '../../../i18n';
import { DoctorFormModal } from './medicos/DoctorFormModal';
import { DoctorsPanel } from './medicos/DoctorsPanel';
import { SpecialtiesPanel } from './medicos/SpecialtiesPanel';
import { SpecialtyFormModal } from './medicos/SpecialtyFormModal';
import { useDoctors } from './medicos/useDoctors';
import { useSpecialties } from './medicos/useSpecialties';

type SubTab = 'MEDICOS' | 'ESPECIALIDADES';

const subTabs = () => [
  { key: 'MEDICOS',        label: tr('medicos.medicos'),        icon: <UserRound   className="w-4 h-4" /> },
  { key: 'ESPECIALIDADES', label: tr('medicos.especialidades'), icon: <Stethoscope className="w-4 h-4" /> },
];

/** Administración de médicos y del catálogo de especialidades. */
export const MedicosTab: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('MEDICOS');
  // Modal de médico: `editing` null = crear
  const [doctorModal, setDoctorModal] = useState<{ open: boolean; editing: Doctor | null }>({ open: false, editing: null });
  const [specialtyModalOpen, setSpecialtyModalOpen] = useState(false);

  const doctors = useDoctors();
  const specialties = useSpecialties();

  return (
    <div className="space-y-6">
      <Tabs tabs={subTabs()} active={subTab} onChange={k => setSubTab(k as SubTab)} className="w-fit" />

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {subTab === 'MEDICOS' ? (
            <DoctorsPanel
              list={doctors}
              specialties={specialties.specialties}
              onNew={() => { doctors.setError(null); setDoctorModal({ open: true, editing: null }); }}
              onEdit={d => { doctors.setError(null); setDoctorModal({ open: true, editing: d }); }}
            />
          ) : (
            <SpecialtiesPanel list={specialties} onNew={() => { specialties.setError(null); setSpecialtyModalOpen(true); }} />
          )}
        </motion.div>
      </AnimatePresence>

      <DoctorFormModal
        open={doctorModal.open}
        editing={doctorModal.editing}
        specialties={specialties.specialties}
        onClose={() => setDoctorModal(m => ({ ...m, open: false }))}
        onSave={(id, payload) => (id ? doctors.update(id, payload) : doctors.create(payload))}
      />
      <SpecialtyFormModal open={specialtyModalOpen} onClose={() => setSpecialtyModalOpen(false)} onSave={specialties.create} />
    </div>
  );
};
