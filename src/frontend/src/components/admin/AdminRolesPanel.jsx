import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function AdminRolesPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingRoleId, setChangingRoleId] = useState(null);

  async function loadUsers() {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get('/api/users/', {
        params: { skip: 0, limit: 1000 }
      });
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleRoleChange(userId, newRole) {
    setChangingRoleId(userId);
    setError('');
    try {
      const { data } = await api.patch(`/api/users/${userId}/role`, {
        new_role: newRole,
      });
      setUsers(users.map(u => u.id === userId ? data : u));
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cambiar el rol.');
    } finally {
      setChangingRoleId(null);
    }
  }

  return (
    <div className="kodda-admin-page">
      <div className="kodda-section-title">
        <h2>Gestión de roles</h2>
        <p className="kodda-admin-userlist-sub">
          Asignación y cambio de roles de usuarios de la plataforma. Cada usuario puede ser ADMIN o USER.
        </p>
      </div>

      {error ? <p className="kodda-auth-error" style={{ marginBottom: '1rem' }}>{error}</p> : null}

      {loading ? (
        <p className="kodda-auth-muted">Cargando usuarios…</p>
      ) : (
        <section className="kodda-admin-content">
          <div className="kodda-table-wrap">
            <table className="kodda-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol actual</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.username}</strong>
                    </td>
                    <td className="kodda-auth-muted">{u.email}</td>
                    <td>
                      <span className={`kodda-role-badge kodda-role-badge--${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.id === user?.id ? (
                        <span className="kodda-auth-muted" style={{ fontSize: '0.85rem' }}>
                          (Tu cuenta)
                        </span>
                      ) : (
                        <select
                          className="kodda-select-role"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={changingRoleId === u.id}
                          style={{
                            padding: '0.4rem 0.6rem',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            cursor: changingRoleId === u.id ? 'not-allowed' : 'pointer',
                            opacity: changingRoleId === u.id ? 0.6 : 1,
                          }}
                        >
                          <option value="user">Usuario</option>
                          <option value="admin">Administrador</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center' }}>
                      <span className="kodda-auth-muted">No hay usuarios.</span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
