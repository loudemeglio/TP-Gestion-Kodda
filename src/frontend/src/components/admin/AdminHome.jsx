import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminHome() {
  const { user } = useAuth();

  return (
    <div className="kodda-admin-page kodda-admin-page--narrow">
      <header className="kodda-admin-page-head">
        <h1 className="kodda-admin-page-title">Panel de administracion</h1>
        <p className="kodda-admin-page-lead">
          Hola, <strong>{user?.username || 'admin'}</strong>. Desde aca accedes a las tareas operativas de la
          plataforma. El inicio con recomendaciones y catalogo es un prototipo de usuario: podes abrirlo cuando quieras
          desde <Link to="/explorador">Vista explorador</Link> o el menu lateral.
        </p>
      </header>

      <section className="kodda-admin-dashboard" aria-labelledby="kodda-admin-dash-heading">
        <h2 id="kodda-admin-dash-heading" className="kodda-admin-dashboard-heading">
          Tareas disponibles
        </h2>
        <div className="kodda-admin-dashboard-grid">
          <Link to="/admin/users" className="kodda-admin-task-card kodda-admin-task-card--primary">
            <div className="kodda-admin-task-card-visual" aria-hidden="true">
              <span className="kodda-admin-task-card-emoji">US</span>
            </div>
            <div className="kodda-admin-task-card-body">
              <h3>Usuarios</h3>
              <p>Lista cuentas registradas, revisa roles y estado de cada una, y bloquea o desbloquea el acceso cuando
                haga falta.</p>
              <span className="kodda-admin-task-card-cta">Abrir listado</span>
            </div>
          </Link>

          <Link to="/admin/metrics" className="kodda-admin-task-card kodda-admin-task-card--primary">
            <div className="kodda-admin-task-card-visual kodda-admin-task-card-visual--metrics" aria-hidden="true">
              <span className="kodda-admin-task-card-emoji">MT</span>
            </div>
            <div className="kodda-admin-task-card-body">
              <h3>Metricas</h3>
              <p>Visualiza ventas del dia, ticket promedio, productos destacados y actividad reciente de la plataforma.</p>
              <span className="kodda-admin-task-card-cta">Ver metricas</span>
            </div>
          </Link>

          <Link to="/admin/roles" className="kodda-admin-task-card kodda-admin-task-card--primary">
            <div className="kodda-admin-task-card-visual" aria-hidden="true">
              <span className="kodda-admin-task-card-emoji">RO</span>
            </div>
            <div className="kodda-admin-task-card-body">
              <h3>Gestión de roles</h3>
              <p>Visualiza la lista de usuarios y cambia sus roles entre USER y ADMIN según sea necesario.</p>
              <span className="kodda-admin-task-card-cta">Administrar roles</span>
            </div>
          </Link>
        </div>
      </section>

      <section className="kodda-admin-session-card" aria-labelledby="kodda-admin-session-title">
        <h2 id="kodda-admin-session-title" className="kodda-admin-session-title">
          Tu sesion
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
