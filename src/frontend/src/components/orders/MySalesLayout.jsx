import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { KoddaLogo } from '../KoddaLogo';
import NotificationBell from '../notifications/NotificationBell';

function salesTabClass({ isActive }) {
  return `kodda-my-sales-tab${isActive ? ' kodda-my-sales-tab--active' : ''}`;
}

export default function MySalesLayout() {
  const { pathname } = useLocation();
  const isStats = pathname.includes('/estadisticas');
  const layoutClass = `kodda-profile-edit-layout kodda-my-sales-layout${
    isStats ? ' kodda-my-sales-layout--wide' : ''
  }`;

  return (
    <div className="kodda-home kodda-profile-edit-page kodda-my-sales-page">
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

      <main className={layoutClass}>
        <header className="kodda-my-sales-header">
          <h1 className="kodda-my-sales-title">Mis ventas</h1>
          <nav className="kodda-my-sales-tabs" aria-label="Secciones de mis ventas">
            <NavLink to="/mis-ventas" end className={salesTabClass}>
              Listado
            </NavLink>
            <NavLink to="/mis-ventas/estadisticas" className={salesTabClass}>
              Estadísticas
            </NavLink>
          </nav>
        </header>

        <div className="kodda-my-sales-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
