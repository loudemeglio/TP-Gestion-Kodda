import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

export default function AdminModerationPanel() {
  const [tab, setTab] = useState('config'); // 'config' | 'flagged'
  const [settings, setSettings] = useState({ max_scam_reports: 1 });
  const [settingsDraft, setSettingsDraft] = useState(1);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [flaggedLoading, setFlaggedLoading] = useState(true);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  async function loadAll() {
    setError('');
    setSettingsLoading(true);
    setFlaggedLoading(true);
    try {
      const [{ data: settingsData }, { data: flaggedData }] = await Promise.all([
        api.get('/api/admin/settings'),
        api.get('/api/admin/flagged-users'),
      ]);
      setSettings(settingsData);
      setSettingsDraft(settingsData.max_scam_reports || 1);
      setFlaggedUsers(flaggedData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar la moderación.');
    } finally {
      setSettingsLoading(false);
      setFlaggedLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const canSave = useMemo(() => {
    const v = Number(settingsDraft);
    return Number.isFinite(v) && v >= 1 && v !== settings.max_scam_reports;
  }, [settingsDraft, settings.max_scam_reports]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const next = await api.put('/api/admin/settings', {
        max_scam_reports: Number(settingsDraft),
      });
      setSettings(next.data);
      setSettingsDraft(next.data.max_scam_reports || 1);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  async function resolveUserFlag(userId) {
    setResolvingId(userId);
    setError('');
    try {
      await api.put(`/api/admin/users/${userId}/resolve`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo resolver el flag de revisión.');
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="kodda-admin-page">
      <div className="kodda-section-title">
        <h2>Moderación y reportes</h2>
        <p className="kodda-admin-userlist-sub">
          Administrá el límite de reportes de posible estafa y revisá usuarios bajo investigación.
        </p>
      </div>

      {error ? <p className="kodda-auth-error" style={{ marginBottom: '1rem' }}>{error}</p> : null}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button
          type="button"
          className={tab === 'config' ? 'kodda-btn-primary' : 'kodda-btn-ghost'}
          onClick={() => setTab('config')}
          disabled={saving}
        >
          Configuración del sistema
        </button>
        <button
          type="button"
          className={tab === 'flagged' ? 'kodda-btn-primary' : 'kodda-btn-ghost'}
          onClick={() => setTab('flagged')}
        >
          Usuarios en revisión
        </button>
      </div>

      {tab === 'config' ? (
        <section className="kodda-admin-content">
          {settingsLoading ? <p className="kodda-auth-muted">Cargando configuración…</p> : null}

          {!settingsLoading ? (
            <div className="kodda-auth-card" style={{ maxWidth: 520 }}>
              <h3 style={{ marginTop: 0 }}>Límite de reportes</h3>
              <p className="kodda-auth-muted" style={{ marginTop: '-0.3rem' }}>
                Cuando un vendedor acumula reportes de posible estafa iguala o supera este valor, queda bajo revisión administrativa.
              </p>

              <label className="kodda-field">
                <span>Reportes para analisis</span>
                <input
                  className="kodda-input"
                  type="number"
                  min={1}
                  value={settingsDraft}
                  onChange={(e) => setSettingsDraft(e.target.value)}
                />
              </label>

              <div className="kodda-modal-actions" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="kodda-btn-primary"
                  onClick={handleSave}
                  disabled={!canSave || saving}
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'flagged' ? (
        <section className="kodda-admin-content">
          {flaggedLoading ? <p className="kodda-auth-muted">Cargando usuarios…</p> : null}

          {!flaggedLoading ? (
            <div className="kodda-table-wrap">
              <table className="kodda-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Reportes</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {flaggedUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.username}</strong>
                        <div className="kodda-auth-muted" style={{ fontSize: '0.85rem' }}>
                          {u.email}
                        </div>
                      </td>
                      <td>{u.report_count}</td>
                      <td>
                        <button
                          type="button"
                          className="kodda-btn-accent-outline"
                          disabled={resolvingId === u.id}
                          onClick={() => resolveUserFlag(u.id)}
                        >
                          {resolvingId === u.id ? 'Resolviendo…' : 'Resolver / Quitar marca'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {flaggedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center' }}>
                        <span className="kodda-auth-muted">No hay usuarios en revisión.</span>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

