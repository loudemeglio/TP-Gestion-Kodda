import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import BillingView from '../billing/BillingView';
import { formatTaxIdDisplay } from '../billing/billingUtils';
import { PAYMENT_METHOD_LABELS } from '../checkout/paymentMethods';
import { KoddaLogo } from '../KoddaLogo';
import RatingHintBanner from '../ratings/RatingHintBanner';
import SellerRatingSection from '../ratings/SellerRatingSection';
import '../../styles/checkout.css';
import '../../styles/my-purchases.css';

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

  const layoutClass = showSuccessHero
    ? 'kodda-profile-edit-layout kodda-order-detail-layout'
    : 'kodda-profile-edit-layout kodda-order-detail-layout kodda-purchases-layout';

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <Link to="/mis-compras" className="kodda-btn-ghost">
          Mis compras
        </Link>
        <Link to="/" className="kodda-btn-ghost">
          Inicio
        </Link>
      </header>

      <main className={layoutClass}>
        {loading ? <p className="kodda-auth-muted kodda-purchases-empty">Cargando…</p> : null}
        {error ? <p className="kodda-auth-error kodda-purchases-empty">{error}</p> : null}

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
                    Revisá los productos y calificá al vendedor cuando quieras.
                  </p>
                </>
              )}
            </header>

            <div className="kodda-profile-edit-card kodda-order-detail-card">
              <section className="kodda-order-section kodda-order-section--summary">
                <h2 className="kodda-order-section-title">Orden #{order.id}</h2>
                <dl className="kodda-order-meta-grid">
                  <div className="kodda-order-meta-row">
                    <dt>Total</dt>
                    <dd>${order.total.toLocaleString('es-AR')}</dd>
                  </div>
                  <div className="kodda-order-meta-row">
                    <dt>Fecha</dt>
                    <dd>{new Date(order.created_at).toLocaleString('es-AR')}</dd>
                  </div>
                  <div className="kodda-order-meta-row">
                    <dt>Medio de pago</dt>
                    <dd>
                      {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
                    </dd>
                  </div>
                  <div className="kodda-order-meta-row">
                    <dt>Estado</dt>
                    <dd>{order.status}</dd>
                  </div>
                </dl>
              </section>

              <section className="kodda-order-section">
                <h2 className="kodda-profile-edit-section-title">Productos</h2>
                <ul className="kodda-checkout-items">
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
                <RatingHintBanner orderId={order.id} />
              ) : (
                <div className="kodda-order-section kodda-order-section--rating">
                  <SellerRatingSection order={order} onRated={handleRated} embedded />
                </div>
              )}

              <section className="kodda-order-section">
                <h2 className="kodda-profile-edit-section-title">Factura</h2>
                <p className="kodda-purchase-card-meta kodda-order-invoice-cuit">
                  CUIT/CUIL: {formatTaxIdDisplay(order.invoice.tax_id)}
                </p>
                <BillingView
                  billing={order.invoice}
                  showEditButton={false}
                  title="Datos fiscales de la factura"
                  compact
                />
              </section>

              <footer className="kodda-order-footer">
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
