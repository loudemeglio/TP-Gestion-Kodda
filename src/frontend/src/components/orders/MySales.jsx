import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { formatApiError } from '../../utils/apiError';

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

  return (
    <div className="kodda-my-sales-panel">
      {loading ? <p className="kodda-my-sales-status">Cargando ventas…</p> : null}
      {error ? <p className="kodda-auth-error">{error}</p> : null}

      {!loading && !error && sales.length === 0 ? (
        <p className="kodda-my-sales-status">
          Todavía no tenés ventas confirmadas. Cuando vendas algo, aparecerá acá y en{' '}
          <Link to="/mis-ventas/estadisticas" className="kodda-auth-link">
            Estadísticas
          </Link>
          .
        </p>
      ) : null}

      {!loading && !error && sales.length > 0 ? (
        <ul className="kodda-my-sales-list">
          {sales.map((s) => (
            <li key={s.id} className="kodda-my-sales-row">
              <div className="kodda-my-sales-row-main">
                <p className="kodda-my-sales-row-title">
                  Venta #{s.id} · {s.buyer_username}
                </p>
                <p className="kodda-my-sales-row-meta">
                  {new Date(s.created_at).toLocaleString('es-AR')} · {s.item_count}{' '}
                  {s.item_count === 1 ? 'ítem' : 'ítems'}
                </p>
              </div>
              <div className="kodda-my-sales-row-actions">
                <span className="kodda-my-sales-row-amount">
                  ${s.seller_total.toLocaleString('es-AR')}
                </span>
                <Link to={`/mis-ventas/${s.id}`} className="kodda-btn-ghost kodda-btn-sm">
                  Ver detalle
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
