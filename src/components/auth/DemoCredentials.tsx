import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '../ui';
import type { Role } from '../../types/api';
import { tr, roleLabel } from '../../i18n';

/**
 * Cuentas de prueba del entorno de desarrollo. Solo se muestra en desarrollo (`vite`) o si se activa
 * explícitamente con VITE_SHOW_DEMO_CREDENTIALS=true: en un build de producción no aparece ni queda en la pantalla.
 */
const ACCOUNTS: { username: string; password: string; role: Role }[] = [
  { username: 'admin',           password: 'Hospital2026!', role: 'ADMIN' },
  { username: 'supervisor',      password: 'Hospital2026!', role: 'SUPERVISOR' },
  { username: 'nurse.rodriguez', password: 'Hospital2026!', role: 'OPERATOR' },
  { username: 'dr.sanchez',      password: 'Hospital2026!', role: 'DOCTOR' },
  { username: 'dr.garcia',       password: 'Hospital2026!', role: 'DOCTOR' },
];

export const demoCredentialsEnabled = (): boolean =>
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

export const DemoCredentials: React.FC = () => {
  const [open, setOpen] = useState(false);
  if (!demoCredentialsEnabled()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-surface-400 hover:text-primary-700 transition-colors"
      >
        <KeyRound size={12} />
        {tr('login.credenciales_prueba')}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={tr('login.credenciales_prueba')}
        description={tr('login.credenciales_prueba_desc')}
        size="md"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">
                <th className="py-2 pr-3">{tr('common.usuario')}</th>
                <th className="py-2 pr-3">{tr('login.contrasena')}</th>
                <th className="py-2">{tr('common.rol')}</th>
              </tr>
            </thead>
            <tbody>
              {ACCOUNTS.map(a => (
                <tr key={a.username} className="border-t border-surface-100">
                  <td className="py-2 pr-3 font-mono text-surface-900">{a.username}</td>
                  <td className="py-2 pr-3 font-mono text-surface-700">{a.password}</td>
                  <td className="py-2 text-surface-700">{roleLabel(a.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-surface-500">{tr('login.nota_grupos')}</p>
      </Modal>
    </>
  );
};
