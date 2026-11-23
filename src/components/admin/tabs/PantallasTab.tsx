import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, MonitorSmartphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Input, Modal, Select, Spinner } from '../../ui';
import { devicesApi, getErrorMessage, medicalServicesApi, userGroupsApi } from '../../../services/api';
import type {
  DeviceAuditEntry, DeviceProfile, DeviceProfileRequest, DeviceStatus, DeviceType, MedicalService, UserGroup,
} from '../../../types/api';
import { LANGUAGES, formatDate, formatTime, tr, trp } from '../../../i18n';
import { FormError, TD, TH } from './_shared';

const PIN_RE = /^[0-9]{4,8}$/;
const TYPES: DeviceType[] = ['KIOSK', 'DISPLAY'];

const emptyForm = (): DeviceProfileRequest => ({
  name: '', type: 'KIOSK', language: 'es', active: true, serviceIds: [],
});

export const PantallasTab: React.FC = () => {
  const [status, setStatus]     = useState<DeviceStatus | null>(null);
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [groups, setGroups]     = useState<UserGroup[]>([]);
  const [audit, setAudit]       = useState<DeviceAuditEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // PIN
  const [pin, setPin]           = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinMsg, setPinMsg]     = useState<string | null>(null);
  const [pinBusy, setPinBusy]   = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Perfil (modal)
  const [editing, setEditing]   = useState<DeviceProfile | 'new' | null>(null);
  const [form, setForm]         = useState<DeviceProfileRequest>(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [groupPick, setGroupPick] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [st, pr, sv, gr, au] = await Promise.all([
        devicesApi.status(), devicesApi.profiles(), medicalServicesApi.list(),
        userGroupsApi.list(), devicesApi.audit(30),
      ]);
      setStatus(st); setProfiles(pr); setServices(sv); setGroups(gr); setAudit(au);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const serviceName = (id: string) => services.find(s => s.id === id)?.name ?? id;

  // ── PIN ──
  const savePin = async () => {
    setPinMsg(null);
    if (!PIN_RE.test(pin)) { setError(tr('devices.pin_formato')); return; }
    if (pin !== pinConfirm) { setError(tr('devices.pin_no_coincide')); return; }
    setError(null);
    setPinBusy(true);
    try {
      await devicesApi.setPin(pin);
      setPin(''); setPinConfirm('');
      setPinMsg(tr('devices.pin_guardado'));
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setPinBusy(false);
    }
  };

  const resetLock = async () => {
    setUnlocking(true);
    try {
      await devicesApi.resetLock();
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUnlocking(false);
    }
  };

  /** ¿Dejar este perfil activo de este tipo reabre (modo abierto) todas las pantallas de ese tipo? */
  const isLastActive = (p: DeviceProfile): boolean =>
    p.active && profiles.filter(x => x.active && x.type === p.type).length === 1;

  // ── Perfiles ──
  const openNew = () => { setForm(emptyForm()); setGroupPick(''); setEditing('new'); };
  const openEdit = (p: DeviceProfile) => {
    setForm({ name: p.name, type: p.type, language: p.language, active: p.active, serviceIds: [...p.serviceIds] });
    setGroupPick('');
    setEditing(p);
  };

  const toggleService = (id: string) =>
    setForm(f => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter(x => x !== id) : [...f.serviceIds, id],
    }));

  /** Copia los servicios del grupo elegido al perfil (el perfil no queda ligado al grupo). */
  const addGroupServices = (groupId: string) => {
    setGroupPick(groupId);
    const g = groups.find(x => x.id === groupId);
    if (!g) return;
    setForm(f => ({ ...f, serviceIds: Array.from(new Set([...f.serviceIds, ...g.serviceIds])) }));
    setGroupPick('');
  };

  const saveProfile = async () => {
    if (!form.name.trim()) { setError(tr('errors.name_required')); return; }
    // Desactivar o cambiar de tipo el último perfil activo devuelve esas pantallas al modo abierto
    if (editing && editing !== 'new' && isLastActive(editing) && (!form.active || form.type !== editing.type)) {
      if (!confirm(tr('devices.ultimo_perfil_confirm', { type: tr(`devices.tipo.${editing.type}`) }))) return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: DeviceProfileRequest = { ...form, name: form.name.trim() };
      if (editing === 'new') await devicesApi.create(body);
      else if (editing) await devicesApi.update(editing.id, body);
      setEditing(null);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const removeProfile = async (p: DeviceProfile) => {
    if (isLastActive(p) && !confirm(tr('devices.ultimo_perfil_confirm', { type: tr(`devices.tipo.${p.type}`) }))) return;
    if (!confirm(tr('devices.eliminar_confirm', { name: p.name }))) return;
    try {
      await devicesApi.remove(p.id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const langLabel = (code: string) => LANGUAGES.find(l => l.code === code)?.label ?? code;

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="flex flex-col gap-6">
      <FormError msg={error} onDismiss={() => setError(null)} />

      {/* ── PIN ── */}
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
            maxLength={8} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} fullWidth />
          <Input label={tr('devices.pin_confirmar')} type="password" inputMode="numeric" autoComplete="new-password"
            maxLength={8} value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))} fullWidth />
          <Button loading={pinBusy} disabled={!pin || !pinConfirm} onClick={savePin}>{tr('devices.pin_guardar')}</Button>
        </div>
        {pinMsg && <p className="text-xs font-semibold text-health-700">{pinMsg}</p>}
        {status?.locked && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-amber-800">{tr('devices.bloqueado_admin')}</span>
            <Button size="sm" variant="secondary" loading={unlocking} onClick={resetLock}>{tr('devices.desbloquear')}</Button>
          </div>
        )}
      </Card>

      {/* ── Perfiles ── */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 text-primary-700 rounded-xl border border-primary-100">
              <MonitorSmartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">{tr('devices.perfiles_titulo')}</h2>
              <p className="text-xs text-surface-500 max-w-2xl">{tr('devices.perfiles_desc')}</p>
            </div>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>{tr('devices.nuevo_perfil')}</Button>
        </div>

        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {tr('devices.modo_abierto')}
        </p>

        {profiles.length === 0 ? (
          <p className="text-sm text-surface-500 py-6 text-center">{tr('devices.sin_perfiles')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <TH>{tr('common.nombre')}</TH>
                  <TH>{tr('devices.tipo')}</TH>
                  <TH>{tr('devices.idioma')}</TH>
                  <TH>{tr('devices.servicios')}</TH>
                  <TH>{tr('common.estado')}</TH>
                  <TH className="text-right">{tr('common.acciones')}</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-surface-50">
                    <TD className="font-semibold text-surface-900">{p.name}</TD>
                    <TD>{tr(`devices.tipo.${p.type}`)}</TD>
                    <TD>{langLabel(p.language)}</TD>
                    <TD>
                      {p.serviceIds.length === 0
                        ? tr('devices.todos_servicios')
                        : <span title={p.serviceIds.map(serviceName).join(', ')}>{trp('devices.n_servicios', p.serviceIds.length)}</span>}
                    </TD>
                    <TD>
                      <Badge variant={p.active ? 'success' : 'gray'}>
                        {p.active ? tr('common.activo') : tr('common.inactivo')}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => openEdit(p)}>
                          {tr('devices.editar')}
                        </Button>
                        <Button size="sm" variant="ghost" icon={<Trash2 className="w-4 h-4 text-red-600" />} onClick={() => removeProfile(p)}>
                          {tr('devices.eliminar')}
                        </Button>
                      </div>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Actividad ── */}
      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-surface-900">{tr('devices.actividad')}</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-surface-500">{tr('devices.sin_actividad')}</p>
        ) : (
          <ul className="divide-y divide-surface-100 text-sm">
            {audit.map(a => (
              <li key={a.id} className="py-2 flex items-center justify-between gap-4">
                <span className="text-surface-800">
                  <span className="font-semibold">{tr(`devices.evento.${a.event}`)}</span>
                  {a.profileName && <span className="text-surface-500"> · {a.profileName}</span>}
                  {a.detail && <span className="text-surface-400"> · {a.detail}</span>}
                </span>
                <span className="text-xs font-mono text-surface-500 whitespace-nowrap">
                  {formatDate(new Date(a.createdAt), { day: '2-digit', month: '2-digit', year: 'numeric' })} {formatTime(a.createdAt, true)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Modal de perfil ── */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? tr('devices.nuevo_perfil') : tr('devices.editar_perfil')}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>{tr('common.cancelar')}</Button>
            <Button loading={saving} onClick={saveProfile}>{tr('devices.guardar')}</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <FormError msg={error} onDismiss={() => setError(null)} />
          <Input label={tr('common.nombre')} value={form.name} maxLength={100} fullWidth
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label={tr('devices.tipo')} value={form.type}
              options={TYPES.map(t => ({ value: t, label: tr(`devices.tipo.${t}`) }))}
              onChange={v => setForm(f => ({ ...f, type: v as DeviceType }))} />
            <Select label={tr('devices.idioma')} value={form.language}
              options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
              onChange={v => setForm(f => ({ ...f, language: v }))} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-surface-700">{tr('devices.servicios')}</span>
              <span className="text-xs text-surface-500">
                {form.serviceIds.length === 0 ? tr('devices.todos_servicios') : trp('devices.n_servicios', form.serviceIds.length)}
              </span>
            </div>
            <p className="text-xs text-surface-500">{tr('devices.servicios_ayuda')}</p>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border border-surface-200 rounded-lg p-2">
              {services.filter(s => s.active || form.serviceIds.includes(s.id)).map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-surface-800 cursor-pointer px-2 py-1 rounded hover:bg-surface-50">
                  <input type="checkbox" checked={form.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
            {groups.some(g => g.serviceIds.length > 0) && (
              <Select label={tr('devices.agregar_grupo')} value={groupPick}
                placeholder={tr('devices.elegir_grupo')}
                options={groups.filter(g => g.serviceIds.length > 0).map(g => ({ value: g.id, label: g.name }))}
                onChange={addGroupServices} />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-surface-800 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            {tr('common.activo')}
          </label>
        </div>
      </Modal>
    </div>
  );
};
