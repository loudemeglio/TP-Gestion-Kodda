import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client';
import BillingView from './billing/BillingView';
import { formatTaxIdDisplay } from './billing/billingUtils';
import { PAYMENT_METHOD_LABELS } from './checkout/paymentMethods';
import { KoddaLogo } from './KoddaLogo';
import '../styles/checkout.css';

export default function CheckoutSuccess() {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order ?? null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order) return undefined;
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
  }, [order, orderId]);

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <Link to="/" className="kodda-btn-ghost">
          Inicio
        </Link>
      </header>

      <main className="kodda-profile-edit-layout kodda-checkout-success-card">
        {loading ? (
          <p className="kodda-auth-muted">Cargando confirmación…</p>
        ) : null}

        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {order && !error ? (
          <>
            <header className="kodda-profile-edit-hero">
              <p className="kodda-profile-edit-eyebrow">Compra confirmada</p>
              <h1 className="kodda-profile-edit-title">¡Gracias por tu compra!</h1>
              <p className="kodda-profile-edit-lead">
                Tu pedido fue registrado y la factura se generó con tus datos fiscales.
              </p>
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
                <Link to="/" className="kodda-btn-primary">
                  Seguir explorando
                </Link>
                <Link to="/datos-facturacion" className="kodda-btn-ghost">
                  Ver datos de facturación
                </Link>
              </footer>
            </div>
          </>
        ) : null}
      </main>

      <footer className="kodda-home-footer">Kodda — compra confirmada</footer>
    </div>
  );
}
