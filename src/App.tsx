import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { KioskoDispensador } from './components/dispensador/KioskoDispensador';
import { ModuloOperador } from './components/operador/ModuloOperador';
import { PantallaCartelera } from './components/cartelera/PantallaCartelera';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginPage } from './components/auth/LoginPage';
import { Monitor, Tv, UserCheck, ShieldCheck, Maximize2, Minimize2, LogOut } from 'lucide-react';

export const App: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Read token directly from storage — re-reads on every render after navigation
  const token   = localStorage.getItem('token');
  const pathname = location.pathname;

  // C-03: listen for 401 events from api.ts and force logout
  useEffect(() => {
    const handle401 = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      navigate('/login', { state: { from: location }, replace: true });
    };
    window.addEventListener('auth:unauthorized', handle401);
    return () => window.removeEventListener('auth:unauthorized', handle401);
  }, [navigate, location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/kiosko');
  };

  const handleLoginSuccess = () => {
    // Redirect back to the view the user was trying to access, defaulting to /operador
    const from = (location.state as any)?.from?.pathname;
    navigate(from && from !== '/login' ? from : '/operador', { replace: true });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Public terminals — full-screen, no nav (physical kiosk / TV screen)
  if (pathname === '/cartelera') {
    return (
      <Routes>
        <Route path="/cartelera" element={
          <PantallaCartelera onExitCartelera={() => navigate('/kiosko')} />
        } />
        <Route path="*" element={<Navigate to="/cartelera" replace />} />
      </Routes>
    );
  }

  if (pathname === '/kiosko' || pathname === '/') {
    return (
      <Routes>
        <Route path="/"       element={<Navigate to="/kiosko" replace />} />
        <Route path="/kiosko" element={<KioskoDispensador />} />
        <Route path="*"       element={<Navigate to="/kiosko" replace />} />
      </Routes>
    );
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">

      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap justify-between items-center text-sm shadow-md z-40">
        <div className="flex items-center space-x-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-black text-white tracking-wider text-base">HOSPITAL QUEUE SYSTEM</span>
          <span className="bg-sky-500/20 text-sky-400 text-xs px-2.5 py-0.5 rounded-full font-mono border border-sky-500/30">
            On-Premise 4 Cores / 32GB RAM
          </span>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 space-x-1">
          {[
            { path: '/kiosko',    icon: <Monitor className="w-4 h-4" />,    label: '1. Kiosko Dispensador' },
            { path: '/operador',  icon: <UserCheck className="w-4 h-4" />,  label: '2. Consultorio / Operador' },
            { path: '/cartelera', icon: <Tv className="w-4 h-4" />,         label: '3. Cartelera (Pantallas)' },
            { path: '/admin',     icon: <ShieldCheck className="w-4 h-4" />,label: '4. Admin & BI' },
          ].map(({ path, icon, label }) => (
            <button key={path}
              onClick={() => navigate(path)}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive(path) ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}>
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          {/* B-05: only show logout in protected views where a session is relevant */}
          {token && (pathname === '/operador' || pathname === '/admin') && (
            <button onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all text-xs flex items-center space-x-1"
              title="Cerrar sesión">
              <LogOut className="w-4 h-4" /><span>Salir</span>
            </button>
          )}
          <button onClick={toggleFullscreen}
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all text-xs flex items-center space-x-1"
            title="Pantalla Completa">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'Salir' : 'Full Screen'}</span>
          </button>
        </div>
      </nav>

      <div className="flex-1">
        <Routes>
          <Route path="/"          element={<Navigate to="/kiosko" replace />} />
          <Route path="/kiosko"    element={<KioskoDispensador />} />
          <Route path="/cartelera" element={<PantallaCartelera onExitCartelera={() => navigate('/kiosko')} />} />
          <Route path="/operador"  element={
            token
              ? <ModuloOperador />
              : <Navigate to="/login" state={{ from: location }} replace />
          } />
          <Route path="/admin"     element={
            token
              ? <AdminDashboard />
              : <Navigate to="/login" state={{ from: location }} replace />
          } />
          <Route path="/login"     element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="*"          element={<Navigate to="/kiosko" replace />} />
        </Routes>
      </div>

    </div>
  );
};

export default App;
