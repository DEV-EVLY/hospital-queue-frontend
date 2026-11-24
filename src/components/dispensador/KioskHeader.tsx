import React from 'react';
import { Activity } from 'lucide-react';
import { LanguageSelector } from '../ui';
import { tr } from '../../i18n';

/** Cabecera del kiosko: nombre del hospital y selector de idioma. */
export const KioskHeader: React.FC = () => (
  <header className="flex items-center justify-between bg-white border-b border-surface-200 px-8 py-4 shadow-card">
    <div className="flex items-center gap-4">
      <div className="bg-primary-700 p-3 rounded-xl2">
        <Activity className="w-7 h-7 text-white" />
      </div>
      <div>
        <h1 className="text-xl font-black tracking-wide text-surface-900">{tr('kiosk.hospital_title')}</h1>
        <p className="text-xs font-semibold text-surface-500 tracking-widest uppercase">{tr('kiosk.dispensador_turnos')}</p>
      </div>
    </div>
    <LanguageSelector variant="pills" />
  </header>
);
