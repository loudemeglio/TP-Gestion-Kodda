import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { KoddaLogo } from '../KoddaLogo';
import { useAuth } from '../../context/AuthContext';
import CreateTicket from './CreateTicket';

const STATUS_LABELS = {
  open: 'Abierto',
  in_progress: 'En progreso',
  closed: 'Cerrado',
};

const STATUS_BADGE_CLASS = {
  open: 'kodda-badge-success',
  in_progress: 'kodda-badge-warning',
  closed: 'kodda-badge-muted',
};

function TicketCard({ ticket }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(ticket.created_at).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="kodda-auth-card"
      style={{
        marginBottom: '1rem',
        borderLeft: ticket.status === 'closed'
          ? '3px solid var(--kodda-muted-border, #555)'
          : ticket.status === 'in_progress'
          ? '3px solid var(--kodda-warning, #f5a623)'
          : '3px solid var(--kodda-accent, #5b6ee1)',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: '1rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={ticket.subject}
          >
            🎫 {ticket.subject}
          </p>
          <p className="kodda-auth-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.82rem' }}>
            {date}
          </p>
        </div>
        <span className={`kodda-badge ${STATUS_BADGE_CLASS[ticket.status] || ''}`} style={{ flexShrink: 0 }}>
          {STATUS_LABELS[ticket.status] || ticket.status}
        </span>
      </div>

      {expanded ? (
        <p style={{ marginTop: '0.75rem', marginBottom: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {ticket.description}
        </p>
      ) : (
        <p
          className="kodda-auth-muted"
          style={{
            marginTop: '0.5rem',
            marginBottom: 0,
            fontSize: '0.875rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ticket.description}
        </p>
      )}

      <p className="kodda-auth-muted" style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.78rem', textAlign: 'right' }}>
        {expanded ? 'Clic para contraer ▲' : 'Clic para leer descripción completa ▼'}
      </p>
    </div>
  );
}

export default function MyTickets() {
  const { logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function loadTickets() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/tickets/me');
      setTickets(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron cargar tus reclamos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  function handleTicketCreated(newTicket) {
    setTickets((prev) => [newTicket, ...prev]);
    setShowForm(false);
  }

  return (
    <div className="kodda-home kodda-profile-view-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions" aria-label="Navegación">
          <Link to="/explorador" className="kodda-btn-ghost">Inicio</Link>
          <Link to="/perfil" className="kodda-btn-ghost">Mi perfil</Link>
        </nav>
      </header>

      <main className="kodda-profile-edit-layout" style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <p className="kodda-profile-edit-eyebrow" style={{ margin: 0 }}>Soporte</p>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Mis reclamos</h1>
            <p className="kodda-auth-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
              Seguí el estado de tus tickets de soporte.
            </p>
          </div>
          <button
            type="button"
            className="kodda-btn-primary"
            onClick={() => setShowForm((v) => !v)}
            id="toggle-create-ticket-btn"
          >
            {showForm ? 'Cancelar' : '+ Nuevo reclamo'}
          </button>
        </div>

        {showForm ? (
          <CreateTicket onCreated={handleTicketCreated} />
        ) : null}

        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {loading ? (
          <p className="kodda-auth-muted">Cargando tus reclamos…</p>
        ) : tickets.length === 0 ? (
          <div className="kodda-auth-card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>🎫</p>
            <p style={{ margin: 0, fontWeight: 600 }}>No tenés reclamos abiertos</p>
            <p className="kodda-auth-muted" style={{ margin: '0.4rem 0 1.25rem', fontSize: '0.9rem' }}>
              Si tuviste un problema con una compra o con la plataforma, podés abrir uno acá.
            </p>
            <button
              type="button"
              className="kodda-btn-primary"
              onClick={() => setShowForm(true)}
              id="create-first-ticket-btn"
            >
              Crear mi primer reclamo
            </button>
          </div>
        ) : (
          tickets.map((t) => <TicketCard key={t.id} ticket={t} />)
        )}
      </main>

      <footer className="kodda-home-footer">Kodda — soporte y reclamos</footer>
    </div>
  );
}
