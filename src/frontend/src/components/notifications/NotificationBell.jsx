import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/notifications');
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onDocClick(ev) {
      if (panelRef.current && !panelRef.current.contains(ev.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function handleClick(notif) {
    if (!notif.is_read) {
      try {
        await api.put(`/api/notifications/${notif.id}/read`);
        setItems((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
        );
      } catch {
        /* seguir con la navegación */
      }
    }
    setOpen(false);
    if (notif.order_id) {
      // El título del comprador contiene "Compra" (¡Compra realizada!),
      // el del vendedor contiene "confirmada" (Compra confirmada).
      const isBuyerNotif = notif.title.startsWith('¡Compra');
      navigate(isBuyerNotif ? `/mis-compras/${notif.order_id}` : `/mis-ventas/${notif.order_id}`);
    }
  }

  return (
    <div className="kodda-notif-wrap" ref={panelRef}>
      <button
        type="button"
        className="kodda-cart-icon-link kodda-notif-bell"
        title="Notificaciones"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
      >
        🔔
        {unreadCount > 0 ? <span className="kodda-cart-badge">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="kodda-notif-panel" role="menu">
          <p className="kodda-notif-panel-title">Notificaciones</p>
          {loading ? <p className="kodda-auth-muted">Cargando…</p> : null}
          {!loading && items.length === 0 ? (
            <p className="kodda-auth-muted">No tenés avisos.</p>
          ) : null}
          <ul className="kodda-notif-list">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`kodda-notif-item${n.is_read ? '' : ' kodda-notif-item--unread'}`}
                  onClick={() => handleClick(n)}
                >
                  <strong>{n.title}</strong>
                  <span>{n.message}</span>
                  <time className="kodda-notif-time">
                    {new Date(n.created_at).toLocaleString('es-AR')}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
