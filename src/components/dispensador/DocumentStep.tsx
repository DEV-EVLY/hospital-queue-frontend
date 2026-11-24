import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Card } from '../ui';
import { tr } from '../../i18n';
import { DniKeypad } from './DniKeypad';
import { MAX_DOCUMENT_DIGITS } from './types';

interface Props {
  dni: string;
  welcomeName: string | null;
  loading: boolean;
  onDniChange: (value: string) => void;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSearch: () => void;
  onGuest: () => void;
}

/** Paso 1: ingresar el documento (teclado en pantalla o teclado físico) o continuar como visitante. */
export const DocumentStep: React.FC<Props> = ({
  dni, welcomeName, loading, onDniChange, onDigit, onBackspace, onClear, onSearch, onGuest,
}) => (
  <div className="w-full max-w-md flex flex-col items-center gap-6">
    <div className="text-center">
      <h2 className="text-3xl font-black text-surface-900 mb-1">{tr('kiosk.welcome')}</h2>
      <p className="text-base text-surface-500">{tr('kiosk.touch_to_start')}</p>
    </div>

    {welcomeName && (
      <div className="w-full flex items-center gap-3 bg-health-50 border border-health-200 text-health-800 rounded-xl2 px-5 py-3 text-sm font-semibold">
        <CheckCircle2 className="w-5 h-5 shrink-0 text-health-600" />
        <span>{tr('kiosk.bienvenido_nombre', { name: welcomeName })}</span>
      </div>
    )}

    <Card className="w-full" padding="none">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={MAX_DOCUMENT_DIGITS}
        value={dni}
        placeholder={tr('kiosk.dni_placeholder')}
        onChange={e => onDniChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
        className={`w-full rounded-xl bg-surface-50 border-2 border-surface-200 px-6 py-0 h-[84px] block text-center text-surface-900 transition-colors focus:outline-none focus:border-primary-400 placeholder:text-surface-300 ${dni ? 'font-mono text-5xl font-bold' : 'font-sans text-xl font-normal'}`}
        style={{ letterSpacing: dni ? '0.15em' : 'normal', lineHeight: 'normal' }}
      />
    </Card>

    <p className="text-sm font-medium text-surface-500 text-center -mt-2">{tr('kiosk.ingrese_su_numero_documento')}</p>

    <DniKeypad onDigit={onDigit} onBackspace={onBackspace} onClear={onClear} />

    <div className="flex gap-3 w-full pt-1">
      <Button variant="secondary" size="xl" fullWidth onClick={onGuest}>{tr('kiosk.guest')}</Button>
      <Button variant="primary" size="xl" fullWidth loading={loading} onClick={onSearch}>
        {loading ? tr('kiosk.buscando') : tr('kiosk.search')}
      </Button>
    </div>
  </div>
);
