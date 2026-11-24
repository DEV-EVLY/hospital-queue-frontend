interface TokenPayload {
  sub?: string;
  role?: string;
  roles?: string[];
  authorities?: (string | { authority: string })[];
  exp?: number;
  /** Servicios que el usuario puede atender (solo roles restringidos; el gateway los reenvía al servidor). */
  services?: string[];
  username?: string;
  fullName?: string;
}

function parseToken(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

import type { Role } from '../types/api';

export type UserRole = Role;

const VALID_ROLES: UserRole[] = ['ADMIN', 'SUPERVISOR', 'DOCTOR', 'OPERATOR', 'KIOSK'];

export function getRole(): UserRole | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const p = parseToken(token);
  if (!p) return null;

  let raw: string | null = null;
  if (p.role) {
    raw = p.role;
  } else if (p.roles?.length) {
    raw = p.roles[0];
  } else if (p.authorities?.length) {
    const a = p.authorities[0];
    raw = typeof a === 'string' ? a : (a.authority ?? null);
  }

  if (!raw) return null;
  const normalized = raw.replace(/^ROLE_/, '').toUpperCase() as UserRole;
  return VALID_ROLES.includes(normalized) ? normalized : null;
}

/**
 * Servicios que el usuario puede atender según sus grupos. `null` = sin restricción (ADMIN / SUPERVISOR).
 * Es solo para la interfaz (ocultar lo que no puede usar): quien lo hace cumplir es el servidor.
 */
export function getAllowedServiceIds(): string[] | null {
  const role = getRole();
  if (role === 'ADMIN' || role === 'SUPERVISOR') return null;
  const token = localStorage.getItem('token');
  return (token && parseToken(token)?.services) || [];
}

export interface SessionUser { username: string; fullName: string; role: UserRole }

/** Quién tiene la sesión abierta, según el token (el servidor lo firmó al iniciar sesión). */
export function getSessionUser(): SessionUser | null {
  const token = localStorage.getItem('token');
  const role = getRole();
  const p = token ? parseToken(token) : null;
  if (!p || !role) return null;
  const username = p.username ?? '';
  return { username, fullName: p.fullName?.trim() || username, role };
}

export function getUserId(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return parseToken(token)?.sub ?? null;
}

export function isTokenExpired(): boolean {
  const token = localStorage.getItem('token');
  if (!token) return true;
  const p = parseToken(token);
  if (!p?.exp) return false;
  return Date.now() / 1000 > p.exp;
}
