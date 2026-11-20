import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { Card, Button } from '../../ui';
import { circuitBreakerApi, getErrorMessage } from '../../../services/api';
import { FormError } from './_shared';
import type { CircuitBreakerStatus } from '../../../types/api';

export const ResilienciaTab: React.FC = () => {
  const [cbStatus, setCbStatus] = useState<CircuitBreakerStatus | null>(null);
  const [pending,  setPending]  = useState<number | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = async () => {
    try { setCbStatus(await circuitBreakerApi.status()); } catch { /* ok */ }
    // Cola offline: solo ADMIN puede consultarla; si falla, se muestra "—"
    try {
      const items = await circuitBreakerApi.offlineItems();
      setPending(items.filter(i => i.status === 'PENDING' || i.status === 'RETRYING').length);
    } catch { setPending(null); }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  const handleSyncNow = async () => {
    setLoading(true);
    setError(null);
    try { await circuitBreakerApi.syncNow(); load(); } catch (e: unknown) {
      setError(`Error al sincronizar: ${getErrorMessage(e)}`);
    } finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try { await circuitBreakerApi.downloadOfflineCsv(); } catch (e: unknown) {
      setError(`Error al descargar: ${getErrorMessage(e)}`);
    } finally { setLoading(false); }
  };

  if (!cbStatus) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-surface-400">
          <AlertTriangle className="w-8 h-8" />
          <p className="text-sm">No se pudo conectar al servicio de integración.</p>
          <Button variant="ghost" size="sm" onClick={load}>Reintentar</Button>
        </div>
      </Card>
    );
  }

  const stateColor =
    cbStatus.state === 'OPEN'      ? 'border-red-300 bg-red-50'
    : cbStatus.state === 'HALF_OPEN' ? 'border-amber-300 bg-amber-50'
    : 'border-green-300 bg-green-50';

  const stateTextColor =
    cbStatus.state === 'OPEN'      ? 'text-red-600'
    : cbStatus.state === 'HALF_OPEN' ? 'text-amber-600'
    : 'text-green-600';

  const stateDesc =
    cbStatus.state === 'OPEN'
      ? 'Circuito Abierto — Modo de contingencia autónomo activo.'
      : cbStatus.state === 'HALF_OPEN'
        ? 'Circuito Semi-abierto — Probando reconexión con HIS.'
        : 'Circuito Cerrado — Operación normal sincronizada con HIS.';

  return (
    <div className="space-y-6">
      <FormError msg={error} onDismiss={() => setError(null)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={`border-2 ${stateColor}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">
            Estado del Circuit Breaker
          </p>
          <div className={`text-4xl font-bold font-mono mb-3 ${stateTextColor}`}>
            {cbStatus.state}
          </div>
          <p className="text-sm text-surface-600 mb-4">{stateDesc}</p>
          <div className="space-y-1.5 text-sm border-t border-surface-200 pt-3">
            <div className="flex justify-between">
              <span className="text-surface-500">Umbral de fallas:</span>
              <span className="font-semibold text-surface-900">{cbStatus.failureThreshold}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Fallas actuales:</span>
              <span className={`font-semibold ${cbStatus.failureCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {cbStatus.failureCount}
              </span>
            </div>
            {cbStatus.openUntil && (
              <div className="flex justify-between">
                <span className="text-surface-500">Abierto hasta:</span>
                <span className="text-surface-700 text-xs">{new Date(cbStatus.openUntil).toLocaleString('es-PE')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-surface-500">Reintento tras:</span>
              <span className="text-surface-700 text-xs">{Math.round(cbStatus.resetTimeoutMs / 1000)} s</span>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">
            Cola Offline Pendiente
          </p>
          <div className="text-4xl font-bold font-mono text-primary-700 mb-1">
            {pending ?? '—'}
            <span className="text-lg font-normal text-surface-500 ml-2">registros</span>
          </div>
          <p className="text-sm text-surface-500 mb-6">
            Transacciones resguardadas en PostgreSQL para reintento automático.
          </p>
          <div className="flex gap-3">
            <Button
              variant="primary" loading={loading} fullWidth
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={handleSyncNow}
            >
              Reintentar Sincronización
            </Button>
            <Button
              variant="secondary" loading={loading} fullWidth
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownload}
            >
              Descargar CSV
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
