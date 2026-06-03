import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { PAYMENT_METHOD_LABELS } from '../checkout/paymentMethods';
import { KoddaLogo } from '../KoddaLogo';
import NotificationBell from '../notifications/NotificationBell';

function formatOrderDate(value) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/orders/me');
        if (!cancelled) setOrders(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'No se pudieron cargar tus compras.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  );

  return (
    <div className="kodda-home kodda-account-history-page">
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

      <main className="kodda-account-history-layout">
        <header className="kodda-account-history-hero">
          <p className="kodda-account-history-eyebrow">Historial de compras</p>
          <h1 className="kodda-account-history-title">Mis compras</h1>
          <p className="kodda-account-history-lead">
            Revisá tus pedidos confirmados, el detalle de cada orden y calificá a los vendedores.
          </p>
        </header>

        <div className="kodda-account-history-panel">
          {loading ? <p className="kodda-account-history-status">Cargando compras…</p> : null}
          {error ? <p className="kodda-auth-error">{error}</p> : null}

          {!loading && !error && orders.length > 0 ? (
            <div className="kodda-account-history-summary" aria-label="Resumen de compras">
              <div className="kodda-account-history-stat">
                <span className="kodda-account-history-stat-label">Órdenes</span>
                <strong className="kodda-account-history-stat-value">{orders.length}</strong>
              </div>
              <div className="kodda-account-history-stat">
                <span className="kodda-account-history-stat-label">Total gastado</span>
                <strong className="kodda-account-history-stat-value">
                  ${totalSpent.toLocaleString('es-AR')}
                </strong>
              </div>
            </div>
          ) : null}

          {!loading && !error && orders.length === 0 ? (
            <div className="kodda-account-history-empty">
              <p>Todavía no tenés compras registradas.</p>
              <Link to="/" className="kodda-btn-accent-outline">
                Explorar catálogo
              </Link>
            </div>
          ) : null}

          {!loading && !error && orders.length > 0 ? (
            <ul className="kodda-account-history-list">
              {orders.map((o) => (
                <li key={o.id}>
                  <article className="kodda-account-history-card">
                    <div className="kodda-account-history-card-icon" aria-hidden="true">
                      📦
                    </div>
                    <div className="kodda-account-history-card-body">
                      <h2 className="kodda-account-history-card-title">
                        Orden #{o.id}
                        <span className="kodda-account-history-card-badge">Confirmada</span>
                      </h2>
                      <p className="kodda-account-history-card-meta">
                        {formatOrderDate(o.created_at)} · {o.item_count}{' '}
                        {o.item_count === 1 ? 'prenda' : 'prendas'}
                      </p>
                      <p className="kodda-account-history-card-meta">
                        {PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method}
                      </p>
                    </div>
                    <div className="kodda-account-history-card-aside">
                      <span className="kodda-account-history-card-amount">
                        ${o.total.toLocaleString('es-AR')}
                      </span>
                      <Link
                        to={`/mis-compras/${o.id}`}
                        className="kodda-btn-primary kodda-account-history-card-cta"
                      >
                        {o.status === 'confirmed' ? 'Ver y calificar' : 'Ver detalle'}
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </main>
    </div>
  );
}
