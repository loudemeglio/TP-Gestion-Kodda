import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      try {
        const { data } = await api.get('/api/users/');
        if (!cancelled) setUsers(data);
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
    fetchUsers();
    return () => { cancelled = true; };
  }, []);

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

        {!loading && !error && (
          <div className="kodda-table-wrap">
            <table className="kodda-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`kodda-role-badge kodda-role-badge--${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--kd-mist)' }}>
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
