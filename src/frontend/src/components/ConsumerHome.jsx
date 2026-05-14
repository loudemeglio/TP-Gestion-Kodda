import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KoddaLogo } from './KoddaLogo';

const PLACEHOLDER_FEED = [
  { title: 'Campera técnica', meta: 'The North Face · Estado verificado por IA', price: '$ 42.000', hint: 'Talle sugerido: L' },
  { title: 'Jean recto vintage', meta: "Levi's 501 · Segunda mano", price: '$ 18.500', hint: 'Ajuste: recto en cintura' },
  { title: 'Remera lino', meta: 'Zara · Sin etiqueta', price: '$ 9.200', hint: 'Coincide con tus medidas' },
  { title: 'Buzo oversize', meta: 'Marca local · Como nuevo', price: '$ 24.000', hint: 'Feed curado para vos' },
];

/**
 * Vista de inicio tipo usuario (feed prototipo + cuenta).
 * @param {{ allowAdminPreview?: boolean }} props — si es true y el usuario es admin, muestra aviso y acceso al panel.
 */
export default function ConsumerHome({ allowAdminPreview = false }) {
  const { user, logout } = useAuth();
  const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();
  const showAdminPreviewBar = allowAdminPreview && user?.role === 'admin';

  return (
    <div className="kodda-home">
      {showAdminPreviewBar ? (
        <div className="kodda-admin-preview-banner" role="note">
          <p>
            <strong>Vista explorador:</strong> mismo prototipo que vería una cuenta de usuario. Cuando termines,{' '}
            <Link to="/admin">volvé al panel de administración</Link>.
          </p>
        </div>
      ) : null}

      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-search" title="Próximamente: búsqueda en lenguaje natural">
          <span aria-hidden="true">🔍</span>
          <input type="search" placeholder='Probá: "ropa para boda de día en noviembre"' disabled />
        </div>
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions" aria-label="Acciones principales">
          {showAdminPreviewBar ? (
            <Link to="/admin" className="kodda-btn-accent-outline" title="Ir al panel de administración">
              Panel admin
            </Link>
          ) : null}
          <button type="button" className="kodda-btn-accent-outline" disabled title="Próximamente">
            Vender prenda
          </button>
          <button type="button" className="kodda-btn-ghost" disabled title="Próximamente">
            Chat Kodda
          </button>
          <div className="kodda-user-chip">
            <span className="kodda-avatar" aria-hidden="true">
              {initial}
            </span>
            <span>{user?.username || 'Usuario'}</span>
          </div>
          <Link
            to="/login?cambiar=1"
            className="kodda-link-cuenta"
            title="Para demo con dos cuentas: esta ventana + otra en modo privado (misma URL)"
          >
            Cambiar de cuenta
          </Link>
          <button type="button" className="kodda-btn-ghost" onClick={() => logout()}>
            Salir
          </button>
        </nav>
      </header>

      <main className="kodda-home-main">
        <p className="kodda-hello">Hola, {user?.username || 'explorador'} 👋</p>
        <p className="kodda-hello-sub">
          Acá verás recomendaciones según tus gustos, compras y medidas — priorizando lo que mejor te queda, no solo lo
          que “entra”.
        </p>

        <div className="kodda-section-title">
          <h2>Recomendados para vos</h2>
          <span className="kodda-badge-ia">IA + historial</span>
        </div>

        <div className="kodda-grid" role="list">
          {PLACEHOLDER_FEED.map((item) => (
            <article key={item.title} className="kodda-card-product" role="listitem">
              <div className="kodda-card-visual" />
              <div className="kodda-card-body">
                <h3>{item.title}</h3>
                <p className="kodda-card-meta">{item.meta}</p>
                <div className="kodda-price">{item.price}</div>
                <p className="kodda-card-meta" style={{ marginTop: '0.35rem' }}>
                  {item.hint}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="kodda-strip">
          <p>
            <strong>Kodda</strong> conecta vendedores y compradores; la IA autocompleta datos desde fotos, sugiere
            precios y estima talle comparando tus medidas con la prenda — vos tenés la última palabra.
          </p>
          <button type="button" className="kodda-btn-accent-outline" disabled>
            Explorar catálogo
          </button>
        </div>

        <section style={{ marginTop: '2rem' }}>
          <div className="kodda-section-title">
            <h2>Tu cuenta</h2>
          </div>
          <ul style={{ textAlign: 'left', lineHeight: 1.85, color: 'var(--kd-mist)', paddingLeft: '1.1rem' }}>
            <li>
              <strong style={{ color: 'var(--kd-ink-soft)' }}>Email:</strong> {user?.email}
            </li>
            <li>
              <strong style={{ color: 'var(--kd-ink-soft)' }}>Rol:</strong> {user?.role}
            </li>
          </ul>
        </section>
      </main>

      <footer className="kodda-home-footer">Kodda — moda circular inteligente · Prototipo de producto</footer>
    </div>
  );
}
