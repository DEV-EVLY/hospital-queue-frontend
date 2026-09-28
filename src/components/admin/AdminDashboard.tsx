import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, BarChart3, Settings, FileSpreadsheet, ShieldAlert, Stethoscope, UserCog } from 'lucide-react';
import { Tabs } from '../ui';
import { MetricasTab }    from './tabs/MetricasTab';
import { ReglasTab }      from './tabs/ReglasTab';
import { ReportesTab }    from './tabs/ReportesTab';
import { ResilienciaTab } from './tabs/ResilienciaTab';
import { CatalogoTab }    from './tabs/CatalogoTab';
import { UsuariosTab }    from './tabs/UsuariosTab';

type TabKey = 'METRICAS' | 'REGLAS' | 'REPORTES' | 'RESILIENCIA' | 'CATALOGO' | 'USUARIOS';

const TABS = [
  { key: 'METRICAS',    label: 'Métricas',   icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'REGLAS',      label: 'Reglas',     icon: <Settings className="w-4 h-4" /> },
  { key: 'REPORTES',    label: 'Reportes',   icon: <FileSpreadsheet className="w-4 h-4" /> },
  { key: 'RESILIENCIA', label: 'Resiliencia',icon: <ShieldAlert className="w-4 h-4" /> },
  { key: 'CATALOGO',    label: 'Catálogo',   icon: <Stethoscope className="w-4 h-4" /> },
  { key: 'USUARIOS',    label: 'Usuarios',   icon: <UserCog className="w-4 h-4" /> },
];

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('METRICAS');

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <header className="bg-white border-b border-surface-200 px-8 py-5 shadow-sm">
        <div className="max-w-screen-xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 text-primary-700 rounded-xl border border-primary-100">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-900">Panel de Administración Hospitalaria</h1>
              <p className="text-xs text-surface-500 mt-0.5">Inteligencia de Negocios · Motor de Priorización · Resiliencia</p>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-surface-200 px-8">
        <div className="max-w-screen-xl mx-auto">
          <Tabs
            tabs={TABS}
            active={activeTab}
            onChange={key => setActiveTab(key as TabKey)}
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
            {activeTab === 'METRICAS'    && <MetricasTab />}
            {activeTab === 'REGLAS'      && <ReglasTab />}
            {activeTab === 'REPORTES'    && <ReportesTab />}
            {activeTab === 'RESILIENCIA' && <ResilienciaTab />}
            {activeTab === 'CATALOGO'    && <CatalogoTab />}
            {activeTab === 'USUARIOS'    && <UsuariosTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
