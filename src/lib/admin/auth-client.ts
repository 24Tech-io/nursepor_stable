// Client-side auth utilities
export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('adminToken='))
    ?.split('=')[1];
  return token || null;
}

export function parseJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export function getAdminUser(): any {
  const token = getTokenFromCookie();
  if (!token) return null;

  const decoded = parseJWT(token);
  if (!decoded || decoded.role !== 'admin') return null;

  return {
    id: decoded.id,
    name: decoded.name,
    email: decoded.email,
    role: decoded.role,
    isActive: decoded.isActive,
  };
}
