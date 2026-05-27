import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { KoddaLogo } from '../KoddaLogo';
import NotificationBell from '../notifications/NotificationBell';

// ── Componentes visuales ─────────────────────────────────────────────────────

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

// ── Vista principal ───────────────────────────────────────────────────────────

export default function BuyerOwnReputationProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const { data } = await api.get(`/api/buyer-reviews/buyers/${user.id}`);
        setProfile(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'No se pudo cargar tu reputación como comprador.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, fetchKey]);

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <NotificationBell />
        <Link to="/perfil" className="kodda-btn-ghost">
          Mi perfil
        </Link>
        <Link to="/" className="kodda-btn-ghost">
          Inicio
        </Link>
      </header>

      <main className="kodda-profile-edit-layout">
        {loading ? <p className="kodda-auth-muted">Cargando…</p> : null}
        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {profile && !error ? (
          <>
            {/* Encabezado */}
            <header className="kodda-profile-edit-hero">
              <p className="kodda-profile-edit-eyebrow">Mi reputación como comprador</p>
              <h1 className="kodda-profile-edit-title">{profile.username}</h1>
              <div className="kodda-buyer-reputation-head">
                <StarsDisplay average={profile.average_stars} />
                <p className="kodda-auth-muted">
                  {profile.review_count} calificación{profile.review_count === 1 ? '' : 'es'} de vendedores
                </p>
                <button
                  type="button"
                  className="kodda-btn-ghost"
                  style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
                  onClick={() => setFetchKey((k) => k + 1)}
                >
                  ↻ Actualizar
                </button>
              </div>
            </header>

            {/* Lista de reseñas de vendedores */}
            <section className="kodda-profile-edit-card">
              <h2 className="kodda-profile-edit-section-title">Lo que dijeron los vendedores</h2>
              {profile.reviews.length === 0 ? (
                <p className="kodda-auth-muted">
                  Aún no tenés calificaciones de vendedores. Aparecerán acá cuando un vendedor califique
                  una de tus compras.
                </p>
              ) : (
                <ul className="kodda-buyer-review-list">
                  {profile.reviews.map((r) => (
                    <li key={r.id} className="kodda-buyer-review-item">
                      <div className="kodda-buyer-review-stars">
                        {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                        {r.seller_username ? (
                          <span className="kodda-auth-muted"> · {r.seller_username}</span>
                        ) : null}
                      </div>
                      <p>{r.comment}</p>
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

      <footer className="kodda-home-footer">Kodda — mi reputación como comprador</footer>
    </div>
  );
}
