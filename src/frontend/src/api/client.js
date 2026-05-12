import axios from 'axios';

export const STORAGE_ACCESS = 'access_token';
export const STORAGE_REFRESH = 'refresh_token';

// En desarrollo, sin REACT_APP_API_URL las peticiones van al mismo origen (p. ej. :3000).
// Solo las rutas /api/* se reenvían al backend vía src/setupProxy.js → :8000.
const baseURL =
  (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) ||
  (process.env.NODE_ENV === 'development' ? '' : 'http://localhost:8000');

export const api = axios.create({ baseURL });

let refreshPromise = null;

async function refreshTokens() {
  const refresh = localStorage.getItem(STORAGE_REFRESH);
  if (!refresh) throw new Error('No refresh token');
  const { data } = await axios.post(`${baseURL}/api/auth/refresh`, {
    refresh_token: refresh,
  });
  localStorage.setItem(STORAGE_ACCESS, data.access_token);
  localStorage.setItem(STORAGE_REFRESH, data.refresh_token);
  return data.access_token;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_ACCESS);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (!original || error.response?.status !== 401) {
      return Promise.reject(error);
    }
    if (original._authRetry) {
      return Promise.reject(error);
    }
    const url = original.url || '';
    if (url.includes('/api/auth/login') || url.includes('/api/auth/refresh')) {
      return Promise.reject(error);
    }

    const hasRefresh = localStorage.getItem(STORAGE_REFRESH);
    if (!hasRefresh) {
      return Promise.reject(error);
    }

    original._authRetry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshTokens().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccess = await refreshPromise;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      localStorage.removeItem(STORAGE_ACCESS);
      localStorage.removeItem(STORAGE_REFRESH);
      return Promise.reject(error);
    }
  }
);

export function setTokens(access, refresh) {
  localStorage.setItem(STORAGE_ACCESS, access);
  localStorage.setItem(STORAGE_REFRESH, refresh);
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
}

export function getBaseURL() {
  return baseURL;
}
