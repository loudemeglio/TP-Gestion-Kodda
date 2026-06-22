import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { KoddaLogo } from '../KoddaLogo';
import NotificationBell from '../notifications/NotificationBell';

// ── Componentes visuales reutilizables ───────────────────────────────────────

function StarsDisplay({ average }) {
  if (average == null) {
    return <span className="kodda-auth-muted">Sin calificaciones aún</span>;
  }
  const rounded = Math.round(average);
  return (
    <span className="kodda-buyer-stars" aria-label={`Promedio ${average} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= rounded ? 'kodda-rating-star kodda-rating-star--on' : 'kodda-rating-star'}
        >
          ★
        </span>
      ))}
      <strong className="kodda-buyer-stars-avg">{average.toFixed(1)}</strong>
    </span>
  );
}

function ReputationScoreBadge({ score }) {
  if (score == null) return null;
  const color =
    score >= 4.5 ? 'var(--kd-green, #22c55e)'
    : score >= 3.5 ? 'var(--kd-amber, #f59e0b)'
    : 'var(--kd-red, #ef4444)';
  return (
    <span
      className="kodda-badge-ia"
      style={{ background: color, color: '#fff', fontWeight: 700, fontSize: '1rem' }}
      title="Puntaje de reputación consolidado"
    >
      ★ {score.toFixed(2)}
    </span>
  );
}

function RateBar({ label, rate }) {
  if (rate == null) return null;
  const pct = Math.round(rate * 100);
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
        <span className="kodda-auth-muted" style={{ fontSize: '0.85rem' }}>{label}</span>
        <strong style={{ fontSize: '0.85rem', color: 'var(--kd-ink-soft)' }}>{pct}%</strong>
      </div>
      <div
        style={{
          height: '6px',
          borderRadius: '4px',
          background: 'var(--kd-glass-border, #e5e7eb)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background:
              pct >= 80 ? 'var(--kd-green, #22c55e)'
              : pct >= 50 ? 'var(--kd-amber, #f59e0b)'
              : 'var(--kd-red, #ef4444)',
            borderRadius: '4px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────

export default function SellerPublicProfile() {
  const { sellerId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    (async () => {
      try {
        const { data } = await api.get(`/api/ratings/sellers/${sellerId}/reputation`);
        setProfile(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'No se pudo cargar el perfil del vendedor.');
      } finally {
        setLoading(false);
      }
    })();
  }, [sellerId]);

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <NotificationBell />
        <Link to="/explorador" className="kodda-btn-ghost">
          Inicio
        </Link>
      </header>

      <main className="kodda-profile-edit-layout">
        {loading ? <p className="kodda-auth-muted">Cargando…</p> : null}
        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {profile && !error ? (
          <>
            {/* Encabezado con nombre, puntaje y métricas */}
            <header className="kodda-profile-edit-hero">
              <p className="kodda-profile-edit-eyebrow">Perfil de vendedor</p>
              <h1 className="kodda-profile-edit-title">{profile.username}</h1>
              <div className="kodda-buyer-reputation-head">
                <StarsDisplay average={profile.average_stars} />
                <ReputationScoreBadge score={profile.reputation_score} />
                <p className="kodda-auth-muted">
                  {profile.review_count} calificación{profile.review_count === 1 ? '' : 'es'}
                </p>
              </div>
            </header>

            {/* Métricas de veracidad y envío */}
            {(profile.accuracy_rate != null || profile.shipping_rate != null) ? (
              <section className="kodda-profile-edit-card">
                <h2 className="kodda-profile-edit-section-title">Métricas de confianza</h2>
                <RateBar label="Prenda coincide con descripción" rate={profile.accuracy_rate} />
                <RateBar label="Envíos en tiempo acordado" rate={profile.shipping_rate} />
              </section>
            ) : null}

            {/* Lista de calificaciones */}
            <section className="kodda-profile-edit-card">
              <h2 className="kodda-profile-edit-section-title">Experiencias de compradores</h2>
              {profile.reviews.length === 0 ? (
                <p className="kodda-auth-muted">Este vendedor aún no tiene reseñas.</p>
              ) : (
                <ul className="kodda-buyer-review-list">
                  {profile.reviews.map((r) => (
                    <li key={r.id} className="kodda-buyer-review-item">
                      <div className="kodda-buyer-review-stars">
                        {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                        <span className="kodda-auth-muted">
                          {r.buyer_username ? ` · ${r.buyer_username}` : ''}
                        </span>
                      </div>
                      <p>{r.description}</p>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                        {r.matches_description != null ? (
                          <span
                            className={r.matches_description ? 'kodda-rating-done-badge' : 'kodda-auth-error'}
                            style={{ fontSize: '0.78rem' }}
                          >
                            {r.matches_description ? '✓ Prenda exacta' : '✗ No coincidió'}
                          </span>
                        ) : null}
                        {r.delivered_on_time != null ? (
                          <span
                            className={r.delivered_on_time ? 'kodda-rating-done-badge' : 'kodda-auth-error'}
                            style={{ fontSize: '0.78rem' }}
                          >
                            {r.delivered_on_time ? '✓ Envío a tiempo' : '✗ Envío tardío'}
                          </span>
                        ) : null}
                      </div>
                      <time className="kodda-auth-muted">
                        {new Date(r.created_at).toLocaleString('es-AR')}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
