import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { api, clearTokens, getBaseURL, setTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const bumpAvatarVersion = useCallback(() => {
    setAvatarVersion((v) => v + 1);
  }, []);

  const loadMe = useCallback(async () => {
    const access = localStorage.getItem('access_token');
    if (!access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data);
    } catch (err) {
      if (err.response?.status === 401) {
        clearTokens();
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (username, password) => {
    const baseURL = getBaseURL();
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const { data } = await axios.post(`${baseURL}/api/auth/login`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    setTokens(data.access_token, data.refresh_token);
    const me = await api.get('/api/auth/me');
    setUser(me.data);
  }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('refresh_token');
    try {
      if (refresh) {
        await api.post('/api/auth/logout', { refresh_token: refresh });
      }
    } catch {
      // ignorar errores de red al cerrar sesión
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      setUser,
      reloadUser: loadMe,
      avatarVersion,
      bumpAvatarVersion,
    }),
    [user, loading, login, logout, loadMe, avatarVersion, bumpAvatarVersion]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
