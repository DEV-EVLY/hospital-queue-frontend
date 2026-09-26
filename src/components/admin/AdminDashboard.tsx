import React, { useState, useEffect } from 'react';
import {
  reportsApi, medicalServicesApi, consultingRoomsApi, priorityRulesApi,
  circuitBreakerApi, usersApi
} from '../../services/api';
import { CircuitBreakerStatus } from '../../types';
import {
  BarChart3, Settings, ShieldAlert, FileSpreadsheet, RefreshCw,
  CheckCircle2, AlertTriangle, Download, ToggleLeft, ToggleRight,
  Activity, Users, Clock, Flame, Plus, Edit2, Trash2, X, Save,
  Building2, Stethoscope, UserCog
} from 'lucide-react';

type TabKey = 'METRICAS' | 'REGLAS' | 'REPORTES' | 'RESILIENCIA' | 'CATALOGO' | 'USUARIOS';

// ── Shared form error banner ──────────────────────────────────────
const FormError: React.FC<{ msg: string | null; onDismiss: () => void }> = ({ msg, onDismiss }) =>
  msg ? (
    <div className="flex items-center justify-between bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-xl px-4 py-2 text-xs font-semibold mb-3">
      <span>{msg}</span>
      <button onClick={onDismiss}><X className="w-3 h-3" /></button>
    </div>
  ) : null;

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'En Espera', CALLED: 'Llamado', IN_ATTENTION: 'En Atención',
  ATTENDED: 'Atendido', NO_SHOW: 'No se Presentó', DERIVED: 'Derivado', CANCELLED: 'Cancelado',
};
const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgente', PREFERENTIAL: 'Preferencial', NORMAL: 'Normal',
};
const CHANNEL_LABELS: Record<string, string> = {
  KIOSK: 'Kiosko', OPERATOR: 'Operador', WEB: 'Web', HIS_AUTO: 'HIS Automático',
};

// ── Empty rule / service blank ────────────────────────────────────
const BLANK_RULE = { code: '', name: '', description: '', condition: '', priorityPoints: 10, maxWaitMinutes: 60 };
const BLANK_SERVICE = { name: '', ticketPrefix: '', iconName: 'stethoscope', estimatedMinutes: 20 };
const BLANK_ROOM = { name: '', code: '', medicalServiceId: '', floor: '', wing: '' };
const BLANK_USER = { username: '', fullName: '', password: '', role: 'OPERATOR' as 'OPERATOR' | 'ADMIN' };

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('METRICAS');

  // ── Data state ────────────────────────────────────────────────
  const [dashboard, setDashboard]   = useState<any>(null);
  const [services, setServices]     = useState<any[]>([]);
  const [rooms, setRooms]           = useState<any[]>([]);
  const [rules, setRules]           = useState<any[]>([]);
  const [cbStatus, setCbStatus]     = useState<CircuitBreakerStatus | null>(null);
  const [userList, setUserList]     = useState<any[]>([]);

  // ── Reports filters ───────────────────────────────────────────
  const [filtroFechaInicio, setFiltroFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [filtroFechaFin, setFiltroFechaFin]       = useState(new Date().toISOString().split('T')[0]);
  const [filtroServicio, setFiltroServicio]        = useState('');
  const [filtroPrioridad, setFiltroPrioridad]      = useState('');
  const [filtroCanal, setFiltroCanal]              = useState('');
  const [reportRows, setReportRows]                = useState<any[]>([]);
  const [loading, setLoading]                      = useState(false);

  // ── M-08 Priority rules CRUD ──────────────────────────────────
  const [showNewRule, setShowNewRule]         = useState(false);
  const [newRule, setNewRule]                 = useState({ ...BLANK_RULE });
  const [editingRuleId, setEditingRuleId]     = useState<string | null>(null);
  const [editingRule, setEditingRule]         = useState<any>(null);
  const [ruleError, setRuleError]             = useState<string | null>(null);

  // ── M-03 Medical services CRUD ────────────────────────────────
  const [showNewService, setShowNewService]   = useState(false);
  const [newService, setNewService]           = useState({ ...BLANK_SERVICE });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingService, setEditingService]   = useState<any>(null);
  const [serviceError, setServiceError]       = useState<string | null>(null);

  // ── M-04 Consulting rooms CRUD ────────────────────────────────
  const [showNewRoom, setShowNewRoom]         = useState(false);
  const [newRoom, setNewRoom]                 = useState({ ...BLANK_ROOM });
  const [editingRoomId, setEditingRoomId]     = useState<string | null>(null);
  const [editingRoom, setEditingRoom]         = useState<any>(null);
  const [roomError, setRoomError]             = useState<string | null>(null);
  const [catalogSubTab, setCatalogSubTab]     = useState<'SERVICIOS' | 'CONSULTORIOS'>('SERVICIOS');

  // ── M-05 Users CRUD ───────────────────────────────────────────
  const [showNewUser, setShowNewUser]         = useState(false);
  const [newUser, setNewUser]                 = useState({ ...BLANK_USER });
  const [editingUserId, setEditingUserId]     = useState<string | null>(null);
  const [editingUser, setEditingUser]         = useState<any>(null);
  const [userError, setUserError]             = useState<string | null>(null);

  // ── Lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    loadDashboard();
    loadRules();
    loadCircuitBreaker();
    loadServices();
    loadRooms();
    loadUsers();

    // A-06: auto-refresh KPI metrics every 30s
    const metricsInterval = setInterval(loadDashboard, 30_000);

    // M-09: auto-retry circuit breaker every 15s when status is unavailable
    const cbInterval = setInterval(() => {
      setCbStatus(prev => { if (prev === null) loadCircuitBreaker(); return prev; });
    }, 15_000);

    return () => { clearInterval(metricsInterval); clearInterval(cbInterval); };
  }, []);

  const loadDashboard = async () => {
    try { setDashboard(await reportsApi.dashboard() as any); } catch { /* ok */ }
  };
  const loadServices = async () => {
    try { setServices(await medicalServicesApi.list() as any[]); } catch { /* ok */ }
  };
  const loadRooms = async () => {
    try { setRooms(await consultingRoomsApi.list() as any[]); } catch { /* ok */ }
  };
  const loadRules = async () => {
    try { setRules(await priorityRulesApi.list() as any[]); } catch { /* ok */ }
  };
  const loadCircuitBreaker = async () => {
    try { setCbStatus(await circuitBreakerApi.status() as CircuitBreakerStatus); } catch { /* ok */ }
  };
  const loadUsers = async () => {
    try { setUserList(await usersApi.list() as any[]); } catch { /* ok */ }
  };

  // ── Reports actions ───────────────────────────────────────────
  const toggleRule = async (id: string) => {
    try {
      await priorityRulesApi.toggle(id);
      setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    } catch (e: any) { setRuleError(`Error al alternar: ${e.message}`); }
  };

  const handleSyncNow = async () => {
    setLoading(true);
    try { await circuitBreakerApi.syncNow(); loadCircuitBreaker(); } catch { /* ok */ } finally { setLoading(false); }
  };

  const runBiQuery = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { startDate: filtroFechaInicio, endDate: filtroFechaFin, format: 'json' };
      if (filtroServicio) params.serviceId = filtroServicio;
      if (filtroPrioridad) params.priorityLevel = filtroPrioridad;
      if (filtroCanal) params.channel = filtroCanal;
      setReportRows(Array.isArray(await reportsApi.export(params) as any[]) ? await reportsApi.export(params) as any[] : []);
    } catch { /* ok */ } finally { setLoading(false); }
  };

  const downloadCsv = async () => {
    setLoading(true);
    try {
      await reportsApi.downloadCsv({
        startDate: filtroFechaInicio, endDate: filtroFechaFin,
        ...(filtroServicio ? { serviceId: filtroServicio } : {}),
        ...(filtroPrioridad ? { priorityLevel: filtroPrioridad } : {}),
        ...(filtroCanal ? { channel: filtroCanal } : {}),
      });
    } catch { /* ok */ } finally { setLoading(false); }
  };

  // ── M-08 Rule CRUD handlers ───────────────────────────────────
  const saveNewRule = async () => {
    if (!newRule.code || !newRule.name || !newRule.condition) {
      setRuleError('Código, nombre y condición son obligatorios.'); return;
    }
    setRuleError(null);
    try {
      const created = await priorityRulesApi.create(newRule);
      setRules(prev => [...prev, created]);
      setNewRule({ ...BLANK_RULE });
      setShowNewRule(false);
    } catch (e: any) { setRuleError(e.message); }
  };

  const saveEditRule = async () => {
    if (!editingRule?.code || !editingRule?.name) { setRuleError('Código y nombre son obligatorios.'); return; }
    setRuleError(null);
    try {
      const updated = await priorityRulesApi.update(editingRuleId!, editingRule);
      setRules(prev => prev.map(r => r.id === editingRuleId ? updated : r));
      setEditingRuleId(null); setEditingRule(null);
    } catch (e: any) { setRuleError(e.message); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('¿Eliminar esta regla de priorización?')) return;
    try {
      await priorityRulesApi.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (e: any) { setRuleError(`Error al eliminar: ${e.message}`); }
  };

  // ── M-03 Service CRUD handlers ────────────────────────────────
  const saveNewService = async () => {
    if (!newService.name || !newService.ticketPrefix) {
      setServiceError('Nombre y prefijo de ticket son obligatorios.'); return;
    }
    setServiceError(null);
    try {
      const created = await medicalServicesApi.create(newService);
      setServices(prev => [...prev, created]);
      setNewService({ ...BLANK_SERVICE });
      setShowNewService(false);
    } catch (e: any) { setServiceError(e.message); }
  };

  const saveEditService = async () => {
    if (!editingService?.name) { setServiceError('El nombre es obligatorio.'); return; }
    setServiceError(null);
    try {
      const updated = await medicalServicesApi.update(editingServiceId!, editingService);
      setServices(prev => prev.map(s => s.id === editingServiceId ? updated : s));
      setEditingServiceId(null); setEditingService(null);
    } catch (e: any) { setServiceError(e.message); }
  };

  const toggleService = async (id: string) => {
    try {
      await medicalServicesApi.toggleActive(id);
      setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    } catch (e: any) { setServiceError(`Error: ${e.message}`); }
  };

  // ── M-04 Room CRUD handlers ───────────────────────────────────
  const saveNewRoom = async () => {
    if (!newRoom.name || !newRoom.code) {
      setRoomError('Nombre y código son obligatorios.'); return;
    }
    setRoomError(null);
    try {
      const created = await consultingRoomsApi.create(newRoom);
      setRooms(prev => [...prev, created]);
      setNewRoom({ ...BLANK_ROOM });
      setShowNewRoom(false);
    } catch (e: any) { setRoomError(e.message); }
  };

  const saveEditRoom = async () => {
    if (!editingRoom?.name) { setRoomError('El nombre es obligatorio.'); return; }
    setRoomError(null);
    try {
      const updated = await consultingRoomsApi.update(editingRoomId!, editingRoom);
      setRooms(prev => prev.map(r => r.id === editingRoomId ? updated : r));
      setEditingRoomId(null); setEditingRoom(null);
    } catch (e: any) { setRoomError(e.message); }
  };

  const toggleRoom = async (id: string) => {
    try {
      await consultingRoomsApi.toggleActive(id);
      setRooms(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    } catch (e: any) { setRoomError(`Error: ${e.message}`); }
  };

  // ── M-05 User CRUD handlers ───────────────────────────────────
  const saveNewUser = async () => {
    if (!newUser.username || !newUser.fullName || !newUser.password) {
      setUserError('Usuario, nombre completo y contraseña son obligatorios.'); return;
    }
    setUserError(null);
    try {
      const created = await usersApi.create(newUser);
      setUserList(prev => [...prev, created]);
      setNewUser({ ...BLANK_USER });
      setShowNewUser(false);
    } catch (e: any) { setUserError(e.message); }
  };

  const saveEditUser = async () => {
    if (!editingUser?.fullName) { setUserError('El nombre completo es obligatorio.'); return; }
    setUserError(null);
    try {
      const updated = await usersApi.update(editingUserId!, { fullName: editingUser.fullName, role: editingUser.role });
      setUserList(prev => prev.map(u => u.id === editingUserId ? updated : u));
      setEditingUserId(null); setEditingUser(null);
    } catch (e: any) { setUserError(e.message); }
  };

  const toggleUser = async (id: string) => {
    try {
      await usersApi.toggleActive(id);
      setUserList(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
    } catch (e: any) { setUserError(`Error: ${e.message}`); }
  };

  const fmtSeconds = (s?: number | null) => s != null ? `${Math.round(s / 60)} min` : '—';

  const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:border-sky-500 focus:outline-none';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans flex flex-col">

      {/* Header */}
      <header className="flex flex-wrap justify-between items-center bg-slate-800/80 border border-slate-700 rounded-3xl p-6 mb-8 shadow-xl gap-4">
        <div className="flex items-center space-x-4">
          <div className="bg-sky-500/20 text-sky-400 p-3 rounded-2xl border border-sky-500/30">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Panel de Administración Hospitalaria</h1>
            <p className="text-sm text-slate-400">Inteligencia de Negocios, Motor de Priorización y Resiliencia</p>
          </div>
        </div>

        <div className="flex flex-wrap bg-slate-900 p-1.5 rounded-2xl border border-slate-700 gap-1">
          {[
            { key: 'METRICAS',    icon: <BarChart3 className="w-4 h-4" />,    label: 'Métricas' },
            { key: 'REGLAS',      icon: <Settings className="w-4 h-4" />,     label: 'Reglas' },
            { key: 'REPORTES',    icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Reportes' },
            { key: 'RESILIENCIA', icon: <ShieldAlert className="w-4 h-4" />,  label: 'Circuit Breaker' },
            { key: 'CATALOGO',    icon: <Stethoscope className="w-4 h-4" />,  label: 'Catálogo' },
            { key: 'USUARIOS',    icon: <UserCog className="w-4 h-4" />,      label: 'Usuarios' },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key as TabKey)}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === key ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}>
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ═══ TAB 1: MÉTRICAS ═══════════════════════════════════════ */}
      {activeTab === 'METRICAS' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard icon={<Users className="w-5 h-5 text-sky-400" />} label="Total Pacientes Hoy"
              value={dashboard?.totalTicketsToday ?? 0} sub="Turnos generados hoy" />
            <KpiCard icon={<Clock className="w-5 h-5 text-amber-400" />} label="En Espera Actual"
              value={dashboard?.waitingCount ?? 0} sub="Pacientes en salas de espera" />
            <KpiCard icon={<Flame className="w-5 h-5 text-rose-400" />} label="Espera Promedio"
              value={`${Math.round(dashboard?.avgWaitTimeMinutes ?? 0)} min`} sub="Desde emisión hasta llamado" />
            <KpiCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} label="Atendidos"
              value={dashboard?.attendedCount ?? 0} sub="Consultas completadas" />
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Volumen por Especialidad Médica</h3>
              <button onClick={loadDashboard} className="text-slate-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-bold uppercase text-xs">
                    <th className="py-3 px-4">Especialidad</th>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Volumen</th>
                    <th className="py-3 px-4">Atendidos</th>
                    <th className="py-3 px-4">T. Espera Prom.</th>
                    <th className="py-3 px-4">T. Atención Prom.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {(dashboard?.serviceBreakdown ?? []).map((s: any) => (
                    <tr key={s.serviceCode} className="hover:bg-slate-700/30 transition-all">
                      <td className="py-4 px-4 font-bold text-white">{s.serviceName}</td>
                      <td className="py-4 px-4 font-mono font-bold text-sky-400">[{s.serviceCode}]</td>
                      <td className="py-4 px-4 font-mono font-bold">{s.totalTickets}</td>
                      <td className="py-4 px-4 font-mono text-emerald-400">{s.attended}</td>
                      <td className="py-4 px-4 font-mono">{Math.round(s.avgWaitMinutes)} min</td>
                      <td className="py-4 px-4 font-mono">{Math.round(s.avgAttentionMinutes)} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: REGLAS (M-08 CRUD) ════════════════════════════ */}
      {activeTab === 'REGLAS' && (
        <div className="space-y-6">
          <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Motor de Priorización Parametrizable</h3>
                <p className="text-sm text-slate-400">Reglas evaluadas en tiempo real al dispensar tickets.</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={loadRules}
                  className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl text-sm font-bold text-slate-200 flex items-center space-x-1">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowNewRule(true); setRuleError(null); }}
                  className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center space-x-2">
                  <Plus className="w-4 h-4" /><span>Nueva Regla</span>
                </button>
              </div>
            </div>

            <FormError msg={ruleError} onDismiss={() => setRuleError(null)} />

            {/* New rule form */}
            {showNewRule && (
              <div className="bg-slate-900/80 border border-sky-500/40 rounded-2xl p-6 mb-6">
                <h4 className="text-sm font-black text-sky-300 mb-4 uppercase tracking-wider">Nueva Regla</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Código *</label>
                    <input className={inputCls} placeholder="PREFERENTIAL_SENIOR"
                      value={newRule.code} onChange={e => setNewRule(r => ({ ...r, code: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Nombre *</label>
                    <input className={inputCls} placeholder="Adulto Mayor"
                      value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Condición *</label>
                    <input className={inputCls} placeholder="elderly == true"
                      value={newRule.condition} onChange={e => setNewRule(r => ({ ...r, condition: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Descripción</label>
                    <input className={inputCls} placeholder="Descripción breve"
                      value={newRule.description} onChange={e => setNewRule(r => ({ ...r, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Puntos de Prioridad</label>
                    <input type="number" className={inputCls} min={1} max={999}
                      value={newRule.priorityPoints} onChange={e => setNewRule(r => ({ ...r, priorityPoints: +e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">SLA Máx. (minutos)</label>
                    <input type="number" className={inputCls} min={1}
                      value={newRule.maxWaitMinutes} onChange={e => setNewRule(r => ({ ...r, maxWaitMinutes: +e.target.value }))} />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button onClick={saveNewRule}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center space-x-2">
                    <Save className="w-4 h-4" /><span>Crear Regla</span>
                  </button>
                  <button onClick={() => { setShowNewRule(false); setNewRule({ ...BLANK_RULE }); }}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-4 py-2 rounded-xl text-sm">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rules.map(r => (
                <div key={r.id} className={`p-6 rounded-3xl border transition-all ${
                  r.active ? 'bg-slate-850 border-sky-500/40' : 'bg-slate-800/40 border-slate-700 opacity-60'
                }`}>
                  {editingRuleId === r.id ? (
                    /* Inline edit form */
                    <div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div><label className="text-xs text-slate-400 block mb-1">Código</label>
                          <input className={inputCls} value={editingRule.code}
                            onChange={e => setEditingRule((p: any) => ({ ...p, code: e.target.value }))} /></div>
                        <div><label className="text-xs text-slate-400 block mb-1">Nombre</label>
                          <input className={inputCls} value={editingRule.name}
                            onChange={e => setEditingRule((p: any) => ({ ...p, name: e.target.value }))} /></div>
                        <div><label className="text-xs text-slate-400 block mb-1">Condición</label>
                          <input className={inputCls} value={editingRule.condition}
                            onChange={e => setEditingRule((p: any) => ({ ...p, condition: e.target.value }))} /></div>
                        <div><label className="text-xs text-slate-400 block mb-1">Descripción</label>
                          <input className={inputCls} value={editingRule.description}
                            onChange={e => setEditingRule((p: any) => ({ ...p, description: e.target.value }))} /></div>
                        <div><label className="text-xs text-slate-400 block mb-1">Puntos</label>
                          <input type="number" className={inputCls} value={editingRule.priorityPoints}
                            onChange={e => setEditingRule((p: any) => ({ ...p, priorityPoints: +e.target.value }))} /></div>
                        <div><label className="text-xs text-slate-400 block mb-1">SLA (min)</label>
                          <input type="number" className={inputCls} value={editingRule.maxWaitMinutes}
                            onChange={e => setEditingRule((p: any) => ({ ...p, maxWaitMinutes: +e.target.value }))} /></div>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={saveEditRule}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1">
                          <Save className="w-3 h-3" /><span>Guardar</span></button>
                        <button onClick={() => { setEditingRuleId(null); setEditingRule(null); }}
                          className="bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/60 px-3 py-1 rounded-full border border-sky-800/40">
                            {r.code}
                          </span>
                          <h4 className="text-lg font-bold text-white mt-2">{r.name}</h4>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button onClick={() => { setEditingRuleId(r.id); setEditingRule({ ...r }); setRuleError(null); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-700">
                            <Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteRule(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700">
                            <Trash2 className="w-4 h-4" /></button>
                          <button onClick={() => toggleRule(r.id)} className="text-slate-300 hover:text-white ml-1">
                            {r.active
                              ? <ToggleRight className="w-8 h-8 text-emerald-400" />
                              : <ToggleLeft className="w-8 h-8 text-slate-500" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">{r.description}</p>
                      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Condición:</span>
                          <span className="font-mono font-bold text-sky-300">{r.condition}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Puntos de Prioridad:</span>
                          <span className="font-mono font-bold text-emerald-400">+{r.priorityPoints} pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">SLA Máximo:</span>
                          <span className="font-mono font-bold text-amber-400">{r.maxWaitMinutes} min</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 3: REPORTES ═══════════════════════════════════════ */}
      {activeTab === 'REPORTES' && (
        <div className="space-y-6">
          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Filtros de Exportación y Análisis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Fecha Inicio</label>
                <input type="date" value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)}
                  className={inputCls} /></div>
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Fecha Fin</label>
                <input type="date" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)}
                  className={inputCls} /></div>
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Servicio</label>
                <select value={filtroServicio} onChange={e => setFiltroServicio(e.target.value)} className={inputCls}>
                  <option value="">Todos los Servicios</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Nivel de Prioridad</label>
                <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)} className={inputCls}>
                  <option value="">Todos</option>
                  <option value="URGENT">Urgente</option>
                  <option value="PREFERENTIAL">Preferencial</option>
                  <option value="NORMAL">Normal</option>
                </select></div>
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Canal</label>
                <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)} className={inputCls}>
                  <option value="">Todos los Canales</option>
                  <option value="KIOSK">Kiosko</option>
                  <option value="OPERATOR">Operador</option>
                  <option value="WEB">Web</option>
                  <option value="HIS_AUTO">HIS Automático</option>
                </select></div>
            </div>
            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-700/60 gap-4">
              <button onClick={runBiQuery} disabled={loading}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-2.5 px-6 rounded-xl text-sm">
                {loading ? 'Consultando...' : 'Aplicar Filtros'}
              </button>
              <button onClick={downloadCsv} disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center space-x-2">
                <Download className="w-4 h-4" /><span>Exportar CSV</span>
              </button>
            </div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Registros: {reportRows.length}
            </h4>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-800 text-slate-400 font-bold uppercase">
                  <tr className="border-b border-slate-700">
                    <th className="py-3 px-3">Ticket</th><th className="py-3 px-3">Servicio</th>
                    <th className="py-3 px-3">Estado</th><th className="py-3 px-3">Prioridad</th>
                    <th className="py-3 px-3">Canal</th><th className="py-3 px-3">T. Espera</th>
                    <th className="py-3 px-3">T. Atención</th><th className="py-3 px-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {reportRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="py-3 px-3 font-mono font-black text-sky-400">{row.ticketCode}</td>
                      <td className="py-3 px-3">{row.medicalServiceName}</td>
                      <td className="py-3 px-3 font-bold">{STATUS_LABELS[row.status] ?? row.status}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.priorityLevel === 'URGENT' ? 'bg-rose-950 text-rose-300'
                          : row.priorityLevel === 'PREFERENTIAL' ? 'bg-amber-950 text-amber-300'
                          : 'bg-slate-700 text-slate-300'}`}>
                          {PRIORITY_LABELS[row.priorityLevel] ?? row.priorityLevel}
                        </span>
                      </td>
                      <td className="py-3 px-3">{CHANNEL_LABELS[row.channel] ?? row.channel}</td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-300">{fmtSeconds(row.waitTimeSeconds)}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-300">{fmtSeconds(row.attentionTimeSeconds)}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{row.reportDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 4: CIRCUIT BREAKER ════════════════════════════════ */}
      {activeTab === 'RESILIENCIA' && (
        <div className="space-y-8">
          {cbStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-8 rounded-3xl border-2 flex flex-col justify-between ${
                cbStatus.state === 'OPEN'      ? 'bg-rose-950/40 border-rose-500'
                : cbStatus.state === 'HALF_OPEN' ? 'bg-amber-950/40 border-amber-500'
                : 'bg-emerald-950/40 border-emerald-500'}`}>
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400">ESTADO DEL CIRCUIT BREAKER</span>
                  <div className={`text-4xl font-black font-mono mt-2 ${
                    cbStatus.state === 'OPEN' ? 'text-rose-400'
                    : cbStatus.state === 'HALF_OPEN' ? 'text-amber-400'
                    : 'text-emerald-400'}`}>{cbStatus.state}</div>
                  <p className="text-xs text-slate-300 mt-2">
                    {cbStatus.state === 'OPEN'
                      ? 'Circuito Abierto — Modo de contingencia autónomo activo.'
                      : 'Circuito Cerrado — Operación normal sincronizada con HIS.'}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-700/60 text-xs text-slate-400 space-y-1">
                  <div>Umbral de fallas: <strong>{cbStatus.failureThreshold}</strong></div>
                  <div>Fallas actuales: <strong>{cbStatus.failures}</strong></div>
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 p-8 rounded-3xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400">COLA OFFLINE PENDIENTE</span>
                  <div className="text-4xl font-black font-mono mt-2 text-sky-400">
                    {cbStatus.pendingOfflineCount} <span className="text-lg">registros</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">
                    Transacciones resguardadas en PostgreSQL para reintento automático.
                  </p>
                </div>
                <div className="mt-6 flex space-x-3">
                  <button disabled={loading} onClick={handleSyncNow}
                    className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4" /><span>Sincronizar Ahora</span>
                  </button>
                  <button disabled={loading}
                    onClick={async () => { setLoading(true); try { await circuitBreakerApi.downloadOfflineCsv(); } catch { /* ok */ } finally { setLoading(false); } }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-2">
                    <Download className="w-4 h-4" /><span>Descargar CSV</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 text-slate-400 py-12 justify-center">
              <AlertTriangle className="w-6 h-6" />
              <span>No se pudo conectar al servicio de integración.</span>
              <button onClick={loadCircuitBreaker} className="text-sky-400 underline text-sm">Reintentar</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 5: CATÁLOGO (M-03 + M-04) ════════════════════════ */}
      {activeTab === 'CATALOGO' && (
        <div className="space-y-6">
          {/* Sub-tab bar */}
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700 w-fit space-x-1">
            {(['SERVICIOS', 'CONSULTORIOS'] as const).map(t => (
              <button key={t} onClick={() => setCatalogSubTab(t)}
                className={`flex items-center space-x-2 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                  catalogSubTab === t ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}>
                {t === 'SERVICIOS' ? <Stethoscope className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                <span>{t === 'SERVICIOS' ? 'Servicios Médicos' : 'Consultorios'}</span>
              </button>
            ))}
          </div>

          {/* ── Servicios médicos ─────────────────────────────────── */}
          {catalogSubTab === 'SERVICIOS' && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Servicios Médicos</h3>
                <div className="flex space-x-2">
                  <button onClick={loadServices}
                    className="bg-slate-700 hover:bg-slate-600 p-2 rounded-xl text-slate-200">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setShowNewService(true); setServiceError(null); }}
                    className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center space-x-2">
                    <Plus className="w-4 h-4" /><span>Nuevo Servicio</span>
                  </button>
                </div>
              </div>

              <FormError msg={serviceError} onDismiss={() => setServiceError(null)} />

              {showNewService && (
                <div className="bg-slate-900/80 border border-sky-500/40 rounded-2xl p-6 mb-6">
                  <h4 className="text-sm font-black text-sky-300 mb-4 uppercase tracking-wider">Nuevo Servicio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div><label className="text-xs text-slate-400 font-bold mb-1 block">Nombre *</label>
                      <input className={inputCls} placeholder="Cardiología"
                        value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} /></div>
                    <div><label className="text-xs text-slate-400 font-bold mb-1 block">Prefijo de Ticket *</label>
                      <input className={inputCls} placeholder="C" maxLength={3}
                        value={newService.ticketPrefix} onChange={e => setNewService(s => ({ ...s, ticketPrefix: e.target.value.toUpperCase() }))} /></div>
                    <div><label className="text-xs text-slate-400 font-bold mb-1 block">Tiempo Est. (min)</label>
                      <input type="number" className={inputCls} min={1}
                        value={newService.estimatedMinutes} onChange={e => setNewService(s => ({ ...s, estimatedMinutes: +e.target.value }))} /></div>
                    <div><label className="text-xs text-slate-400 font-bold mb-1 block">Ícono</label>
                      <select className={inputCls} value={newService.iconName}
                        onChange={e => setNewService(s => ({ ...s, iconName: e.target.value }))}>
                        <option value="stethoscope">Estetoscopio</option>
                        <option value="heart">Corazón</option>
                        <option value="baby">Pediatría</option>
                        <option value="activity">Emergencia</option>
                        <option value="flask-conical">Laboratorio</option>
                      </select></div>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={saveNewService}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center space-x-2">
                      <Save className="w-4 h-4" /><span>Crear</span></button>
                    <button onClick={() => { setShowNewService(false); setNewService({ ...BLANK_SERVICE }); }}
                      className="bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-sm">Cancelar</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead><tr className="border-b border-slate-700 text-slate-400 font-bold uppercase text-xs">
                    <th className="py-3 px-4">Nombre</th><th className="py-3 px-4">Prefijo</th>
                    <th className="py-3 px-4">T. Est.</th><th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Acciones</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {services.map(s => (
                      <tr key={s.id} className="hover:bg-slate-700/30">
                        {editingServiceId === s.id ? (
                          <>
                            <td className="py-3 px-4" colSpan={3}>
                              <div className="grid grid-cols-3 gap-2">
                                <input className={inputCls} value={editingService.name}
                                  onChange={e => setEditingService((p: any) => ({ ...p, name: e.target.value }))} />
                                <input className={inputCls} maxLength={3} value={editingService.ticketPrefix}
                                  onChange={e => setEditingService((p: any) => ({ ...p, ticketPrefix: e.target.value.toUpperCase() }))} />
                                <input type="number" className={inputCls} value={editingService.estimatedMinutes}
                                  onChange={e => setEditingService((p: any) => ({ ...p, estimatedMinutes: +e.target.value }))} />
                              </div>
                            </td>
                            <td className="py-3 px-4"></td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <button onClick={saveEditService}
                                  className="bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1">
                                  <Save className="w-3 h-3" /><span>Guardar</span></button>
                                <button onClick={() => { setEditingServiceId(null); setEditingService(null); }}
                                  className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1.5 rounded-lg">✕</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-4 px-4 font-bold text-white">{s.name}</td>
                            <td className="py-4 px-4 font-mono font-bold text-sky-400">[{s.ticketPrefix}]</td>
                            <td className="py-4 px-4 font-mono">{s.estimatedMinutes} min</td>
                            <td className="py-4 px-4">
                              <button onClick={() => toggleService(s.id)}>
                                {s.active
                                  ? <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-full">Activo</span>
                                  : <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Inactivo</span>}
                              </button>
                            </td>
                            <td className="py-4 px-4">
                              <button onClick={() => { setEditingServiceId(s.id); setEditingService({ ...s }); setServiceError(null); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-700">
                                <Edit2 className="w-4 h-4" /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Consultorios ──────────────────────────────────────── */}
          {catalogSubTab === 'CONSULTORIOS' && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Consultorios</h3>
                <div className="flex space-x-2">
                  <button onClick={loadRooms}
                    className="bg-slate-700 hover:bg-slate-600 p-2 rounded-xl text-slate-200">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setShowNewRoom(true); setRoomError(null); }}
                    className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center space-x-2">
                    <Plus className="w-4 h-4" /><span>Nuevo Consultorio</span>
                  </button>
                </div>
              </div>

              <FormError msg={roomError} onDismiss={() => setRoomError(null)} />

              {showNewRoom && (
                <div className="bg-slate-900/80 border border-sky-500/40 rounded-2xl p-6 mb-6">
                  <h4 className="text-sm font-black text-sky-300 mb-4 uppercase tracking-wider">Nuevo Consultorio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div><label className="text-xs text-slate-400 font-bold mb-1 block">Nombre *</label>
                      <input className={inputCls} placeholder="Consultorio 1"
                        value={newRoom.name} onChange={e => setNewRoom(r => ({ ...r, name: e.target.value }))} /></div>
                    <div><label className="text-xs text-slate-400 font-bold mb-1 block">Código *</label>
                      <input className={inputCls} placeholder="C-01"
                        value={newRoom.code} onChange={e => setNewRoom(r => ({ ...r, code: e.target.value }))} /></div>
                    <div><label className="text-xs text-slate-400 font-bold mb-1 block">Servicio Médico</label>
                      <select className={inputCls} value={newRoom.medicalServiceId}
                        onChange={e => setNewRoom(r => ({ ...r, medicalServiceId: e.target.value }))}>
                        <option value="">Sin asignar</option>
                        {services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select></div>
                    <div><label className="text-xs text-slate-400 font-bold mb-1 block">Piso</label>
                      <input className={inputCls} placeholder="Piso 1"
                        value={newRoom.floor} onChange={e => setNewRoom(r => ({ ...r, floor: e.target.value }))} /></div>
                    <div><label className="text-xs text-slate-400 font-bold mb-1 block">Ala / Pabellón</label>
                      <input className={inputCls} placeholder="Pabellón Central"
                        value={newRoom.wing} onChange={e => setNewRoom(r => ({ ...r, wing: e.target.value }))} /></div>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={saveNewRoom}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center space-x-2">
                      <Save className="w-4 h-4" /><span>Crear</span></button>
                    <button onClick={() => { setShowNewRoom(false); setNewRoom({ ...BLANK_ROOM }); }}
                      className="bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-sm">Cancelar</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead><tr className="border-b border-slate-700 text-slate-400 font-bold uppercase text-xs">
                    <th className="py-3 px-4">Nombre</th><th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Servicio</th><th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4">Estado</th><th className="py-3 px-4">Acciones</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {rooms.map(r => (
                      <tr key={r.id} className="hover:bg-slate-700/30">
                        {editingRoomId === r.id ? (
                          <>
                            <td className="py-3 px-4" colSpan={4}>
                              <div className="grid grid-cols-4 gap-2">
                                <input className={inputCls} value={editingRoom.name}
                                  onChange={e => setEditingRoom((p: any) => ({ ...p, name: e.target.value }))} />
                                <input className={inputCls} value={editingRoom.code}
                                  onChange={e => setEditingRoom((p: any) => ({ ...p, code: e.target.value }))} />
                                <select className={inputCls} value={editingRoom.medicalServiceId || ''}
                                  onChange={e => setEditingRoom((p: any) => ({ ...p, medicalServiceId: e.target.value }))}>
                                  <option value="">Sin asignar</option>
                                  {services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <input className={inputCls} value={editingRoom.floor || ''}
                                  onChange={e => setEditingRoom((p: any) => ({ ...p, floor: e.target.value }))} />
                              </div>
                            </td>
                            <td className="py-3 px-4"></td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <button onClick={saveEditRoom}
                                  className="bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1">
                                  <Save className="w-3 h-3" /><span>Guardar</span></button>
                                <button onClick={() => { setEditingRoomId(null); setEditingRoom(null); }}
                                  className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1.5 rounded-lg">✕</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-4 px-4 font-bold text-white">{r.name}</td>
                            <td className="py-4 px-4 font-mono text-sky-400">{r.code}</td>
                            <td className="py-4 px-4 text-slate-300">
                              {services.find(s => s.id === r.medicalServiceId)?.name || '—'}
                            </td>
                            <td className="py-4 px-4 text-slate-400">{[r.floor, r.wing].filter(Boolean).join(' / ') || '—'}</td>
                            <td className="py-4 px-4">
                              <button onClick={() => toggleRoom(r.id)}>
                                {r.active
                                  ? <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-full">Activo</span>
                                  : <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Inactivo</span>}
                              </button>
                            </td>
                            <td className="py-4 px-4">
                              <button onClick={() => { setEditingRoomId(r.id); setEditingRoom({ ...r }); setRoomError(null); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-700">
                                <Edit2 className="w-4 h-4" /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 6: USUARIOS (M-05) ════════════════════════════════ */}
      {activeTab === 'USUARIOS' && (
        <div className="space-y-6">
          <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Gestión de Usuarios</h3>
                <p className="text-sm text-slate-400">Personal médico y administrativo con acceso al sistema.</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={loadUsers}
                  className="bg-slate-700 hover:bg-slate-600 p-2 rounded-xl text-slate-200">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowNewUser(true); setUserError(null); }}
                  className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center space-x-2">
                  <Plus className="w-4 h-4" /><span>Nuevo Usuario</span>
                </button>
              </div>
            </div>

            <FormError msg={userError} onDismiss={() => setUserError(null)} />

            {showNewUser && (
              <div className="bg-slate-900/80 border border-sky-500/40 rounded-2xl p-6 mb-6">
                <h4 className="text-sm font-black text-sky-300 mb-4 uppercase tracking-wider">Nuevo Usuario</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div><label className="text-xs text-slate-400 font-bold mb-1 block">Usuario (login) *</label>
                    <input className={inputCls} placeholder="dr.garcia"
                      value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} /></div>
                  <div><label className="text-xs text-slate-400 font-bold mb-1 block">Nombre Completo *</label>
                    <input className={inputCls} placeholder="Dr. Juan García"
                      value={newUser.fullName} onChange={e => setNewUser(u => ({ ...u, fullName: e.target.value }))} /></div>
                  <div><label className="text-xs text-slate-400 font-bold mb-1 block">Contraseña Inicial *</label>
                    <input type="password" className={inputCls} placeholder="••••••••"
                      value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} /></div>
                  <div><label className="text-xs text-slate-400 font-bold mb-1 block">Rol</label>
                    <select className={inputCls} value={newUser.role}
                      onChange={e => setNewUser(u => ({ ...u, role: e.target.value as 'OPERATOR' | 'ADMIN' }))}>
                      <option value="OPERATOR">Operador / Médico</option>
                      <option value="ADMIN">Administrador</option>
                    </select></div>
                </div>
                <div className="flex space-x-3">
                  <button onClick={saveNewUser}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center space-x-2">
                    <Save className="w-4 h-4" /><span>Crear Usuario</span></button>
                  <button onClick={() => { setShowNewUser(false); setNewUser({ ...BLANK_USER }); }}
                    className="bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-sm">Cancelar</button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead><tr className="border-b border-slate-700 text-slate-400 font-bold uppercase text-xs">
                  <th className="py-3 px-4">Usuario</th><th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Rol</th><th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-700/50">
                  {userList.map(u => (
                    <tr key={u.id} className="hover:bg-slate-700/30">
                      {editingUserId === u.id ? (
                        <>
                          <td className="py-3 px-4 font-mono text-slate-400">{u.username}</td>
                          <td className="py-3 px-4">
                            <input className={inputCls} value={editingUser.fullName}
                              onChange={e => setEditingUser((p: any) => ({ ...p, fullName: e.target.value }))} />
                          </td>
                          <td className="py-3 px-4">
                            <select className={inputCls} value={editingUser.role}
                              onChange={e => setEditingUser((p: any) => ({ ...p, role: e.target.value }))}>
                              <option value="OPERATOR">Operador</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </td>
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button onClick={saveEditUser}
                                className="bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1">
                                <Save className="w-3 h-3" /><span>Guardar</span></button>
                              <button onClick={() => { setEditingUserId(null); setEditingUser(null); }}
                                className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1.5 rounded-lg">✕</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-4 font-mono font-bold text-sky-300">{u.username}</td>
                          <td className="py-4 px-4 font-bold text-white">{u.fullName}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-950/60 text-purple-300 border border-purple-700/40'
                                : 'bg-sky-950/60 text-sky-300 border border-sky-700/40'}`}>
                              {u.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button onClick={() => toggleUser(u.id)}>
                              {u.active
                                ? <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-full">Activo</span>
                                : <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Inactivo</span>}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <button onClick={() => { setEditingUserId(u.id); setEditingUser({ ...u }); setUserError(null); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-700">
                              <Edit2 className="w-4 h-4" /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Small KPI card ───────────────────────────────────────────── */
const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
}> = ({ icon, label, value, sub }) => (
  <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-3xl">
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {icon}
    </div>
    <div className="text-4xl font-black text-white font-mono">{value}</div>
    <div className="text-xs text-slate-400 mt-2 font-medium">{sub}</div>
  </div>
);
