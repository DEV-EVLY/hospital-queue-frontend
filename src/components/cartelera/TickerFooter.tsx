import React from 'react';
import { tr } from '../../i18n';

const tickerMessage = (): string => import.meta.env.VITE_TICKER_MSG ?? tr('cartelera.ticker');

/** Pie con el aviso que se desplaza (mensaje configurable con VITE_TICKER_MSG). */
export const TickerFooter: React.FC = () => (
  <footer className="bg-sky-700 text-white py-3 px-4 overflow-hidden flex items-center gap-4 shrink-0 shadow-2xl">
    <span className="bg-sky-900 font-black text-xs uppercase tracking-widest px-3 py-1 rounded-lg whitespace-nowrap shadow">
      {tr('cartelera.aviso')}
    </span>
    <div className="overflow-hidden flex-1 relative">
      <p className="inline-block text-base font-bold whitespace-nowrap animate-ticker">
        {tickerMessage()}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerMessage()}
      </p>
    </div>
  </footer>
);
