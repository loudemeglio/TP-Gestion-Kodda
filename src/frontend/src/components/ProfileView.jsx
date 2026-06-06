import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { KoddaLogo } from './KoddaLogo';

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function formatStat(value, suffix = '') {
  if (!hasValue(value)) return null;
  return `${value}${suffix}`;
}

const FIT_PREFERENCE_LABELS = {
  ajustado: 'Ajustado',
  regular: 'Regular',
  holgado: 'Oversize / Holgado',
};

const MEASURE_STATS = [
  { key: 'weight', label: 'Peso', suffix: ' kg' },
  { key: 'height', label: 'Altura', suffix: ' cm' },
  { key: 'shoe_size', label: 'Calzado', suffix: '' },
  { key: 'top_size', label: 'Superior', suffix: '' },
  { key: 'bottom_size', label: 'Inferior', suffix: '' },
];

const FIT_PREF_STATS = [
  { key: 'top_fit_preference', label: 'Calce superior' },
  { key: 'bottom_fit_preference', label: 'Calce inferior' },
  { key: 'shoe_fit_preference', label: 'Calce calzado' },
];

function getFitPrefsForView(profile) {
  if (!profile) return [];
  const items = FIT_PREF_STATS.map(({ key, label }) => {
    if (!hasValue(profile[key])) return null;
    return { label, value: FIT_PREFERENCE_LABELS[profile[key]] || profile[key] };
  }).filter(Boolean);
  if (items.length) return items;
  if (hasValue(profile.fit_preference)) {
    return [
      {
        label: 'Calce general',
        value: FIT_PREFERENCE_LABELS[profile.fit_preference] || profile.fit_preference,
      },
    ];
  }
  return [];
}

export default function ProfileView() {
  const location = useLocation();
  const { user, logout, avatarVersion } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(Boolean(location.state?.profileSaved));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/users/me/profile');
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'No se pudo cargar tu perfil.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.state?.profileSaved, avatarVersion]);

  useEffect(() => {
    if (!savedFlash) return undefined;
    const t = window.setTimeout(() => setSavedFlash(false), 5000);
    return () => window.clearTimeout(t);
  }, [savedFlash]);

  const avatarSrc = resolveMediaUrl(
    profile?.profile_image_url,
    avatarVersion || undefined
  );
  const initial = (profile?.username || user?.username || '?').charAt(0).toUpperCase();

  const filledStats = profile
    ? MEASURE_STATS.map(({ key, label, suffix, icon, format }) => {
        if (!hasValue(profile[key])) return null;
        const raw = format ? format(profile[key]) : profile[key];
        const formatted = formatStat(raw, suffix);
        if (!formatted) return null;
        return { label, value: formatted, icon };
      }).filter(Boolean)
    : [];

  const fitPrefs = getFitPrefsForView(profile);

  const hasAddress = profile && hasValue(profile.address);
  const hasBio = profile && hasValue(profile.bio);
  const profileComplete = filledStats.length >= 3 || fitPrefs.length >= 1 || (hasBio && filledStats.length >= 1);

  return (
    <div className="kodda-home kodda-profile-view-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions" aria-label="Navegación de perfil">
          <Link to="/" className="kodda-btn-ghost">
            Inicio
          </Link>
          <Link to="/mis-compras" className="kodda-btn-ghost">
            Mis compras
          </Link>
          <Link to="/mis-ventas" className="kodda-btn-ghost">
            Mis ventas
          </Link>
          <Link to="/perfil/editar" className="kodda-btn-accent-outline">
            Editar
          </Link>
          <button type="button" className="kodda-btn-ghost" onClick={() => logout()}>
            Salir
          </button>
        </nav>
      </header>

      <main className="kodda-profile-edit-layout">
        {loading ? <p className="kodda-auth-muted kodda-profile-edit-loading">Cargando tu perfil…</p> : null}
        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {profile && !error ? (
          <>
            {savedFlash ? (
              <p className="kodda-auth-success kodda-profile-view-flash" role="status">
                Perfil actualizado correctamente.
              </p>
            ) : null}

            <header className="kodda-profile-view-hero">
              <div className="kodda-profile-view-hero-main">
                <div className="kodda-profile-avatar-ring kodda-profile-avatar-ring--view">
                  {avatarSrc ? (
                    <img
                      key={avatarSrc}
                      src={avatarSrc}
                      alt=""
                      className="kodda-profile-avatar-preview kodda-profile-avatar-preview--view"
                    />
                  ) : (
                    <span className="kodda-profile-avatar-placeholder kodda-profile-avatar-placeholder--view" aria-hidden="true">
                      {initial}
                    </span>
                  )}
                </div>
                <div className="kodda-profile-view-identity">
                  <p className="kodda-profile-edit-eyebrow">Mi perfil</p>
                  <h1 className="kodda-profile-view-username">{profile.username}</h1>
                  <p className="kodda-profile-view-email">{profile.email}</p>
                  {profileComplete ? (
                    <span className="kodda-profile-view-badge">Perfil con medidas</span>
                  ) : (
                    <span className="kodda-profile-view-badge kodda-profile-view-badge--muted">
                      Completá medidas para mejores recomendaciones
                    </span>
                  )}
                </div>
              </div>
              <Link to="/perfil/editar" className="kodda-btn-primary kodda-profile-view-edit-btn">
                Editar perfil
              </Link>
            </header>

            <div className="kodda-profile-view-card">
              <section className="kodda-profile-view-section">
                <h2 className="kodda-profile-edit-section-title">Sobre vos</h2>
                {hasBio ? (
                  <p className="kodda-profile-view-bio">{profile.bio}</p>
                ) : (
                  <div className="kodda-profile-view-empty">
                    <p>Todavía no agregaste una descripción.</p>
                    <Link to="/perfil/editar" className="kodda-auth-link">
                      Escribir descripción →
                    </Link>
                  </div>
                )}
              </section>

              <section className="kodda-profile-view-section">
                <h2 className="kodda-profile-edit-section-title">
                  Medidas y talles
                  {filledStats.length > 0 ? (
                    <span className="kodda-badge-ia">Para recomendaciones</span>
                  ) : null}
                </h2>
                {filledStats.length > 0 ? (
                  <div className="kodda-profile-stat-grid">
                    {filledStats.map((stat) => (
                      <div key={stat.label} className="kodda-profile-stat">
                        <span className="kodda-profile-stat-label">{stat.label}</span>
                        <span className="kodda-profile-stat-value">{stat.value}</span>
                      </div>
                    ))}
                    {hasAddress ? (
                      <div className="kodda-profile-stat kodda-profile-stat--wide">
                        <span className="kodda-profile-stat-label">Dirección</span>
                        <span className="kodda-profile-stat-value">{profile.address}</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="kodda-profile-view-empty">
                    <p>Agregá peso, altura y talles para que Kodda te sugiera mejor qué te queda.</p>
                    <Link to="/perfil/editar" className="kodda-btn-accent-outline">
                      Completar medidas
                    </Link>
                  </div>
                )}
                {fitPrefs.length > 0 ? (
                  <div className="kodda-profile-fit-prefs-view">
                    <h3 className="kodda-profile-fit-prefs-view-title">Preferencias de calce</h3>
                    <div className="kodda-profile-stat-grid">
                      {fitPrefs.map((item) => (
                        <div key={item.label} className="kodda-profile-stat">
                          <span className="kodda-profile-stat-label">{item.label}</span>
                          <span className="kodda-profile-stat-value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <div className="kodda-profile-view-nav">
                <Link
                  to="/mis-compras"
                  className="kodda-profile-view-nav-item"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="kodda-profile-view-nav-icon" aria-hidden="true">
                    🛍️
                  </span>
                  <span className="kodda-profile-view-nav-text">
                    <span className="kodda-profile-view-nav-title">Mis compras</span>
                    <span className="kodda-profile-view-nav-desc">
                      Historial de pedidos y calificación de vendedores
                    </span>
                  </span>
                  <span className="kodda-profile-view-nav-chevron" aria-hidden="true">
                    ›
                  </span>
                </Link>
                <Link
                  to="/mis-ventas"
                  className="kodda-profile-view-nav-item"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="kodda-profile-view-nav-icon" aria-hidden="true">
                    💰
                  </span>
                  <span className="kodda-profile-view-nav-text">
                    <span className="kodda-profile-view-nav-title">Mis ventas</span>
                    <span className="kodda-profile-view-nav-desc">
                      Historial de ventas, estadísticas por período y calificación de compradores
                    </span>
                  </span>
                  <span className="kodda-profile-view-nav-chevron" aria-hidden="true">
                    ›
                  </span>
                </Link>
                <Link
                  to={`/vendedores/${user?.id}`}
                  className="kodda-profile-view-nav-item"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="kodda-profile-view-nav-text">
                    <span className="kodda-profile-view-nav-title">Mi reputación como vendedor</span>
                    <span className="kodda-profile-view-nav-desc">
                      Historial de calificaciones y reseñas de tus compradores
                    </span>
                  </span>
                  <span className="kodda-profile-view-nav-chevron" aria-hidden="true">
                    ›
                  </span>
                </Link>
                <Link
                  to="/mi-reputacion-comprador"
                  className="kodda-profile-view-nav-item"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="kodda-profile-view-nav-icon" aria-hidden="true">
                    🛒
                  </span>
                  <span className="kodda-profile-view-nav-text">
                    <span className="kodda-profile-view-nav-title">Mi reputación como comprador</span>
                    <span className="kodda-profile-view-nav-desc">
                      Reseñas que los vendedores dejaron sobre tus compras
                    </span>
                  </span>
                  <span className="kodda-profile-view-nav-chevron" aria-hidden="true">
                    ›
                  </span>
                </Link>
                <Link
                  to="/mis-publicaciones"
                  className="kodda-profile-view-nav-item"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="kodda-profile-view-nav-icon" aria-hidden="true">
                    🏷️
                  </span>
                  <span className="kodda-profile-view-nav-text">
                    <span className="kodda-profile-view-nav-title">Mis publicaciones activas</span>
                    <span className="kodda-profile-view-nav-desc">
                      Ver y gestionar lo que publicaste en Kodda
                    </span>
                  </span>
                  <span className="kodda-profile-view-nav-chevron" aria-hidden="true">
                    ›
                  </span>
                </Link>
                <Link
                  to="/datos-facturacion"
                  className="kodda-profile-view-nav-item"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="kodda-profile-view-nav-icon" aria-hidden="true">
                    🧾
                  </span>
                  <span className="kodda-profile-view-nav-text">
                    <span className="kodda-profile-view-nav-title">Datos de facturación</span>
                    <span className="kodda-profile-view-nav-desc">
                      Ver y editar la información para recibir tu factura
                    </span>
                  </span>
                  <span className="kodda-profile-view-nav-chevron" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </main>

      <footer className="kodda-home-footer">Kodda — tu perfil</footer>
    </div>
  );
}
