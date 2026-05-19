import { getBaseURL } from '../api/client';

/** URL absoluta para rutas estáticas del backend (ej. /uploads/avatars/1.png). */
export function resolveMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = getBaseURL().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
