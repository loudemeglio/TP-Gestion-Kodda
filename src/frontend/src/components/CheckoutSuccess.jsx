import { useEffect, useMemo, useState } from 'react';
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
  const [ratingError, setRatingError] = useState('');
  const [ratingOk, setRatingOk] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const sellerIds = useMemo(() => {
    const ids = new Set();
    (order?.items || []).forEach((i) => {
      if (i.seller_id) ids.add(i.seller_id);
    });
    return Array.from(ids);
  }, [order]);

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

  async function sendRating({ sellerId, kind, score }) {
    if (!order?.id) return;
    setRatingError('');
    setRatingOk('');
    setRatingSubmitting(true);
    try {
      await api.post(`/api/ratings/orders/${order.id}`, {
        seller_id: sellerId,
        kind,
        score,
        comment: kind === 'negative' ? 'Reporte por posible estafa.' : null,
      });
      setRatingOk('Gracias. Tu calificación fue registrada.');
    } catch (err) {
      setRatingError(err.response?.data?.detail || 'No se pudo registrar la calificación.');
    } finally {
      setRatingSubmitting(false);
    }
  }

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
                <h2 className="kodda-profile-edit-section-title">Calificar vendedor</h2>

                {ratingError ? <p className="kodda-auth-error">{ratingError}</p> : null}
                {ratingOk ? <p className="kodda-auth-muted">{ratingOk}</p> : null}

                {sellerIds.length === 0 ? (
                  <p className="kodda-auth-muted">
                    No se encontró información del vendedor para esta compra.
                  </p>
                ) : (
                  <ul className="kodda-checkout-items" style={{ listStyle: 'none', padding: 0 }}>
                    {sellerIds.map((sellerId) => (
                      <li key={sellerId} className="kodda-checkout-item">
                        <div>
                          <p className="kodda-checkout-item-name">Vendedor #{sellerId}</p>
                          <p className="kodda-checkout-item-meta">
                            Podés calificar o reportar si hubo una estafa.
                          </p>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            type="button"
                            className="kodda-btn-ghost"
                            disabled={ratingSubmitting}
                            onClick={() => sendRating({ sellerId, kind: 'positive', score: 5 })}
                          >
                            👍 Positivo
                          </button>
                          <button
                            type="button"
                            className="kodda-btn-primary"
                            disabled={ratingSubmitting}
                            onClick={() => sendRating({ sellerId, kind: 'negative', score: 1 })}
                            title="Reportar vendedor"
                          >
                            Reportar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
