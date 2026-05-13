import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { KoddaLogo } from './KoddaLogo';
import '../styles/kodda.css';

export default function UserList() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchUsers = useCallback(async () => {
    const { data } = await api.get('/api/users/');
    setUsers(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await fetchUsers();
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.status === 403
              ? 'No tenés permisos para ver esta sección.'
              : 'Error al cargar la lista de usuarios.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchUsers]);

  const patchStatus = async (userId, action, reason) => {
    setActionError(null);
    setBusyId(userId);
    try {
      const body = { action };
      if (reason != null && String(reason).trim() !== '') {
        body.reason = String(reason).trim();
      }
      await api.patch(`/api/users/${userId}/status`, body);
      await fetchUsers();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setActionError(typeof detail === 'string' ? detail : 'No se pudo actualizar el estado del usuario.');
    } finally {
      setBusyId(null);
    }
  };

  const onBlock = (u) => {
    const reason = window.prompt(
      'Motivo del bloqueo (opcional). Se enviará por correo y se mostrará al intentar iniciar sesión:'
    );
    if (reason === null) return;
    void patchStatus(u.id, 'block', reason);
  };

  const onUnblock = (u) => {
    if (!window.confirm(`¿Desbloquear la cuenta de ${u.username}?`)) return;
    void patchStatus(u.id, 'unblock', null);
  };

  // Admin guard — redirect non-admin users to home
  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="kodda-home">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions" aria-label="Acciones principales">
          <div className="kodda-user-chip">
            <span className="kodda-avatar" aria-hidden="true">
              {initial}
            </span>
            <span>{user?.username || 'Usuario'}</span>
          </div>
          <button type="button" className="kodda-btn-ghost" onClick={() => logout()}>
            Salir
          </button>
        </nav>
      </header>

      <main className="kodda-home-main">
        <div className="kodda-section-title">
          <h2>Listado de usuarios</h2>
          <Link to="/" className="kodda-btn-accent-outline">
            ← Volver al inicio
          </Link>
        </div>

        {loading && (
          <div className="kodda-userlist-status">Cargando usuarios…</div>
        )}

        {error && (
          <div className="kodda-auth-error">{error}</div>
        )}

        {!loading && !error && actionError && (
          <div className="kodda-auth-error" style={{ marginBottom: '1rem' }}>{actionError}</div>
        )}

        {!loading && !error && (
          <div className="kodda-table-wrap">
            <table className="kodda-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = user?.id != null && u.id === user.id;
                  const active = u.is_active !== false;
                  const rowBusy = busyId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`kodda-role-badge kodda-role-badge--${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            active ? 'kodda-status-badge kodda-status-badge--active' : 'kodda-status-badge kodda-status-badge--inactive'
                          }
                        >
                          {active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        {isSelf ? (
                          <span className="kodda-auth-muted" style={{ fontSize: '0.85rem' }}>Tu cuenta</span>
                        ) : (
                          <div className="kodda-userlist-actions">
                            {active ? (
                              <button
                                type="button"
                                className="kodda-btn-accent-outline"
                                disabled={rowBusy}
                                onClick={() => onBlock(u)}
                              >
                                {rowBusy ? '…' : 'Bloquear'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="kodda-btn-accent-outline"
                                disabled={rowBusy}
                                onClick={() => onUnblock(u)}
                              >
                                {rowBusy ? '…' : 'Desbloquear'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--kd-mist)' }}>
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="kodda-home-footer">Kodda — moda circular inteligente · Prototipo de producto</footer>
    </div>
  );
}
