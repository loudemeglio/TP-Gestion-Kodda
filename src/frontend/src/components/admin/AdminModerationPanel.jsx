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

  const [minBadRatings, setMinBadRatings] = useState(1);
  const [maxStars, setMaxStars] = useState(2);
  const [badFeedbackProducts, setBadFeedbackProducts] = useState([]);
  const [badFeedbackLoading, setBadFeedbackLoading] = useState(false);
  const [badFeedbackError, setBadFeedbackError] = useState('');

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

  useEffect(() => {
    if (tab === 'bad-feedback') {
      void loadBadFeedback();
    }
  }, [tab]);

  async function loadBadFeedback() {
    setBadFeedbackLoading(true);
    setBadFeedbackError('');
    try {
      const res = await api.get(`/api/admin/products/bad-feedback?min_bad_ratings=${minBadRatings}&max_stars=${maxStars}`);
      setBadFeedbackProducts(res.data);
    } catch (err) {
      setBadFeedbackError(err.response?.data?.detail || 'Error al cargar productos con mal feedback.');
    } finally {
      setBadFeedbackLoading(false);
    }
  }

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
        <button
          type="button"
          className={tab === 'bad-feedback' ? 'kodda-btn-primary' : 'kodda-btn-ghost'}
          onClick={() => setTab('bad-feedback')}
        >
          Publicaciones con mal feedback
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

      {tab === 'bad-feedback' ? (
        <section className="kodda-admin-content">
          <form 
            style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}
            onSubmit={(e) => { e.preventDefault(); loadBadFeedback(); }}
          >
            <label className="kodda-field" style={{ margin: 0 }}>
              <span style={{ fontSize: '0.85rem' }}>Umbral de estrellas (≤)</span>
              <input
                className="kodda-input"
                type="number"
                min={1}
                max={5}
                value={maxStars}
                onChange={(e) => setMaxStars(e.target.value)}
              />
            </label>
            <label className="kodda-field" style={{ margin: 0 }}>
              <span style={{ fontSize: '0.85rem' }}>Cantidad mín. calificaciones negativas</span>
              <input
                className="kodda-input"
                type="number"
                min={1}
                value={minBadRatings}
                onChange={(e) => setMinBadRatings(e.target.value)}
              />
            </label>
            <button type="submit" className="kodda-btn-primary" disabled={badFeedbackLoading}>
              {badFeedbackLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {badFeedbackError ? <p className="kodda-auth-error">{badFeedbackError}</p> : null}

          {badFeedbackLoading ? <p className="kodda-auth-muted">Cargando publicaciones...</p> : null}

          {!badFeedbackLoading && !badFeedbackError ? (
            <div className="kodda-table-wrap">
              <table className="kodda-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Vendedor</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th>Calificaciones negativas</th>
                    <th>Promedio de estrellas</th>
                  </tr>
                </thead>
                <tbody>
                  {badFeedbackProducts.map((p) => (
                    <tr key={p.product_id}>
                      <td>{p.product_name}</td>
                      <td>{p.seller_username}</td>
                      <td>{p.category}</td>
                      <td>${p.price.toFixed(2)}</td>
                      <td>
                        <span className={`kodda-badge ${p.is_paused ? 'kodda-badge-danger' : 'kodda-badge-success'}`}>
                          {p.is_paused ? 'Pausado' : 'Activo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{p.bad_rating_count}</td>
                      <td style={{ textAlign: 'center' }}>{p.average_stars.toFixed(1)}</td>
                    </tr>
                  ))}
                  {badFeedbackProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center' }}>
                        <span className="kodda-auth-muted">No se encontraron publicaciones con esos filtros.</span>
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

