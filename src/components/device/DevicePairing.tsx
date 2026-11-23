import React, { useEffect, useState } from 'react';
import { Delete, Lock, MonitorSmartphone } from 'lucide-react';
import { Button } from '../ui';
import { ApiError, devicesApi, getErrorMessage } from '../../services/api';
import type { DeviceProfile, DeviceType } from '../../types/api';
import type { PairedDevice } from '../../services/devicePairing';
import { tr } from '../../i18n';

interface Props {
  type: DeviceType;
  /** Perfil con el que está vinculado el equipo ahora (si lo hay). */
  current: DeviceProfile | null;
  onPaired: (device: PairedDevice) => void;
  onUnpair?: () => void;
  onClose?: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
const MAX_PIN = 8;

/**
 * Flujo de vinculación: PIN → elegir perfil. El teclado en pantalla permite usarlo en un kiosko táctil.
 * El PIN solo sirve para obtener un token de corta duración; no se guarda en el equipo.
 */
export const DevicePairing: React.FC<Props> = ({ type, current, onPaired, onUnpair, onClose }) => {
  const [token, setToken]       = useState<string | null>(null);
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [selected, setSelected] = useState<string | null>(current?.id ?? null);
  const [pin, setPin]           = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [lockLeft, setLockLeft] = useState(0);

  // Cuenta regresiva del bloqueo por intentos fallidos
  useEffect(() => {
    if (lockLeft <= 0) return;
    const id = setTimeout(() => setLockLeft(n => n - 1), 1000);
    return () => clearTimeout(id);
  }, [lockLeft]);

  const press = (d: string) => { setError(null); setPin(p => (p.length < MAX_PIN ? p + d : p)); };

  const submitPin = async () => {
    if (pin.length < 4 || busy || lockLeft > 0) return;
    setBusy(true);
    setError(null);
    try {
      const { token: t } = await devicesApi.unlock(pin);
      const list = await devicesApi.available(t, type);
      setToken(t);
      setProfiles(list);
    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
      if (e instanceof ApiError && e.status === 429) {
        const secs = Number(msg.match(/\d+/)?.[0] ?? 60);
        setLockLeft(secs);
      }
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  const submitPair = async () => {
    if (!token || !selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { profile, token: deviceToken } = await devicesApi.pair(token, selected);
      onPaired({ profile, token: deviceToken });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-surface-200 p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary-50 text-primary-700 rounded-xl border border-primary-100">
          {token ? <MonitorSmartphone className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
        </div>
        <div>
          <h2 className="text-lg font-bold text-surface-900">{tr('devices.vincular_titulo')}</h2>
          <p className="text-xs text-surface-500">{tr(`devices.tipo.${type}`)}</p>
        </div>
      </div>

      {current && (
        <p className="text-xs font-semibold text-health-700 bg-health-50 border border-health-100 rounded-lg px-3 py-2">
          {tr('devices.vinculado_a', { name: current.name })}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!token ? (
        <>
          <p className="text-sm text-surface-600">{tr('devices.ingrese_pin')}</p>
          <div
            aria-label={tr('devices.pin_label')}
            className="h-12 rounded-xl border border-surface-200 bg-surface-50 flex items-center justify-center gap-2.5"
          >
            {pin.length === 0
              ? <span className="text-sm text-surface-400">{tr('devices.pin_label')}</span>
              : Array.from({ length: pin.length }).map((_, i) => (
                  <span key={i} className="w-3 h-3 rounded-full bg-surface-800" />
                ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map(k => (
              <button key={k} type="button" onClick={() => press(k)}
                className="h-14 rounded-xl bg-surface-50 border border-surface-200 text-xl font-bold text-surface-800 active:bg-surface-200">
                {k}
              </button>
            ))}
            <span />
            <button type="button" onClick={() => press('0')}
              className="h-14 rounded-xl bg-surface-50 border border-surface-200 text-xl font-bold text-surface-800 active:bg-surface-200">
              0
            </button>
            <button type="button" onClick={() => setPin(p => p.slice(0, -1))} aria-label="⌫"
              className="h-14 rounded-xl bg-surface-50 border border-surface-200 flex items-center justify-center text-surface-600 active:bg-surface-200">
              <Delete className="w-6 h-6" />
            </button>
          </div>
          <div className="flex gap-2">
            {onClose && <Button variant="secondary" fullWidth onClick={onClose}>{tr('devices.cerrar')}</Button>}
            <Button fullWidth loading={busy} disabled={pin.length < 4 || lockLeft > 0} onClick={submitPin}>
              {lockLeft > 0 ? tr('devices.bloqueado', { n: lockLeft }) : tr('devices.continuar')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-surface-600">{tr('devices.elegir_perfil')}</p>
          {profiles.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {tr('devices.sin_perfiles_disponibles')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {profiles.map(p => (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelected(p.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                      selected === p.id ? 'border-primary-600 bg-primary-50' : 'border-surface-200 hover:border-surface-300'}`}>
                    <span className="block font-bold text-surface-900">{p.name}</span>
                    <span className="block text-xs text-surface-500">
                      {p.serviceIds.length === 0
                        ? tr('devices.todos_servicios')
                        : `${p.serviceIds.length} · ${tr('devices.servicios')}`}
                      {' · '}{p.language.toUpperCase()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2">
            <Button fullWidth loading={busy} disabled={!selected} onClick={submitPair}>{tr('devices.vincular')}</Button>
            <div className="flex gap-2">
              {onClose && <Button variant="secondary" fullWidth onClick={onClose}>{tr('devices.cerrar')}</Button>}
              {current && onUnpair && (
                <Button variant="danger" fullWidth onClick={onUnpair}>{tr('devices.desvincular')}</Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
