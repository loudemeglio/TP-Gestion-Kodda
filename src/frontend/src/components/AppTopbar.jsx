import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarrito } from '../context/CarritoContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { KoddaLogo } from './KoddaLogo';
import NotificationBell from './notifications/NotificationBell';

function TopbarCartLink() {
  const { obtenerCantidadTotal } = useCarrito();
  const count = obtenerCantidadTotal();

  return (
    <Link to="/carrito" className="kodda-cart-icon-link" title="Mi carrito" aria-label="Mi carrito">
      🛒
      {count > 0 ? <span className="kodda-cart-badge">{count}</span> : null}
    </Link>
  );
}

function TopbarProfileLink() {
  const { user, avatarVersion } = useAuth();
  const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();
  const avatarSrc = resolveMediaUrl(user?.profile_image_url, avatarVersion || undefined);

  return (
    <Link to="/perfil" className="kodda-user-chip" title="Mi perfil">
      {avatarSrc ? (
        <img key={avatarSrc} src={avatarSrc} alt="" className="kodda-avatar kodda-avatar-img" />
      ) : (
        <span className="kodda-avatar" aria-hidden="true">
          {initial}
        </span>
      )}
      <span>{user?.username || 'Usuario'}</span>
    </Link>
  );
}

/**
 * Barra superior de la app consumidor.
 * Orden: children → notificaciones → carrito → perfil → trailing.
 */
export default function AppTopbar({
  children,
  trailing = null,
  collapsible = false,
  showNotifications = false,
  navLabel = 'Acciones principales',
  logoTo,
}) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenuExtras = Boolean(children) || showNotifications || Boolean(trailing) || Boolean(user);

  const navItems = (
    <>
      {children}
      {showNotifications ? <NotificationBell /> : null}
      {user ? (
        <div className="kodda-topbar-nav-core-in-nav">
          <TopbarCartLink />
          <TopbarProfileLink />
        </div>
      ) : null}
      {trailing}
    </>
  );

  if (collapsible) {
    return (
      <header className="kodda-topbar">
        <KoddaLogo compact to={logoTo} />
        <div className="kodda-topbar-spacer" />
        {user ? (
          <div className="kodda-topbar-pinned">
            <TopbarCartLink />
            <TopbarProfileLink />
          </div>
        ) : null}
        {hasMenuExtras ? (
          <>
            <button
              type="button"
              className="kodda-hamburger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
            <nav
              className={`kodda-nav-actions-collapsible${menuOpen ? ' open' : ''}`}
              aria-label={navLabel}
            >
              {navItems}
            </nav>
          </>
        ) : null}
      </header>
    );
  }

  return (
    <header className="kodda-topbar">
      <KoddaLogo compact to={logoTo} />
      <div className="kodda-topbar-spacer" />
      <nav className="kodda-nav-actions" aria-label={navLabel}>
        {navItems}
      </nav>
    </header>
  );
}
