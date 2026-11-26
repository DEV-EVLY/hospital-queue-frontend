import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Badge, Button, Card, Input } from '../../../ui';
import { devicesApi, getErrorMessage } from '../../../../services/api';
import type { DeviceStatus } from '../../../../types/api';
import { tr } from '../../../../i18n';
import { PIN_PATTERN } from './profileForm';

interface Props {
  status: DeviceStatus | null;
  /** Se llama tras cambiar el PIN o desbloquear, para recargar el estado */
  onChanged: () => Promise<void>;
  onError: (message: string | null) => void;
}

const digitsOnly = (v: string) => v.replace(/\D/g, '');

/** PIN compartido para vincular equipos: configurarlo y, si se bloqueó por intentos fallidos, desbloquearlo. */
export const PinCard: React.FC<Props> = ({ status, onChanged, onError }) => {
  const [pin, setPin]               = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [message, setMessage]       = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [unlocking, setUnlocking]   = useState(false);

  const save = async () => {
    setMessage(null);
    if (!PIN_PATTERN.test(pin)) { onError(tr('devices.pin_formato')); return; }
    if (pin !== pinConfirm) { onError(tr('devices.pin_no_coincide')); return; }
    onError(null);
    setSaving(true);
    try {
      await devicesApi.setPin(pin);
      setPin(''); setPinConfirm('');
      setMessage(tr('devices.pin_guardado'));
      await onChanged();
    } catch (e) {
      onError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const unlock = async () => {
    setUnlocking(true);
    try { await devicesApi.resetLock(); await onChanged(); }
    catch (e) { onError(getErrorMessage(e)); }
    finally { setUnlocking(false); }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-50 text-primary-700 rounded-xl border border-primary-100">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-surface-900">{tr('devices.pin_titulo')}</h2>
            <p className="text-xs text-surface-500 max-w-2xl">{tr('devices.pin_desc')}</p>
          </div>
        </div>
        <Badge variant={status?.pinConfigured ? 'success' : 'warning'} dot>
          {status?.pinConfigured ? tr('devices.pin_configurado') : tr('devices.pin_sin_configurar')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <Input label={tr('devices.pin_nuevo')} type="password" inputMode="numeric" autoComplete="new-password"
          maxLength={8} value={pin} onChange={e => setPin(digitsOnly(e.target.value))} fullWidth />
        <Input label={tr('devices.pin_confirmar')} type="password" inputMode="numeric" autoComplete="new-password"
          maxLength={8} value={pinConfirm} onChange={e => setPinConfirm(digitsOnly(e.target.value))} fullWidth />
        <Button loading={saving} disabled={!pin || !pinConfirm} onClick={save}>{tr('devices.pin_guardar')}</Button>
      </div>

      {message && <p className="text-xs font-semibold text-health-700">{message}</p>}

      {status?.locked && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-xs font-semibold text-amber-800">{tr('devices.bloqueado_admin')}</span>
          <Button size="sm" variant="secondary" loading={unlocking} onClick={unlock}>{tr('devices.desbloquear')}</Button>
        </div>
      )}
    </Card>
  );
};
