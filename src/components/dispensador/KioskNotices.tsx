import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

/** Avisos globales bajo la cabecera: advertencia del registro y error de la última acción. */
export const KioskBanners: React.FC<{ registryWarning: string | null; errorMsg: string | null }> = ({ registryWarning, errorMsg }) => (
  <div className="px-8 pt-4 flex flex-col gap-2">
    {registryWarning && (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl2 px-5 py-3 text-sm font-semibold">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
        <span>{registryWarning}</span>
      </div>
    )}
    {errorMsg && (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl2 px-5 py-3 text-sm font-semibold">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
        <span>{errorMsg}</span>
      </div>
    )}
  </div>
);

/** Error dentro de un paso (junto a los botones de acción). */
export const InlineError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl2 px-4 py-3 text-sm font-semibold">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  ) : null;
