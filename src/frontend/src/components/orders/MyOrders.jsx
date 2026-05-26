import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { PAYMENT_METHOD_LABELS } from '../checkout/paymentMethods';
import { KoddaLogo } from '../KoddaLogo';
import '../../styles/checkout.css';

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

      <main className="kodda-profile-edit-layout">
        <header className="kodda-profile-edit-hero">
          <p className="kodda-profile-edit-eyebrow">Historial</p>
          <h1 className="kodda-profile-edit-title">Mis compras</h1>
          <p className="kodda-profile-edit-lead">
            Revisá tus pedidos confirmados y calificá a los vendedores.
          </p>
        </header>

        <div className="kodda-profile-edit-card">
          {loading ? <p className="kodda-auth-muted">Cargando compras…</p> : null}
          {error ? <p className="kodda-auth-error">{error}</p> : null}

          {!loading && !error && orders.length === 0 ? (
            <p className="kodda-auth-muted">Todavía no tenés compras registradas.</p>
          ) : null}

          {!loading && !error && orders.length > 0 ? (
            <ul className="kodda-checkout-items" style={{ listStyle: 'none', padding: 0 }}>
              {orders.map((o) => (
                <li key={o.id} className="kodda-checkout-item">
                  <div>
                    <p className="kodda-checkout-item-name">Orden #{o.id}</p>
                    <p className="kodda-checkout-item-meta">
                      {new Date(o.created_at).toLocaleString('es-AR')} · {o.item_count}{' '}
                      producto{o.item_count !== 1 ? 's' : ''} · {o.status}
                    </p>
                    <p className="kodda-checkout-item-meta">
                      {PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="kodda-checkout-item-price">
                      ${o.total.toLocaleString('es-AR')}
                    </p>
                    <Link
                      to={`/mis-compras/${o.id}`}
                      className="kodda-btn-primary"
                      style={{ marginTop: '0.5rem', display: 'inline-block' }}
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
    </div>
  );
}
