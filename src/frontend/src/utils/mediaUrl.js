import { getBaseURL } from '../api/client';

/** URL absoluta para rutas estáticas del backend (ej. /uploads/avatars/1.png). */
export function resolveMediaUrl(path, cacheBust) {
  if (!path) return null;
  let url;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    url = path;
  } else {
    const base = getBaseURL().replace(/\/$/, '');
    url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
  if (cacheBust != null && cacheBust !== '') {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}v=${encodeURIComponent(String(cacheBust))}`;
  }
  return url;
}
