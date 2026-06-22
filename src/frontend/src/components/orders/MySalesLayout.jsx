import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import AppTopbar from '../AppTopbar';

function salesTabClass({ isActive }) {
  return `kodda-my-sales-tab${isActive ? ' kodda-my-sales-tab--active' : ''}`;
}

export default function MySalesLayout() {
  const { pathname } = useLocation();
  const isStats = pathname.includes('/estadisticas');
  const layoutClass = `kodda-account-history-layout kodda-my-sales-layout${
    isStats ? ' kodda-my-sales-layout--stats' : ''
  }`;

  return (
    <div className="kodda-home kodda-account-history-page kodda-my-sales-page">
      <AppTopbar showNotifications>
        <Link to="/explorador" className="kodda-btn-ghost">
          Inicio
        </Link>
      </AppTopbar>

      <main className={layoutClass}>
        <header className="kodda-account-history-hero kodda-my-sales-header">
          <p className="kodda-account-history-eyebrow">Tu actividad como vendedor</p>
          <h1 className="kodda-account-history-title">Mis ventas</h1>
          <p className="kodda-account-history-lead">
            Seguimiento de pedidos confirmados, montos cobrados y estadísticas de tu tienda.
          </p>
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
