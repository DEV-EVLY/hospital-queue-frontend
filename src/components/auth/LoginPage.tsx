import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, AlertCircle, Activity } from 'lucide-react';
import { Button, Input, Card } from '../ui';
import { authApi } from '../../services/api';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Ingresa usuario y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ username: username.trim(), password }) as { token: string; userId?: string };
      if (!res.token) throw new Error('Respuesta inválida del servidor');
      localStorage.setItem('token', res.token);
      if (res.userId) localStorage.setItem('userId', res.userId);
      onLoginSuccess();
    } catch (err: unknown) {
      setError((err as Error).message || 'Credenciales incorrectas. Verifique usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">

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
          <h1 className="text-xl font-bold text-surface-900 tracking-tight">Sistema Hospitalario</h1>
          <p className="text-sm text-surface-500 mt-1">Ingrese sus credenciales de acceso</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Usuario"
              type="text"
              placeholder="nombre.usuario"
              autoComplete="username"
              autoFocus
              fullWidth
              icon={<User size={15} />}
              value={username}
              onChange={e => { setUsername(e.target.value); if (error) setError(null); }}
              disabled={loading}
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              fullWidth
              icon={<Lock size={15} />}
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
              {loading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-surface-400 mt-6">
          Acceso restringido — solo personal autorizado
        </p>
      </motion.div>
    </div>
  );
};
