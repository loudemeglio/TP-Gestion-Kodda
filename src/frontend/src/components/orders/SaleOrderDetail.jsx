import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { KoddaLogo } from '../KoddaLogo';
import NotificationBell from '../notifications/NotificationBell';
import BuyerRatingSection from '../ratings/BuyerRatingSection';
import '../../styles/checkout.css';

export default function SaleOrderDetail() {
  const { orderId } = useParams();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/orders/sales/${orderId}`);
        if (!cancelled) setSale(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'No se pudo cargar la venta.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  function handleRated() {
    setSale((prev) => (prev ? { ...prev, buyer_rated: true } : prev));
  }

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <NotificationBell />
        <Link to="/mis-ventas" className="kodda-btn-ghost">
          Mis ventas
        </Link>
        <Link to="/" className="kodda-btn-ghost">
          Inicio
        </Link>
      </header>

      <main className="kodda-profile-edit-layout kodda-checkout-success-card">
        {loading ? <p className="kodda-auth-muted">Cargando…</p> : null}
        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {sale && !error ? (
          <>
            <header className="kodda-profile-edit-hero">
              <p className="kodda-profile-edit-eyebrow">Detalle de venta</p>
              <h1 className="kodda-profile-edit-title">Venta #{sale.id}</h1>
              <p className="kodda-profile-edit-lead">
                Estado: <strong>{sale.status}</strong> · Comprador: {sale.buyer_username}
              </p>
            </header>

            <div className="kodda-profile-edit-card">
              <p className="kodda-auth-muted">
                Total de tu venta: ${sale.seller_total.toLocaleString('es-AR')} ·{' '}
                {new Date(sale.created_at).toLocaleString('es-AR')}
              </p>

              <section className="kodda-checkout-success-section">
                <h2 className="kodda-profile-edit-section-title">Productos vendidos</h2>
                <ul className="kodda-checkout-items" style={{ listStyle: 'none', padding: 0 }}>
                  {sale.items.map((item) => (
                    <li key={item.id} className="kodda-checkout-item">
                      <div>
                        <p className="kodda-checkout-item-name">{item.product_name}</p>
                        <p className="kodda-checkout-item-meta">Cantidad: {item.quantity}</p>
                      </div>
                      <span className="kodda-checkout-item-price">
                        ${item.line_total.toLocaleString('es-AR')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <BuyerRatingSection sale={sale} onRated={handleRated} />

              <footer className="kodda-profile-edit-footer">
                <Link to="/mis-ventas" className="kodda-btn-primary">
                  Volver a mis ventas
                </Link>
              </footer>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
