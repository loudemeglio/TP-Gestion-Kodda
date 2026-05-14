import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminHome() {
  const { user } = useAuth();

  return (
    <div className="kodda-admin-page kodda-admin-page--narrow">
      <header className="kodda-admin-page-head">
        <h1 className="kodda-admin-page-title">Panel de administración</h1>
        <p className="kodda-admin-page-lead">
          Hola, <strong>{user?.username || 'admin'}</strong>. Desde acá accedés a las tareas operativas de la
          plataforma. El inicio con recomendaciones y catálogo es un prototipo de usuario: podés abrirlo cuando quieras
          desde <Link to="/explorador">Vista explorador</Link> o el menú lateral.
        </p>
      </header>

      <section className="kodda-admin-dashboard" aria-labelledby="kodda-admin-dash-heading">
        <h2 id="kodda-admin-dash-heading" className="kodda-admin-dashboard-heading">
          Tareas disponibles
        </h2>
        <div className="kodda-admin-dashboard-grid">
          <Link to="/admin/users" className="kodda-admin-task-card kodda-admin-task-card--primary">
            <div className="kodda-admin-task-card-visual" aria-hidden="true">
              <span className="kodda-admin-task-card-emoji">👥</span>
            </div>
            <div className="kodda-admin-task-card-body">
              <h3>Usuarios</h3>
              <p>Listá cuentas registradas, revisá roles y estado de cada una, y bloqueá o desbloqueá el acceso cuando
                haga falta.</p>
              <span className="kodda-admin-task-card-cta">Abrir listado</span>
            </div>
          </Link>

          <div className="kodda-admin-task-card kodda-admin-task-card--muted">
            <div className="kodda-admin-task-card-visual kodda-admin-task-card-visual--muted" aria-hidden="true">
              <span className="kodda-admin-task-card-emoji">✦</span>
            </div>
            <div className="kodda-admin-task-card-body">
              <h3>Próximas herramientas</h3>
              <p>Acá sumaremos más responsabilidades de admin (reportes, moderación de publicaciones, etc.).</p>
            </div>
          </div>
        </div>
      </section>

      <section className="kodda-admin-session-card" aria-labelledby="kodda-admin-session-title">
        <h2 id="kodda-admin-session-title" className="kodda-admin-session-title">
          Tu sesión
        </h2>
        <dl className="kodda-admin-session-dl">
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>
              <span className="kodda-role-badge kodda-role-badge--admin">{user?.role}</span>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
