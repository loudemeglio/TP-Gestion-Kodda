import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { KoddaLogo } from '../KoddaLogo';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="kodda-admin-root">
      <header className="kodda-admin-topbar">
        <div className="kodda-admin-brand">
          <Link to="/admin" className="kodda-admin-logo-link" title="Ir al panel de administración">
            <KoddaLogo compact />
          </Link>
          <span className="kodda-admin-badge">Administración</span>
        </div>
        <p className="kodda-admin-topbar-tagline">Gestioná la plataforma por fuera de la experiencia de compra/venta.</p>
        <div className="kodda-admin-topbar-spacer" />
        <nav className="kodda-admin-topnav" aria-label="Sesión">
          <div className="kodda-user-chip kodda-user-chip--admin">
            <span className="kodda-avatar" aria-hidden="true">
              {initial}
            </span>
            <span>{user?.username || 'Admin'}</span>
          </div>
          <Link
            to="/login?cambiar=1"
            className="kodda-link-cuenta kodda-link-cuenta--on-dark"
            title="Para demo con dos cuentas: esta ventana + otra en modo privado"
          >
            Cambiar de cuenta
          </Link>
          <button type="button" className="kodda-btn-ghost kodda-btn-ghost--on-dark" onClick={() => logout()}>
            Salir
          </button>
        </nav>
      </header>

      <div className="kodda-admin-shell">
        <aside className="kodda-admin-sidenav" aria-label="Secciones de administración">
          <p className="kodda-admin-nav-eyebrow">Responsabilidades</p>
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `kodda-admin-navlink${isActive ? ' kodda-admin-navlink--active' : ''}`
            }
          >
            <span className="kodda-admin-navlink-icon" aria-hidden="true">
              ◎
            </span>
            Panel
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `kodda-admin-navlink${isActive ? ' kodda-admin-navlink--active' : ''}`
            }
          >
            <span className="kodda-admin-navlink-icon" aria-hidden="true">
              👥
            </span>
            Usuarios
          </NavLink>

          <p className="kodda-admin-nav-eyebrow kodda-admin-nav-eyebrow--spaced">Prototipo</p>
          <NavLink
            to="/explorador"
            className={({ isActive }) =>
              `kodda-admin-navlink${isActive ? ' kodda-admin-navlink--active' : ''}`
            }
          >
            <span className="kodda-admin-navlink-icon" aria-hidden="true">
              🏠
            </span>
            Vista explorador
          </NavLink>
        </aside>

        <div className="kodda-admin-content">
          <Outlet />
        </div>
      </div>

      <footer className="kodda-admin-footer">Kodda · panel de administración</footer>
    </div>
  );
}
