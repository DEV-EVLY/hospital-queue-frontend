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

export function getRole(): 'ADMIN' | 'OPERATOR' | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const p = parseToken(token);
  if (!p) return null;

  // Try common Spring Security JWT claim patterns
  if (p.role) return p.role.includes('ADMIN') ? 'ADMIN' : 'OPERATOR';
  if (p.roles?.length) return p.roles.some(r => r.includes('ADMIN')) ? 'ADMIN' : 'OPERATOR';
  if (p.authorities?.length) {
    const hasAdmin = p.authorities.some(a =>
      typeof a === 'string' ? a.includes('ADMIN') : a.authority?.includes('ADMIN')
    );
    return hasAdmin ? 'ADMIN' : 'OPERATOR';
  }
  return null;
}

export function isTokenExpired(): boolean {
  const token = localStorage.getItem('token');
  if (!token) return true;
  const p = parseToken(token);
  if (!p?.exp) return false;
  return Date.now() / 1000 > p.exp;
}
