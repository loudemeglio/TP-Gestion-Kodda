import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { PAYMENT_METHOD_LABELS } from '../checkout/paymentMethods';
import { KoddaLogo } from '../KoddaLogo';
import '../../styles/checkout.css';
import '../../styles/my-purchases.css';

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

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <Link to="/perfil" className="kodda-btn-ghost">
          Mi perfil
        </Link>
        <Link to="/" className="kodda-btn-ghost">
          Inicio
        </Link>
      </header>

      <main className="kodda-profile-edit-layout kodda-purchases-layout">
        <header className="kodda-profile-edit-hero">
          <p className="kodda-profile-edit-eyebrow">Historial</p>
          <h1 className="kodda-profile-edit-title">Mis compras</h1>
          <p className="kodda-profile-edit-lead">
            Revisá tus pedidos confirmados y calificá a los vendedores desde el detalle de cada
            compra.
          </p>
        </header>

        <div className="kodda-profile-edit-card kodda-purchases-card">
          {loading ? <p className="kodda-auth-muted kodda-purchases-empty">Cargando compras…</p> : null}
          {error ? <p className="kodda-auth-error kodda-purchases-empty">{error}</p> : null}

          {!loading && !error && orders.length === 0 ? (
            <p className="kodda-auth-muted kodda-purchases-empty">Todavía no tenés compras registradas.</p>
          ) : null}

          {!loading && !error && orders.length > 0 ? (
            <ul className="kodda-purchases-list">
              {orders.map((o) => (
                <li key={o.id} className="kodda-purchase-card">
                  <div className="kodda-purchase-card-main">
                    <h2 className="kodda-purchase-card-title">Orden #{o.id}</h2>
                    <p className="kodda-purchase-card-meta">
                      {new Date(o.created_at).toLocaleString('es-AR')}
                    </p>
                    <p className="kodda-purchase-card-meta">
                      {o.item_count} producto{o.item_count !== 1 ? 's' : ''} ·{' '}
                      <span className="kodda-purchase-card-status">{o.status}</span>
                    </p>
                    <p className="kodda-purchase-card-meta">
                      {PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method}
                    </p>
                  </div>
                  <div className="kodda-purchase-card-aside">
                    <p className="kodda-purchase-card-price">${o.total.toLocaleString('es-AR')}</p>
                    <Link
                      to={`/mis-compras/${o.id}`}
                      className="kodda-btn-primary kodda-purchase-card-cta"
                    >
                      {o.status === 'confirmed' ? 'Ver y calificar' : 'Ver detalle'}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </main>

      <footer className="kodda-home-footer">Kodda — mis compras</footer>
    </div>
  );
}
