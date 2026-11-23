import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Monitor, Tv, UserCheck, ShieldCheck, Maximize2, Minimize2, LogOut, Activity, Radio } from 'lucide-react';
import { clsx } from 'clsx';
import { getRole } from './services/auth';
import { KioskoDispensador }  from './components/dispensador/KioskoDispensador';
import { ModuloOperador }     from './components/operador/ModuloOperador';
import { PantallaCartelera }  from './components/cartelera/PantallaCartelera';
import { DeviceGate }          from './components/device/DeviceGate';
import { AdminDashboard }     from './components/admin/AdminDashboard';
import { LanguageSelector } from './components/ui';
import { LoginPage }          from './components/auth/LoginPage';
import { tr, useLang } from './i18n';

// ── Guards ────────────────────────────────────────────────────────────────────

function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

function RequireAdmin() {
  const role = getRole();
  if (role !== 'ADMIN' && role !== 'SUPERVISOR') return <Navigate to="/operador" replace />;
  return <Outlet />;
}

// ── Staff layout (nav bar) ────────────────────────────────────────────────────

const STAFF_NAV = [
  { path: '/operador',  icon: UserCheck,   labelKey: 'app.nav_operador' },
  { path: '/admin',     icon: ShieldCheck, labelKey: 'app.nav_admin' },
] as const;

function StaffLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [fullscreen, setFullscreen] = useState(false);

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
            {STAFF_NAV.map(({ path, icon: Icon, labelKey }) => (
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
      navigate(role === 'ADMIN' || role === 'SUPERVISOR' ? '/admin' : '/operador', { replace: true });
    }
  };

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/kiosko" replace />} />

      {/* Public fullscreen terminals — no nav wrapper */}
      <Route path="/kiosko"    element={<DeviceGate type="KIOSK">{(p, t) => <KioskoDispensador profile={p} deviceToken={t} />}</DeviceGate>} />
      <Route path="/cartelera" element={<DeviceGate type="DISPLAY">{p => <PantallaCartelera onExitCartelera={() => {}} profile={p} />}</DeviceGate>} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />

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
