import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, BarChart3, Settings, FileSpreadsheet, ShieldAlert, Stethoscope, UserCog, Users, HeartPulse, ClipboardList, FolderTree } from 'lucide-react';
import { Tabs } from '../ui';
import { getRole } from '../../services/auth';
import { MetricasTab }      from './tabs/MetricasTab';
import { ReglasTab }        from './tabs/ReglasTab';
import { ReportesTab }      from './tabs/ReportesTab';
import { ResilienciaTab }   from './tabs/ResilienciaTab';
import { CatalogoTab }      from './tabs/CatalogoTab';
import { UsuariosTab }      from './tabs/UsuariosTab';
import { GruposTab }        from './tabs/GruposTab';
import { PacientesTab }     from './tabs/PacientesTab';
import { MedicosTab }       from './tabs/MedicosTab';
import { TicketsAdminTab }  from './tabs/TicketsAdminTab';

type TabKey = 'METRICAS' | 'REGLAS' | 'REPORTES' | 'RESILIENCIA' | 'CATALOGO' | 'USUARIOS' | 'GRUPOS' | 'PACIENTES' | 'MEDICOS' | 'TICKETS_ADMIN';

const ALL_TABS = [
  { key: 'METRICAS',       label: 'Métricas',    icon: <BarChart3       className="w-4 h-4" /> },
  { key: 'REGLAS',         label: 'Reglas',      icon: <Settings        className="w-4 h-4" /> },
  { key: 'REPORTES',       label: 'Reportes',    icon: <FileSpreadsheet className="w-4 h-4" /> },
  { key: 'RESILIENCIA',    label: 'Resiliencia', icon: <ShieldAlert     className="w-4 h-4" /> },
  { key: 'CATALOGO',       label: 'Catálogo',    icon: <Stethoscope     className="w-4 h-4" /> },
  { key: 'USUARIOS',       label: 'Usuarios',    icon: <UserCog         className="w-4 h-4" /> },
  { key: 'GRUPOS',         label: 'Grupos',      icon: <FolderTree      className="w-4 h-4" /> },
  { key: 'PACIENTES',      label: 'Pacientes',   icon: <Users           className="w-4 h-4" /> },
  { key: 'MEDICOS',        label: 'Médicos',     icon: <HeartPulse      className="w-4 h-4" /> },
  { key: 'TICKETS_ADMIN',  label: 'Tickets',     icon: <ClipboardList   className="w-4 h-4" /> },
];

const SUPERVISOR_TABS: TabKey[] = ['METRICAS', 'REPORTES', 'RESILIENCIA'];

export const AdminDashboard: React.FC = () => {
  const role = getRole();
  const isSupervisor = role === 'SUPERVISOR';

  const visibleTabs = isSupervisor
    ? ALL_TABS.filter(t => SUPERVISOR_TABS.includes(t.key as TabKey))
    : ALL_TABS;

  const [activeTab, setActiveTab] = useState<TabKey>('METRICAS');

  const handleTabChange = (key: string) => {
    const k = key as TabKey;
    if (!isSupervisor || SUPERVISOR_TABS.includes(k)) {
      setActiveTab(k);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <header className="bg-white border-b border-surface-200 px-8 py-5 shadow-sm">
        <div className="max-w-screen-xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 text-primary-700 rounded-xl border border-primary-100">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-900">
                {isSupervisor ? 'Panel de Supervisión' : 'Panel de Administración Hospitalaria'}
              </h1>
              <p className="text-xs text-surface-500 mt-0.5">
                {isSupervisor
                  ? 'Métricas operativas · Reportes · Resiliencia del sistema'
                  : 'Inteligencia de Negocios · Motor de Priorización · Resiliencia'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-surface-200 px-8">
        <div className="max-w-screen-xl mx-auto">
          <Tabs
            tabs={visibleTabs}
            active={activeTab}
            onChange={handleTabChange}
            className="border-0 rounded-none bg-transparent py-2 gap-2"
          />
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'METRICAS'      && <MetricasTab />}
            {activeTab === 'REGLAS'        && <ReglasTab />}
            {activeTab === 'REPORTES'      && <ReportesTab />}
            {activeTab === 'RESILIENCIA'   && <ResilienciaTab />}
            {activeTab === 'CATALOGO'      && <CatalogoTab />}
            {activeTab === 'USUARIOS'      && <UsuariosTab />}
            {activeTab === 'GRUPOS'        && <GruposTab />}
            {activeTab === 'PACIENTES'     && <PacientesTab />}
            {activeTab === 'MEDICOS'       && <MedicosTab />}
            {activeTab === 'TICKETS_ADMIN' && <TicketsAdminTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
