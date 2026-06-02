import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { formatApiError } from '../../utils/apiError';
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
          setError(formatApiError(err, 'No se pudo cargar la venta.'));
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
    <div className="kodda-my-sales-panel">
      <Link to="/mis-ventas" className="kodda-my-sales-back">
        ← Volver al listado
      </Link>

      {loading ? <p className="kodda-my-sales-status">Cargando…</p> : null}
      {error ? <p className="kodda-auth-error">{error}</p> : null}

      {sale && !error ? (
        <div className="kodda-my-sales-detail">
          <header className="kodda-my-sales-detail-head">
            <h2 className="kodda-my-sales-detail-title">Venta #{sale.id}</h2>
            <p className="kodda-my-sales-detail-meta">
              {sale.buyer_username} · {new Date(sale.created_at).toLocaleString('es-AR')}
            </p>
            <p className="kodda-my-sales-detail-total">
              Total de tu venta: <strong>${sale.seller_total.toLocaleString('es-AR')}</strong>
            </p>
          </header>

          <section className="kodda-my-sales-detail-section">
            <h3 className="kodda-my-sales-detail-section-title">Productos vendidos</h3>
            <ul className="kodda-my-sales-list kodda-my-sales-list--compact">
              {sale.items.map((item) => (
                <li key={item.id} className="kodda-my-sales-row">
                  <div className="kodda-my-sales-row-main">
                    <p className="kodda-my-sales-row-title">{item.product_name}</p>
                    <p className="kodda-my-sales-row-meta">Cantidad: {item.quantity}</p>
                  </div>
                  <span className="kodda-my-sales-row-amount">
                    ${item.line_total.toLocaleString('es-AR')}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <BuyerRatingSection sale={sale} onRated={handleRated} />
        </div>
      ) : null}
    </div>
  );
}
