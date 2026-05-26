import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { KoddaLogo } from '../KoddaLogo';
import NotificationBell from '../notifications/NotificationBell';

function StarsDisplay({ average }) {
  if (average == null) {
    return <span className="kodda-auth-muted">Sin calificaciones aún</span>;
  }
  const rounded = Math.round(average);
  return (
    <span className="kodda-buyer-stars" aria-label={`Promedio ${average} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? 'kodda-rating-star kodda-rating-star--on' : 'kodda-rating-star'}>
          ★
        </span>
      ))}
      <strong className="kodda-buyer-stars-avg">{average.toFixed(1)}</strong>
    </span>
  );
}

export default function BuyerPublicProfile() {
  const { buyerId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/api/buyer-reviews/buyers/${buyerId}`);
        setProfile(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'No se pudo cargar el perfil del comprador.');
      } finally {
        setLoading(false);
      }
    })();
  }, [buyerId]);

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <NotificationBell />
        <Link to="/" className="kodda-btn-ghost">
          Inicio
        </Link>
      </header>

      <main className="kodda-profile-edit-layout">
        {loading ? <p className="kodda-auth-muted">Cargando…</p> : null}
        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {profile && !error ? (
          <>
            <header className="kodda-profile-edit-hero">
              <p className="kodda-profile-edit-eyebrow">Perfil de comprador</p>
              <h1 className="kodda-profile-edit-title">{profile.username}</h1>
              <div className="kodda-buyer-reputation-head">
                <StarsDisplay average={profile.average_stars} />
                <p className="kodda-auth-muted">
                  {profile.review_count} calificación{profile.review_count === 1 ? '' : 'es'}
                </p>
              </div>
            </header>

            <section className="kodda-profile-edit-card">
              <h2 className="kodda-profile-edit-section-title">Comentarios de vendedores</h2>
              {profile.reviews.length === 0 ? (
                <p className="kodda-auth-muted">Este comprador aún no tiene reseñas.</p>
              ) : (
                <ul className="kodda-buyer-review-list">
                  {profile.reviews.map((r) => (
                    <li key={r.id} className="kodda-buyer-review-item">
                      <div className="kodda-buyer-review-stars">
                        {'★'.repeat(r.stars)}
                        <span className="kodda-auth-muted">
                          {r.seller_username ? ` · ${r.seller_username}` : ''}
                        </span>
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
    </div>
  );
}
