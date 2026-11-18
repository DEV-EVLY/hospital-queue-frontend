interface TokenPayload {
  sub?: string;
  role?: string;
  roles?: string[];
  authorities?: (string | { authority: string })[];
  exp?: number;
}

function parseToken(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'DOCTOR' | 'OPERATOR' | 'KIOSK';

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
