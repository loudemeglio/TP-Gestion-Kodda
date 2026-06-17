import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

// ─── Star display ──────────────────────────────────────────────────────────
function Stars({ value }) {
  const full = Math.round(value);
  return (
    <span style={{ color: '#f59e0b', letterSpacing: '-1px' }}>
      {'★'.repeat(full)}
      <span style={{ color: '#d1d5db' }}>{'★'.repeat(5 - full)}</span>
    </span>
  );
}

// ─── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ isPaused }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.78rem',
      fontWeight: 600,
      background: isPaused ? 'rgba(220,38,38,0.1)' : 'rgba(16,185,129,0.1)',
      color: isPaused ? '#dc2626' : '#059669',
      border: `1px solid ${isPaused ? 'rgba(220,38,38,0.25)' : 'rgba(16,185,129,0.25)'}`,
    }}>
      <span style={{ fontSize: '0.6rem' }}>{isPaused ? '⏸' : '▶'}</span>
      {isPaused ? 'Pausado' : 'Activo'}
    </span>
  );
}

// ─── Filter chips (estado) ───────────────────────────────────────────────────
function EstadoChips({ value, onChange }) {
  const options = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Activos' },
    { key: 'paused', label: 'Pausados' },
  ];
  return (
    <div style={{ display: 'flex', gap: '0.4rem' }}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          style={{
            padding: '0.3rem 0.8rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            border: value === o.key
              ? '1.5px solid var(--kd-accent)'
              : '1.5px solid rgba(15,118,110,0.2)',
            background: value === o.key ? 'var(--kd-accent)' : 'rgba(255,255,255,0.8)',
            color: value === o.key ? '#fff' : 'var(--kd-ink-soft)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function flagReasonLabel(reason) {
  if (reason === 'estafa') return 'Reportes de estafa';
  if (reason === 'reseñas_negativas') return 'Reseñas negativas';
  if (reason === 'ambos') return 'Estafa y reseñas negativas';
  return 'Revisión';
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function AdminModerationPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'config';
  const [tab, setTab] = useState(initialTab);

  // Config
  const [settings, setSettings] = useState({
    max_scam_reports: 1,
    min_bad_ratings: 2,
    max_stars: 2,
  });
  const [settingsDraft, setSettingsDraft] = useState({
    max_scam_reports: 1,
    min_bad_ratings: 2,
    max_stars: 2,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Flagged users
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [flaggedLoading, setFlaggedLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  // Publicaciones en revisión (bad-feedback)
  const [minBadRatings, setMinBadRatings] = useState(2);
  const [maxStars, setMaxStars] = useState(2);
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [reviewProducts, setReviewProducts] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [actionId, setActionId] = useState(null); // productId being paused/resumed

  // Publicaciones pausadas
  const [pausedProducts, setPausedProducts] = useState([]);
  const [pausedLoading, setPausedLoading] = useState(false);
  const [pausedError, setPausedError] = useState('');
  const [resumingId, setResumingId] = useState(null);

  // Pause modal
  const [pauseModal, setPauseModal] = useState(null);
  const [pauseReason, setPauseReason] = useState('');
  const [pausingSaving, setPausingSaving] = useState(false);
  const [pauseError, setPauseError] = useState('');

  // ── Loaders ─────────────────────────────────────────────────────────────
  async function loadAll() {
    setError('');
    setSettingsLoading(true);
    setFlaggedLoading(true);
    try {
      const [{ data: s }, { data: f }] = await Promise.all([
        api.get('/api/admin/settings'),
        api.get('/api/admin/flagged-users'),
      ]);
      setSettings(s);
      setSettingsDraft({
        max_scam_reports: s.max_scam_reports || 1,
        min_bad_ratings: s.min_bad_ratings || 2,
        max_stars: s.max_stars || 2,
      });
      setMinBadRatings(s.min_bad_ratings || 2);
      setMaxStars(s.max_stars || 2);
      setFlaggedUsers(f);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar la moderación.');
    } finally {
      setSettingsLoading(false);
      setFlaggedLoading(false);
    }
  }

  async function loadReview() {
    setReviewLoading(true);
    setReviewError('');
    try {
      const res = await api.get(
        `/api/admin/products/bad-feedback?min_bad_ratings=${minBadRatings}&max_stars=${maxStars}`
      );
      setReviewProducts(res.data);
    } catch (err) {
      setReviewError(err.response?.data?.detail || 'Error al cargar publicaciones.');
    } finally {
      setReviewLoading(false);
    }
  }

  async function loadPaused() {
    setPausedLoading(true);
    setPausedError('');
    try {
      const res = await api.get('/api/admin/products/paused');
      setPausedProducts(res.data);
    } catch (err) {
      setPausedError(err.response?.data?.detail || 'Error al cargar publicaciones pausadas.');
    } finally {
      setPausedLoading(false);
    }
  }

  useEffect(() => { void loadAll(); }, []);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== tab) {
      setTab(urlTab);
    }
  }, [searchParams, tab]);

  function selectTab(nextTab) {
    setTab(nextTab);
    setSearchParams(nextTab === 'config' ? {} : { tab: nextTab });
  }

  useEffect(() => {
    if (tab === 'review') void loadReview();
    if (tab === 'paused') void loadPaused();
  }, [tab]);

  // ── Config ──────────────────────────────────────────────────────────────
  const canSave = useMemo(() => {
    const scam = Number(settingsDraft.max_scam_reports);
    const minBad = Number(settingsDraft.min_bad_ratings);
    const stars = Number(settingsDraft.max_stars);
    if (!Number.isFinite(scam) || scam < 1) return false;
    if (!Number.isFinite(minBad) || minBad < 1) return false;
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) return false;
    return (
      scam !== settings.max_scam_reports
      || minBad !== settings.min_bad_ratings
      || stars !== settings.max_stars
    );
  }, [settingsDraft, settings]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        max_scam_reports: Number(settingsDraft.max_scam_reports),
        min_bad_ratings: Number(settingsDraft.min_bad_ratings),
        max_stars: Number(settingsDraft.max_stars),
      };
      const { data } = await api.put('/api/admin/settings', payload);
      setSettings(data);
      setSettingsDraft({
        max_scam_reports: data.max_scam_reports || 1,
        min_bad_ratings: data.min_bad_ratings || 2,
        max_stars: data.max_stars || 2,
      });
      setMinBadRatings(data.min_bad_ratings || 2);
      setMaxStars(data.max_stars || 2);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  // ── Flagged users ────────────────────────────────────────────────────────
  async function resolveFlag(userId) {
    setResolvingId(userId);
    setError('');
    try {
      await api.put(`/api/admin/users/${userId}/resolve`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo resolver.');
    } finally {
      setResolvingId(null);
    }
  }

  // ── Pause / resume from review tab ─────────────────────────────────────
  function openPauseModal(productId, productName) {
    setPauseModal({ productId, productName });
    setPauseReason('');
    setPauseError('');
  }

  function closePauseModal() {
    if (pausingSaving) return;
    setPauseModal(null);
    setPauseReason('');
    setPauseError('');
  }

  async function confirmPause() {
    if (!pauseReason.trim()) {
      setPauseError('Debés indicar un motivo.');
      return;
    }
    setPausingSaving(true);
    setPauseError('');
    try {
      const { data: updated } = await api.patch(
        `/api/admin/products/${pauseModal.productId}/pause`,
        { reason: pauseReason.trim() }
      );
      setReviewProducts((prev) =>
        prev.map((p) =>
          p.product_id === pauseModal.productId
            ? { ...p, is_paused: true }
            : p
        )
      );
      setPauseModal(null);
      setPauseReason('');
    } catch (err) {
      setPauseError(err.response?.data?.detail || 'No se pudo pausar.');
    } finally {
      setPausingSaving(false);
    }
  }

  async function resumeFromReview(productId) {
    setActionId(productId);
    try {
      await api.patch(`/api/admin/products/${productId}/resume`);
      setReviewProducts((prev) =>
        prev.map((p) =>
          p.product_id === productId ? { ...p, is_paused: false } : p
        )
      );
    } catch (err) {
      setReviewError(err.response?.data?.detail || 'No se pudo reanudar.');
    } finally {
      setActionId(null);
    }
  }

  async function resumeFromPaused(productId) {
    setResumingId(productId);
    setPausedError('');
    try {
      await api.patch(`/api/admin/products/${productId}/resume`);
      await loadPaused();
    } catch (err) {
      setPausedError(err.response?.data?.detail || 'No se pudo reanudar.');
    } finally {
      setResumingId(null);
    }
  }

  async function resolveProductReview(productId) {
    setActionId(productId);
    setReviewError('');
    try {
      const { data } = await api.put(`/api/admin/products/${productId}/resolve`);
      setReviewProducts((prev) =>
        prev.map((p) => (p.product_id === productId ? { ...p, needs_review: data.needs_review } : p)),
      );
    } catch (err) {
      setReviewError(err.response?.data?.detail || 'No se pudo marcar como revisada.');
    } finally {
      setActionId(null);
    }
  }

  // ── Filtered review list ─────────────────────────────────────────────────
  const filteredReview = useMemo(() => {
    if (estadoFilter === 'active') return reviewProducts.filter((p) => !p.is_paused);
    if (estadoFilter === 'paused') return reviewProducts.filter((p) => p.is_paused);
    return reviewProducts;
  }, [reviewProducts, estadoFilter]);

  // ── Tabs config ──────────────────────────────────────────────────────────
  const tabs = [
    { key: 'config', label: 'Configuración' },
    { key: 'flagged', label: 'Usuarios en revisión', count: flaggedUsers.length || null },
    { key: 'review', label: 'Publicaciones en revisión', count: reviewProducts.filter((p) => p.needs_review).length || null },
    { key: 'paused', label: 'Publicaciones pausadas', count: pausedProducts.length || null },
  ];

  return (
    <div className="kodda-admin-page">
      {/* Header */}
      <div className="kodda-admin-page-head">
        <h2 className="kodda-admin-page-title">Moderación y reportes</h2>
        <p className="kodda-admin-page-lead">
          Revisá publicaciones con bajo rendimiento, pausá contenido y gestioná usuarios reportados.
        </p>
      </div>

      {error ? <p className="kodda-auth-error" style={{ marginBottom: '1rem' }}>{error}</p> : null}

      {/* Tabs */}
      <div className="kodda-admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`kodda-admin-tab${tab === t.key ? ' kodda-admin-tab--active' : ''}`}
            onClick={() => selectTab(t.key)}
          >
            {t.label}
            {t.count ? (
              <span style={{
                marginLeft: '0.4rem',
                background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'rgba(15,118,110,0.12)',
                color: tab === t.key ? '#fff' : 'var(--kd-accent)',
                borderRadius: '999px',
                padding: '0.05rem 0.45rem',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}>
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Config ─────────────────────────────────────────────────── */}
      {tab === 'config' ? (
        <section>
          {settingsLoading
            ? <p className="kodda-auth-muted">Cargando configuración…</p>
            : (
              <div className="kodda-auth-card" style={{ maxWidth: 520 }}>
                <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Umbrales de alerta</h3>
                <p className="kodda-auth-muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
                  Definí cuándo el sistema avisa a los administradores por actividad inusual.
                </p>
                <label className="kodda-field">
                  <span>Reportes de estafa para revisión</span>
                  <input
                    className="kodda-input"
                    type="number"
                    min={1}
                    value={settingsDraft.max_scam_reports}
                    onChange={(e) => setSettingsDraft((prev) => ({
                      ...prev,
                      max_scam_reports: e.target.value,
                    }))}
                  />
                </label>
                <label className="kodda-field">
                  <span>Críticas para alertar (publicaciones y perfiles)</span>
                  <input
                    className="kodda-input"
                    type="number"
                    min={1}
                    value={settingsDraft.min_bad_ratings}
                    onChange={(e) => setSettingsDraft((prev) => ({
                      ...prev,
                      min_bad_ratings: e.target.value,
                    }))}
                  />
                </label>
                <label className="kodda-field">
                  <span>Estrellas máximas consideradas crítica</span>
                  <input
                    className="kodda-input"
                    type="number"
                    min={1}
                    max={5}
                    value={settingsDraft.max_stars}
                    onChange={(e) => setSettingsDraft((prev) => ({
                      ...prev,
                      max_stars: e.target.value,
                    }))}
                  />
                </label>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="kodda-btn-primary"
                    onClick={handleSave}
                    disabled={!canSave || saving}
                  >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            )
          }
        </section>
      ) : null}

      {/* ── Flagged users ───────────────────────────────────────────── */}
      {tab === 'flagged' ? (
        <section>
          {flaggedLoading
            ? <p className="kodda-auth-muted">Cargando usuarios…</p>
            : (
              <div className="kodda-table-wrap">
                <table className="kodda-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Motivo</th>
                      <th style={{ textAlign: 'center' }}>Reportes</th>
                      <th style={{ textAlign: 'center' }}>Críticas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.username}</strong>
                          <div className="kodda-auth-muted" style={{ fontSize: '0.82rem' }}>{u.email}</div>
                        </td>
                        <td>{flagReasonLabel(u.flag_reason)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            background: 'rgba(220,38,38,0.1)',
                            color: '#dc2626',
                            borderRadius: '999px',
                            padding: '0.15rem 0.55rem',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                          }}>
                            {u.report_count}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            background: 'rgba(245,158,11,0.12)',
                            color: '#b45309',
                            borderRadius: '999px',
                            padding: '0.15rem 0.55rem',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                          }}>
                            {u.bad_review_count || 0}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="kodda-btn-accent-outline"
                            style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem' }}
                            disabled={resolvingId === u.id}
                            onClick={() => resolveFlag(u.id)}
                          >
                            {resolvingId === u.id ? 'Resolviendo…' : 'Resolver'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {flaggedUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                          <span className="kodda-auth-muted">No hay usuarios en revisión.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          }
        </section>
      ) : null}

      {/* ── Publicaciones en revisión ───────────────────────────────── */}
      {tab === 'review' ? (
        <section>
          {/* Filters row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'flex-end',
            padding: '1rem',
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 'var(--kd-radius)',
            border: '1px solid var(--kd-line)',
            marginBottom: '1.25rem',
          }}>
            <label className="kodda-field" style={{ margin: 0, minWidth: 100 }}>
              <span style={{ fontSize: '0.8rem' }}>Estrellas (≤)</span>
              <input
                className="kodda-input"
                type="number"
                min={1}
                max={5}
                value={maxStars}
                onChange={(e) => setMaxStars(e.target.value)}
                style={{ padding: '0.4rem 0.6rem' }}
              />
            </label>
            <label className="kodda-field" style={{ margin: 0, minWidth: 140 }}>
              <span style={{ fontSize: '0.8rem' }}>Mín. valoraciones negativas</span>
              <input
                className="kodda-input"
                type="number"
                min={1}
                value={minBadRatings}
                onChange={(e) => setMinBadRatings(e.target.value)}
                style={{ padding: '0.4rem 0.6rem' }}
              />
            </label>
            <button
              type="button"
              className="kodda-btn-primary"
              style={{ padding: '0.45rem 1.1rem', fontSize: '0.88rem' }}
              disabled={reviewLoading}
              onClick={loadReview}
            >
              {reviewLoading ? 'Buscando…' : 'Buscar'}
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--kd-ink-soft)', fontWeight: 600 }}>
                Estado
              </span>
              <EstadoChips value={estadoFilter} onChange={setEstadoFilter} />
            </div>
          </div>

          {reviewError ? <p className="kodda-auth-error" style={{ marginBottom: '1rem' }}>{reviewError}</p> : null}
          {reviewLoading ? <p className="kodda-auth-muted">Cargando publicaciones…</p> : null}

          {!reviewLoading && !reviewError ? (
            <>
              {reviewProducts.length > 0 && (
                <div style={{
                  fontSize: '0.82rem',
                  color: 'var(--kd-ink-soft)',
                  marginBottom: '0.5rem',
                }}>
                  {filteredReview.length} publicación{filteredReview.length !== 1 ? 'es' : ''} encontrada{filteredReview.length !== 1 ? 's' : ''}
                  {estadoFilter !== 'all' ? ` · filtrado por ${estadoFilter === 'paused' ? 'pausadas' : 'activas'}` : ''}
                </div>
              )}
              <div className="kodda-table-wrap">
                <table className="kodda-table">
                  <thead>
                    <tr>
                      <th>Publicación</th>
                      <th>Vendedor</th>
                      <th style={{ textAlign: 'center' }}>Valoraciones negativas</th>
                      <th style={{ textAlign: 'center' }}>Promedio</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th style={{ textAlign: 'center' }}>Alerta</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReview.map((p) => (
                      <tr key={p.product_id}>
                        <td>
                          <strong style={{ display: 'block' }}>{p.product_name}</strong>
                          <span className="kodda-auth-muted" style={{ fontSize: '0.8rem' }}>{p.category} · ${p.price.toFixed(2)}</span>
                        </td>
                        <td>{p.seller_username}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            background: 'rgba(220,38,38,0.1)',
                            color: '#dc2626',
                            borderRadius: '999px',
                            padding: '0.15rem 0.55rem',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                          }}>
                            {p.bad_rating_count}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Stars value={p.average_stars} />
                          <span className="kodda-auth-muted" style={{ fontSize: '0.78rem', display: 'block' }}>
                            {p.average_stars.toFixed(1)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <StatusBadge isPaused={p.is_paused} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {p.needs_review ? (
                            <span style={{
                              background: 'rgba(220,38,38,0.1)',
                              color: '#dc2626',
                              borderRadius: '999px',
                              padding: '0.15rem 0.55rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}>
                              En revisión
                            </span>
                          ) : (
                            <span className="kodda-auth-muted" style={{ fontSize: '0.78rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {p.needs_review ? (
                            <button
                              type="button"
                              className="kodda-btn-ghost"
                              style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                              disabled={actionId === p.product_id}
                              onClick={() => resolveProductReview(p.product_id)}
                            >
                              {actionId === p.product_id ? '…' : 'Marcar revisada'}
                            </button>
                          ) : null}
                          {p.is_paused ? (
                            <button
                              type="button"
                              className="kodda-btn-secondary"
                              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                              disabled={actionId === p.product_id}
                              onClick={() => resumeFromReview(p.product_id)}
                            >
                              {actionId === p.product_id ? '…' : '▶ Reanudar'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="kodda-btn-accent-outline"
                              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                              disabled={actionId === p.product_id}
                              onClick={() => openPauseModal(p.product_id, p.product_name)}
                            >
                              ⏸ Pausar
                            </button>
                          )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredReview.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
                          <span className="kodda-auth-muted">
                            {reviewProducts.length === 0
                              ? 'No se encontraron publicaciones con esos filtros.'
                              : 'No hay publicaciones en ese estado.'
                            }
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {/* ── Publicaciones pausadas ──────────────────────────────────── */}
      {tab === 'paused' ? (
        <section>
          {pausedLoading ? <p className="kodda-auth-muted">Cargando publicaciones pausadas…</p> : null}
          {pausedError ? <p className="kodda-auth-error">{pausedError}</p> : null}

          {!pausedLoading && !pausedError ? (
            <div className="kodda-table-wrap">
              <table className="kodda-table">
                <thead>
                  <tr>
                    <th>Publicación</th>
                    <th>Vendedor</th>
                    <th>Motivo</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pausedProducts.map((p) => (
                    <tr key={p.product_id}>
                      <td>
                        <strong style={{ display: 'block' }}>{p.product_name}</strong>
                        <span className="kodda-auth-muted" style={{ fontSize: '0.8rem' }}>
                          {p.category} · ${p.price.toFixed(2)}
                        </span>
                      </td>
                      <td>{p.seller_username}</td>
                      <td style={{ maxWidth: 280 }}>
                        {p.pause_reason ? (
                          <span style={{ fontSize: '0.88rem' }}>{p.pause_reason}</span>
                        ) : (
                          <span className="kodda-auth-muted" style={{ fontSize: '0.82rem' }}>
                            Pausada por el vendedor
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="kodda-btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                          disabled={resumingId === p.product_id}
                          onClick={() => resumeFromPaused(p.product_id)}
                        >
                          {resumingId === p.product_id ? 'Reanudando…' : '▶ Reanudar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pausedProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
                        <span className="kodda-auth-muted">No hay publicaciones pausadas.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Modal de pausa ──────────────────────────────────────────── */}
      {pauseModal ? (
        <div className="kodda-modal-overlay" onClick={closePauseModal}>
          <div className="kodda-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.25rem' }}>Pausar publicación</h3>
              <p className="kodda-auth-muted" style={{ margin: 0, fontSize: '0.88rem' }}>
                {pauseModal.productName}
              </p>
            </div>
            <label className="kodda-field">
              <span>Motivo <span style={{ color: 'var(--kodda-accent, #e03)' }}>*</span></span>
              <textarea
                className="kodda-input"
                rows={3}
                maxLength={500}
                placeholder="Describí por qué pausás esta publicación…"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                disabled={pausingSaving}
                style={{ resize: 'vertical' }}
              />
              <span className="kodda-auth-muted" style={{ fontSize: '0.75rem', textAlign: 'right' }}>
                {pauseReason.length}/500
              </span>
            </label>
            {pauseError ? <p className="kodda-auth-error" style={{ margin: '0.5rem 0 0' }}>{pauseError}</p> : null}
            <div className="kodda-modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="kodda-btn-ghost"
                onClick={closePauseModal}
                disabled={pausingSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="kodda-btn-primary"
                onClick={confirmPause}
                disabled={pausingSaving || !pauseReason.trim()}
              >
                {pausingSaving ? 'Pausando…' : 'Confirmar pausa'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
