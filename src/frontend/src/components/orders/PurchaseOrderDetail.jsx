import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import BillingView from '../billing/BillingView';
import { formatTaxIdDisplay } from '../billing/billingUtils';
import { PAYMENT_METHOD_LABELS } from '../checkout/paymentMethods';
import AppTopbar from '../AppTopbar';
import SellerRatingSection from '../ratings/SellerRatingSection';
import '../../styles/checkout.css';

export default function PurchaseOrderDetail({
  orderId: orderIdProp,
  initialOrder = null,
  showSuccessHero = false,
}) {
  const { orderId: orderIdParam } = useParams();
  const orderId = orderIdProp ?? orderIdParam;

  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/orders/${orderId}`);
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'No se pudo cargar la orden.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, initialOrder]);

  function handleRated(sellerId) {
    setOrder((prev) => {
      if (!prev) return prev;
      const ids = new Set(prev.rated_seller_ids || []);
      ids.add(sellerId);
      return { ...prev, rated_seller_ids: Array.from(ids) };
    });
  }

  return (
    <div className="kodda-home kodda-account-history-page">
      <AppTopbar>
        <Link to="/mis-compras" className="kodda-btn-ghost">
          Mis compras
        </Link>
        <Link to="/" className="kodda-btn-ghost">
          Inicio
        </Link>
      </AppTopbar>

      <main className="kodda-account-history-layout kodda-checkout-success-card">
        {loading ? <p className="kodda-auth-muted">Cargando…</p> : null}
        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {order && !error ? (
          <>
            <header className="kodda-profile-edit-hero">
              {showSuccessHero ? (
                <>
                  <p className="kodda-profile-edit-eyebrow">Compra confirmada</p>
                  <h1 className="kodda-profile-edit-title">¡Gracias por tu compra!</h1>
                  <p className="kodda-profile-edit-lead">
                    Tu pedido fue registrado y la factura se generó con tus datos fiscales.
                  </p>
                </>
              ) : (
                <>
                  <p className="kodda-profile-edit-eyebrow">Detalle de compra</p>
                  <h1 className="kodda-profile-edit-title">Orden #{order.id}</h1>
                  <p className="kodda-profile-edit-lead">
                    Estado: <strong>{order.status}</strong>
                  </p>
                </>
              )}
            </header>

            <div className="kodda-profile-edit-card">
              <p className="kodda-checkout-success-order">Orden #{order.id}</p>
              <p className="kodda-auth-muted">
                Total: ${order.total.toLocaleString('es-AR')} ·{' '}
                {new Date(order.created_at).toLocaleString('es-AR')}
              </p>
              <p className="kodda-auth-muted">
                Medio de pago:{' '}
                {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
              </p>

              <section className="kodda-checkout-success-section">
                <h2 className="kodda-profile-edit-section-title">Productos</h2>
                <ul className="kodda-checkout-items" style={{ listStyle: 'none', padding: 0 }}>
                  {order.items.map((item) => (
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

              {showSuccessHero ? (
                <section className="kodda-checkout-success-section">
                  <p className="kodda-auth-muted">
                    Podés calificar al vendedor cuando quieras desde{' '}
                    <Link to={`/mis-compras/${order.id}`} className="kodda-auth-link">
                      Mis compras → Ver detalle de esta orden
                    </Link>
                    .
                  </p>
                </section>
              ) : (
                <SellerRatingSection order={order} onRated={handleRated} />
              )}

              <section className="kodda-checkout-success-section">
                <h2 className="kodda-profile-edit-section-title">Factura</h2>
                <p className="kodda-auth-muted" style={{ marginBottom: '0.75rem' }}>
                  CUIT/CUIL: {formatTaxIdDisplay(order.invoice.tax_id)}
                </p>
                <BillingView
                  billing={order.invoice}
                  showEditButton={false}
                  title="Datos fiscales de la factura"
                  compact
                />
              </section>

              <footer className="kodda-profile-edit-footer">
                {showSuccessHero ? (
                  <>
                    <Link to="/" className="kodda-btn-primary">
                      Seguir explorando
                    </Link>
                    <Link to="/mis-compras" className="kodda-btn-ghost">
                      Ir a mis compras
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/mis-compras" className="kodda-btn-primary">
                      Volver a mis compras
                    </Link>
                    <Link to="/" className="kodda-btn-ghost">
                      Inicio
                    </Link>
                  </>
                )}
              </footer>
            </div>
          </>
        ) : null}
      </main>

      <footer className="kodda-home-footer">
        Kodda — {showSuccessHero ? 'compra confirmada' : 'mis compras'}
      </footer>
    </div>
  );
}
