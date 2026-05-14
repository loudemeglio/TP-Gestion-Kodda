import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function UserList() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [blockModalUser, setBlockModalUser] = useState(null);
  const [blockReasonDraft, setBlockReasonDraft] = useState('');
  const [unblockModalUser, setUnblockModalUser] = useState(null);

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

  const openBlockModal = (u) => {
    setBlockReasonDraft('');
    setBlockModalUser(u);
  };

  const closeBlockModal = () => {
    setBlockModalUser(null);
    setBlockReasonDraft('');
  };

  const confirmBlock = () => {
    if (!blockModalUser) return;
    const uid = blockModalUser.id;
    const reason = blockReasonDraft;
    closeBlockModal();
    void patchStatus(uid, 'block', reason);
  };

  const openUnblockModal = (u) => setUnblockModalUser(u);

  const confirmUnblock = () => {
    if (!unblockModalUser) return;
    const uid = unblockModalUser.id;
    setUnblockModalUser(null);
    void patchStatus(uid, 'unblock', null);
  };

  // Admin guard — redirect non-admin users to home
  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="kodda-admin-page">
        <div className="kodda-section-title kodda-admin-userlist-head">
          <h2>Listado de usuarios</h2>
          <p className="kodda-admin-userlist-sub">
            Gestioná el acceso a la plataforma; los cambios aplican al iniciar sesión.
          </p>
        </div>

        {loading && <div className="kodda-userlist-status">Cargando usuarios…</div>}

        {error && <div className="kodda-auth-error">{error}</div>}

        {!loading && !error && actionError && (
          <div className="kodda-auth-error" style={{ marginBottom: '1rem' }}>
            {actionError}
          </div>
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
                        <span className={`kodda-role-badge kodda-role-badge--${u.role}`}>{u.role}</span>
                      </td>
                      <td>
                        <span
                          className={
                            active
                              ? 'kodda-status-badge kodda-status-badge--active'
                              : 'kodda-status-badge kodda-status-badge--inactive'
                          }
                        >
                          {active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        {isSelf ? (
                          <span className="kodda-auth-muted" style={{ fontSize: '0.85rem' }}>
                            Tu cuenta
                          </span>
                        ) : (
                          <div className="kodda-userlist-actions">
                            {active ? (
                              <button
                                type="button"
                                className="kodda-btn-accent-outline"
                                disabled={rowBusy}
                                onClick={() => openBlockModal(u)}
                              >
                                {rowBusy ? '…' : 'Bloquear'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="kodda-btn-accent-outline"
                                disabled={rowBusy}
                                onClick={() => openUnblockModal(u)}
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
      </div>

      {blockModalUser ? (
        <div
          className="kodda-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kodda-block-title"
          onClick={(e) => e.target === e.currentTarget && closeBlockModal()}
        >
          <div className="kodda-modal">
            <div className="kodda-modal-head">
              <div className="kodda-modal-icon" aria-hidden="true">
                ⛔
              </div>
              <h2 id="kodda-block-title" className="kodda-modal-title">
                Bloquear cuenta
              </h2>
              <p className="kodda-modal-sub">
                <strong>{blockModalUser.username}</strong>
                <span style={{ color: 'var(--kd-mist)' }}> · {blockModalUser.email}</span>
              </p>
            </div>
            <div className="kodda-modal-body">
              <label className="kodda-modal-label" htmlFor="kodda-block-reason">
                Motivo (opcional)
              </label>
              <textarea
                id="kodda-block-reason"
                className="kodda-modal-textarea"
                value={blockReasonDraft}
                onChange={(e) => setBlockReasonDraft(e.target.value)}
                placeholder="Ej.: incumplimiento de normas de la comunidad…"
                maxLength={2000}
              />
              <p className="kodda-modal-hint">
                El texto se envía por correo al usuario y se muestra si intenta iniciar sesión.
              </p>
              <div className="kodda-modal-actions">
                <button type="button" className="kodda-btn-ghost" onClick={closeBlockModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="kodda-btn-danger-outline"
                  disabled={busyId === blockModalUser.id}
                  onClick={confirmBlock}
                >
                  {busyId === blockModalUser.id ? 'Bloqueando…' : 'Bloquear cuenta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {unblockModalUser ? (
        <div
          className="kodda-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kodda-unblock-title"
          onClick={(e) => e.target === e.currentTarget && setUnblockModalUser(null)}
        >
          <div className="kodda-modal">
            <div className="kodda-modal-head">
              <div className="kodda-modal-icon" aria-hidden="true">
                ✓
              </div>
              <h2 id="kodda-unblock-title" className="kodda-modal-title">
                Desbloquear cuenta
              </h2>
              <p className="kodda-modal-sub">
                ¿Restaurar el acceso de <strong>{unblockModalUser.username}</strong>?
              </p>
            </div>
            <div className="kodda-modal-body">
              <div className="kodda-modal-actions">
                <button type="button" className="kodda-btn-ghost" onClick={() => setUnblockModalUser(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="kodda-btn-accent-outline"
                  disabled={busyId === unblockModalUser.id}
                  onClick={confirmUnblock}
                >
                  {busyId === unblockModalUser.id ? '…' : 'Desbloquear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
