import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Monitor, Tv, UserCheck, ShieldCheck, Maximize2, Minimize2, LogOut, Activity, Radio } from 'lucide-react';
import { clsx } from 'clsx';
import { getRole, getSessionUser, isTokenExpired } from './services/auth';
import type { Role } from './types/api';
import { KioskoDispensador }  from './components/dispensador/KioskoDispensador';
import { ModuloOperador }     from './components/operador/ModuloOperador';
import { PantallaCartelera }  from './components/cartelera/PantallaCartelera';
import { DeviceGate }          from './components/device/DeviceGate';
import { AdminDashboard }     from './components/admin/AdminDashboard';
import { LanguageSelector } from './components/ui';
import { LoginPage }          from './components/auth/LoginPage';
import { tr, useLang, roleLabel } from './i18n';

// ── Guards ────────────────────────────────────────────────────────────────────

/** Página de inicio de cada rol tras autenticarse. */
const homeFor = (role: ReturnType<typeof getRole>): string =>
  role === 'ADMIN' || role === 'SUPERVISOR' ? '/admin' : '/operador';

/** ¿Hay una sesión utilizable? Un token vencido cuenta como no tener sesión (y se limpia). */
function hasValidSession(): boolean {
  if (!localStorage.getItem('token')) return false;
  if (isTokenExpired()) {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    return false;
  }
  return true;
}

function RequireAuth() {
  const location = useLocation();
  if (!hasValidSession()) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

/** Con una sesión vigente, /login lleva directo a la página del rol en vez de pedir credenciales otra vez. */
function LoginRoute({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  if (hasValidSession()) return <Navigate to={homeFor(getRole())} replace />;
  return <LoginPage onLoginSuccess={onLoginSuccess} />;
}

function RequireAdmin() {
  const role = getRole();
  if (role !== 'ADMIN' && role !== 'SUPERVISOR') return <Navigate to="/operador" replace />;
  return <Outlet />;
}

// ── Staff layout (nav bar) ────────────────────────────────────────────────────

const ROLE_CHIP: Record<Role, string> = {
  ADMIN:      'bg-primary-100 text-primary-800',
  SUPERVISOR: 'bg-amber-100 text-amber-800',
  DOCTOR:     'bg-health-100 text-health-800',
  OPERATOR:   'bg-surface-200 text-surface-700',
  KIOSK:      'bg-surface-200 text-surface-700',
};

/** Quién está conectado: nombre, usuario y rol, para saber con qué cuenta se está operando. */
function UserBadge() {
  const user = getSessionUser();
  if (!user) return null;
  const initials = user.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  const who = tr('app.sesion_iniciada_como', { name: user.fullName, role: roleLabel(user.role) });
  return (
    <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg bg-surface-50 border border-surface-200" title={`${who} · ${user.username}`}>
      <span aria-hidden className="w-7 h-7 rounded-full bg-primary-700 text-white text-[11px] font-bold flex items-center justify-center">{initials}</span>
      <span className="hidden sm:flex flex-col leading-tight max-w-[160px]">
        <span className="text-xs font-semibold text-surface-900 truncate">{user.fullName}</span>
        <span className="text-[10px] text-surface-500 truncate">@{user.username}</span>
      </span>
      <span className={clsx('text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', ROLE_CHIP[user.role])}>{roleLabel(user.role)}</span>
    </div>
  );
}

const STAFF_NAV = [
  { path: '/operador',  icon: UserCheck,   labelKey: 'app.nav_operador' },
  { path: '/admin',     icon: ShieldCheck, labelKey: 'app.nav_admin' },
] as const;

function StaffLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [fullscreen, setFullscreen] = useState(false);

  const role = getRole();
  const isAdminRole = role === 'ADMIN' || role === 'SUPERVISOR';
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <header className="bg-white border-b border-surface-200 shadow-card z-40 sticky top-0">
        <div className="flex items-center justify-between px-5 h-14 gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-bold text-surface-900 text-sm hidden sm:block">{tr('common.sistema_hospitalario')}</span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 bg-surface-100 rounded-xl p-1">
            {/* Public terminals — open in new tab so auth users can demo them */}
            <button
              onClick={() => window.open('/kiosko', '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 select-none text-surface-500 hover:text-surface-700 hover:bg-surface-50"
            >
              <Monitor size={14} />
              <span className="hidden md:block">{tr('common.kiosko')}</span>
            </button>
            <button
              onClick={() => window.open('/cartelera', '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 select-none text-surface-500 hover:text-surface-700 hover:bg-surface-50"
            >
              <Tv size={14} />
              <span className="hidden md:block">{tr('app.cartelera')}</span>
            </button>

            {/* Staff routes */}
            {STAFF_NAV.filter(n => n.path !== '/admin' || isAdminRole).map(({ path, icon: Icon, labelKey }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 select-none',
                  isActive(path)
                    ? 'bg-white text-surface-900 shadow-card'
                    : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50',
                )}
              >
                <Icon size={14} />
                <span className="hidden md:block">{tr(labelKey)}</span>
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageSelector />
            <UserBadge />
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-50 border border-surface-200">
              <Radio size={12} className="text-health-500" />
              <span className="text-xs font-medium text-health-700 hidden sm:block">{tr('app.vivo')}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              title={tr('app.cerrar_sesion')}
            >
              <LogOut size={14} />
              <span className="hidden sm:block">{tr('app.salir')}</span>
            </motion.button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
              title={fullscreen ? tr('app.salir_pantalla_completa') : tr('app.pantalla_completa')}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  // Suscribe toda la aplicación al idioma: al cambiarlo se vuelve a renderizar el árbol sin perder estado
  useLang();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handle401 = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      const staff = location.pathname.startsWith('/operador') || location.pathname.startsWith('/admin');
      navigate('/login', { state: staff ? { from: location } : undefined, replace: true });
    };
    window.addEventListener('auth:unauthorized', handle401);
    return () => window.removeEventListener('auth:unauthorized', handle401);
  }, [navigate, location]);

  const handleLoginSuccess = () => {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    // Only return to staff routes; public terminals (/kiosko, /cartelera) must never hijack the post-login landing
    if (from && (from.startsWith('/operador') || from.startsWith('/admin'))) {
      navigate(from, { replace: true });
    } else {
      const role = getRole();
      navigate(homeFor(role), { replace: true });
    }
  };

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/kiosko" replace />} />

      {/* Public fullscreen terminals — no nav wrapper */}
      <Route path="/kiosko"    element={<DeviceGate type="KIOSK">{(p, t) => <KioskoDispensador profile={p} deviceToken={t} />}</DeviceGate>} />
      <Route path="/cartelera" element={<DeviceGate type="DISPLAY">{p => <PantallaCartelera profile={p} />}</DeviceGate>} />

      {/* Auth */}
      <Route path="/login" element={<LoginRoute onLoginSuccess={handleLoginSuccess} />} />

      {/* Staff area — requires valid token */}
      <Route element={<RequireAuth />}>
        <Route element={<StaffLayout />}>
          <Route path="/operador" element={<ModuloOperador />} />

          {/* Admin area — additionally requires ADMIN role */}
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/kiosko" replace />} />
    </Routes>
  );
};

export default App;
