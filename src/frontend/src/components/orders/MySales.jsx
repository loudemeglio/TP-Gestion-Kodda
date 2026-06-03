import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { formatApiError } from '../../utils/apiError';

function formatSaleDate(value) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function MySales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/orders/sales/me');
        setSales(data);
      } catch (err) {
        setError(formatApiError(err, 'No se pudieron cargar las ventas.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalRevenue = useMemo(
    () => sales.reduce((sum, sale) => sum + Number(sale.seller_total || 0), 0),
    [sales]
  );

  return (
    <div className="kodda-account-history-panel kodda-my-sales-panel">
      {loading ? <p className="kodda-account-history-status">Cargando ventas…</p> : null}
      {error ? <p className="kodda-auth-error">{error}</p> : null}

      {!loading && !error && sales.length > 0 ? (
        <div className="kodda-account-history-summary" aria-label="Resumen de ventas">
          <div className="kodda-account-history-stat">
            <span className="kodda-account-history-stat-label">Ventas</span>
            <strong className="kodda-account-history-stat-value">{sales.length}</strong>
          </div>
          <div className="kodda-account-history-stat">
            <span className="kodda-account-history-stat-label">Facturación</span>
            <strong className="kodda-account-history-stat-value">
              ${totalRevenue.toLocaleString('es-AR')}
            </strong>
          </div>
          <Link to="/mis-ventas/estadisticas" className="kodda-btn-accent-outline kodda-account-history-summary-link">
            Ver estadísticas
          </Link>
        </div>
      ) : null}

      {!loading && !error && sales.length === 0 ? (
        <div className="kodda-account-history-empty">
          <p>Todavía no tenés ventas confirmadas.</p>
          <p>
            Cuando vendas algo, aparecerá acá y en{' '}
            <Link to="/mis-ventas/estadisticas" className="kodda-auth-link">
              Estadísticas
            </Link>
            .
          </p>
        </div>
      ) : null}

      {!loading && !error && sales.length > 0 ? (
        <ul className="kodda-account-history-list">
          {sales.map((s) => (
            <li key={s.id}>
              <article className="kodda-account-history-card">
                <div className="kodda-account-history-card-icon" aria-hidden="true">
                  🛍️
                </div>
                <div className="kodda-account-history-card-body">
                  <h2 className="kodda-account-history-card-title">
                    Venta #{s.id}
                    <span className="kodda-account-history-card-badge">Confirmada</span>
                  </h2>
                  <p className="kodda-account-history-card-meta">
                    Comprador: <strong>{s.buyer_username}</strong>
                  </p>
                  <p className="kodda-account-history-card-meta">
                    {formatSaleDate(s.created_at)} · {s.item_count}{' '}
                    {s.item_count === 1 ? 'prenda' : 'prendas'}
                  </p>
                </div>
                <div className="kodda-account-history-card-aside">
                  <span className="kodda-account-history-card-amount">
                    ${s.seller_total.toLocaleString('es-AR')}
                  </span>
                  <Link to={`/mis-ventas/${s.id}`} className="kodda-btn-primary kodda-account-history-card-cta">
                    Ver detalle
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
