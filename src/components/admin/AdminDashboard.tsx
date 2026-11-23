import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, BarChart3, Settings, FileSpreadsheet, ShieldAlert, Stethoscope, UserCog, Users, HeartPulse, ClipboardList, FolderTree, MonitorSmartphone } from 'lucide-react';
import { Tabs } from '../ui';
import { getRole } from '../../services/auth';
import { MetricasTab }      from './tabs/MetricasTab';
import { ReglasTab }        from './tabs/ReglasTab';
import { ReportesTab }      from './tabs/ReportesTab';
import { ResilienciaTab }   from './tabs/ResilienciaTab';
import { CatalogoTab }      from './tabs/CatalogoTab';
import { UsuariosTab }      from './tabs/UsuariosTab';
import { GruposTab }        from './tabs/GruposTab';
import { PantallasTab }     from './tabs/PantallasTab';
import { PacientesTab }     from './tabs/PacientesTab';
import { MedicosTab }       from './tabs/MedicosTab';
import { TicketsAdminTab }  from './tabs/TicketsAdminTab';
import { tr } from '../../i18n';

type TabKey = 'METRICAS' | 'REGLAS' | 'REPORTES' | 'RESILIENCIA' | 'CATALOGO' | 'USUARIOS' | 'GRUPOS' | 'PACIENTES' | 'MEDICOS' | 'TICKETS_ADMIN' | 'PANTALLAS';

const TAB_ICONS: Record<TabKey, React.ReactNode> = {
  METRICAS:      <BarChart3       className="w-4 h-4" />,
  REGLAS:        <Settings        className="w-4 h-4" />,
  REPORTES:      <FileSpreadsheet className="w-4 h-4" />,
  RESILIENCIA:   <ShieldAlert     className="w-4 h-4" />,
  CATALOGO:      <Stethoscope     className="w-4 h-4" />,
  USUARIOS:      <UserCog         className="w-4 h-4" />,
  GRUPOS:        <FolderTree      className="w-4 h-4" />,
  PACIENTES:     <Users           className="w-4 h-4" />,
  MEDICOS:       <HeartPulse      className="w-4 h-4" />,
  TICKETS_ADMIN: <ClipboardList   className="w-4 h-4" />,
  PANTALLAS:     <MonitorSmartphone className="w-4 h-4" />,
};
const TAB_ORDER: TabKey[] = ['METRICAS', 'REGLAS', 'REPORTES', 'RESILIENCIA', 'CATALOGO', 'USUARIOS', 'GRUPOS', 'PACIENTES', 'MEDICOS', 'TICKETS_ADMIN', 'PANTALLAS'];
/** Se arma en cada render para que las etiquetas sigan el idioma actual. */
const allTabs = () => TAB_ORDER.map(key => ({ key, label: tr(`admin.tab.${key}`), icon: TAB_ICONS[key] }));

const SUPERVISOR_TABS: TabKey[] = ['METRICAS', 'REPORTES', 'RESILIENCIA'];

export const AdminDashboard: React.FC = () => {
  const role = getRole();
  const isSupervisor = role === 'SUPERVISOR';

  const visibleTabs = isSupervisor
    ? allTabs().filter(t => SUPERVISOR_TABS.includes(t.key))
    : allTabs();

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
                {isSupervisor ? tr('admin.title_supervisor') : tr('admin.title_admin')}
              </h1>
              <p className="text-xs text-surface-500 mt-0.5">
                {isSupervisor
                  ? tr('admin.subtitle_supervisor')
                  : tr('admin.subtitle_admin')}
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
            {activeTab === 'PANTALLAS'     && <PantallasTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
