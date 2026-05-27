import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { KoddaLogo } from '../KoddaLogo';
import NotificationBell from '../notifications/NotificationBell';

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
        setError(err.response?.data?.detail || 'No se pudieron cargar las ventas.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <NotificationBell />
        <Link to="/" className="kodda-btn-ghost">
          Inicio
        </Link>
      </header>

      <main className="kodda-profile-edit-layout">
        <header className="kodda-profile-edit-hero">
          <h1 className="kodda-profile-edit-title">Mis ventas</h1>
          <p className="kodda-profile-edit-lead">Órdenes confirmadas donde vendiste productos.</p>
        </header>

        {loading ? <p className="kodda-auth-muted">Cargando…</p> : null}
        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {!loading && !error && sales.length === 0 ? (
          <p className="kodda-auth-muted">Todavía no tenés ventas confirmadas.</p>
        ) : null}

        <ul className="kodda-checkout-items" style={{ listStyle: 'none', padding: 0 }}>
          {sales.map((s) => (
            <li key={s.id} className="kodda-checkout-item">
              <div>
                <p className="kodda-checkout-item-name">
                  Venta #{s.id} · {s.buyer_username}
                </p>
                <p className="kodda-checkout-item-meta">
                  {new Date(s.created_at).toLocaleString('es-AR')} · {s.item_count} ítem(s)
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span className="kodda-checkout-item-price">
                  ${s.seller_total.toLocaleString('es-AR')}
                </span>
                <Link to={`/mis-ventas/${s.id}`} className="kodda-btn-ghost kodda-btn-sm">
                  Ver detalle
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
