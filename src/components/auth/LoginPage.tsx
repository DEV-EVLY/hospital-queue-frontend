import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, AlertCircle, Activity, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card, LanguageSelector } from '../ui';
import { authApi, getErrorMessage, ApiError } from '../../services/api';
import { DemoCredentials } from './DemoCredentials';
import { tr } from '../../i18n';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(tr('login.ingresa_usuario_y_contrasena'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ username: username.trim(), password });
      if (!res.token) throw new Error(tr('login.respuesta_invalida'));
      localStorage.setItem('token', res.token);
      localStorage.setItem('userId', res.userId);
      onLoginSuccess();
    } catch (err: unknown) {
      // El backend responde 401 sin cuerpo cuando las credenciales son inválidas
      setError(
        err instanceof ApiError && err.status === 401
          ? tr('errors.invalid_credentials')
          : getErrorMessage(err, tr('login.no_se_pudo_iniciar'))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4"><LanguageSelector /></div>

      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-48 -right-48 w-[640px] h-[640px] rounded-full bg-primary-100 opacity-50" />
        <div className="absolute -bottom-48 -left-48 w-[480px] h-[480px] rounded-full bg-health-100 opacity-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-700 shadow-card-md mb-4">
            <Activity size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-surface-900 tracking-tight">{tr('common.sistema_hospitalario')}</h1>
          <p className="text-sm text-surface-500 mt-1">{tr('login.ingrese_sus_credenciales_acceso')}</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label={tr('common.usuario')}
              type="text"
              placeholder={tr('login.nombre_usuario')}
              autoComplete="username"
              autoFocus
              fullWidth
              icon={<User size={15} />}
              value={username}
              onChange={e => { setUsername(e.target.value); if (error) setError(null); }}
              disabled={loading}
            />

            <Input
              label={tr('login.contrasena')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              fullWidth
              icon={<Lock size={15} />}
              iconEnd={
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? tr('login.ocultar_contrasena') : tr('login.mostrar_contrasena')}
                  aria-pressed={showPassword}
                  title={showPassword ? tr('login.ocultar_contrasena') : tr('login.mostrar_contrasena')}
                  className="text-surface-400 hover:text-surface-700 transition-colors flex items-center"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              value={password}
              onChange={e => { setPassword(e.target.value); if (error) setError(null); }}
              disabled={loading}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 p-3"
              >
                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 leading-snug">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              className="mt-1"
            >
              {loading ? tr('login.verificando') : tr('login.ingresar')}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-surface-400 mt-6">
          {tr('login.acceso_restringido_solo_personal_autorizad')}
        </p>
        <div className="flex justify-center mt-3">
          <DemoCredentials />
        </div>
      </motion.div>
    </div>
  );
};
