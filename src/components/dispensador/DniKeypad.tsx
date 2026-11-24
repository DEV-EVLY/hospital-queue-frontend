import React from 'react';
import { tr } from '../../i18n';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

interface Props {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

/** Teclado numérico táctil para ingresar el documento. */
export const DniKeypad: React.FC<Props> = ({ onDigit, onBackspace, onClear }) => (
  <div className="grid grid-cols-3 gap-3 w-full">
    {DIGITS.map(n => (
      <button key={n} onClick={() => onDigit(n)} className="kiosko-key text-surface-900">{n}</button>
    ))}
    <button onClick={onClear} className="kiosko-key-delete text-red-600">{tr('kiosk.clear')}</button>
    <button onClick={() => onDigit('0')} className="kiosko-key text-surface-900">0</button>
    <button onClick={onBackspace} className="kiosko-key text-surface-600">{tr('kiosk.delete')}</button>
  </div>
);
