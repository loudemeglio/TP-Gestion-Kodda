import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { formatApiError } from '../../utils/apiError';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'closed', label: 'Cerrado' },
];

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

function ExpandableDescription({ text }) {
  const [expanded, setExpanded] = useState(false);
  const preview = text.length > 120 ? text.slice(0, 120) + '…' : text;

  return (
    <div>
      <p
        className="kodda-auth-muted"
        style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
      >
        {expanded ? text : preview}
      </p>
      {text.length > 120 ? (
        <button
          type="button"
          className="kodda-btn-ghost"
          style={{ padding: '0.1rem 0', fontSize: '0.78rem', marginTop: '0.25rem' }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Ver menos ▲' : 'Ver completa ▼'}
        </button>
      ) : null}
    </div>
  );
}

export default function AdminTicketsPanel() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [updateError, setUpdateError] = useState('');

  async function loadTickets() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/tickets');
      setTickets(data);
    } catch (err) {
      setError(formatApiError(err, 'No se pudieron cargar los tickets.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    if (!filterStatus) return tickets;
    return tickets.filter((t) => t.status === filterStatus);
  }, [tickets, filterStatus]);

  async function handleStatusChange(ticketId, newStatus) {
    setUpdatingId(ticketId);
    setUpdateError('');
    try {
      const { data } = await api.patch(`/api/tickets/${ticketId}/status`, { status: newStatus });
      setTickets((prev) => prev.map((t) => (t.id === data.id ? data : t)));
    } catch (err) {
      setUpdateError(formatApiError(err, 'No se pudo actualizar el estado.'));
    } finally {
      setUpdatingId(null);
    }
  }

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;

  return (
    <div className="kodda-admin-page">
      <div className="kodda-section-title">
        <h2>Tickets y reclamos</h2>
        <p className="kodda-admin-userlist-sub">
          Gestioná los tickets de soporte de los usuarios. Podés cambiar el estado de cada uno directamente desde la tabla.
        </p>
      </div>

      {/* Resumen rápido */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="kodda-auth-card" style={{ flex: '1 1 150px', padding: '0.75rem 1.25rem', minWidth: 140 }}>
          <p className="kodda-auth-muted" style={{ margin: '0 0 0.25rem', fontSize: '0.8rem' }}>Total tickets</p>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{tickets.length}</p>
        </div>
        <div className="kodda-auth-card" style={{ flex: '1 1 150px', padding: '0.75rem 1.25rem', minWidth: 140 }}>
          <p className="kodda-auth-muted" style={{ margin: '0 0 0.25rem', fontSize: '0.8rem' }}>Abiertos</p>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--kodda-accent, #5b6ee1)' }}>
            {openCount}
          </p>
        </div>
        <div className="kodda-auth-card" style={{ flex: '1 1 150px', padding: '0.75rem 1.25rem', minWidth: 140 }}>
          <p className="kodda-auth-muted" style={{ margin: '0 0 0.25rem', fontSize: '0.8rem' }}>En progreso</p>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--kodda-warning, #f5a623)' }}>
            {inProgressCount}
          </p>
        </div>
      </div>

      {error ? <p className="kodda-auth-error" style={{ marginBottom: '1rem' }}>{error}</p> : null}
      {updateError ? <p className="kodda-auth-error" style={{ marginBottom: '1rem' }}>{updateError}</p> : null}

      {/* Filtro por estado */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <label
          htmlFor="ticket-status-filter"
          className="kodda-auth-muted"
          style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}
        >
          Filtrar por estado:
        </label>
        <select
          id="ticket-status-filter"
          className="kodda-input"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: 220 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="kodda-btn-ghost"
          onClick={() => void loadTickets()}
          disabled={loading}
        >
          ↺ Recargar
        </button>
      </div>

      {loading ? (
        <p className="kodda-auth-muted">Cargando tickets…</p>
      ) : (
        <div className="kodda-table-wrap">
          <table className="kodda-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Motivo (subject)</th>
                <th>Usuario</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Descripción</th>
                <th>Cambiar estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <span className="kodda-auth-muted" style={{ fontSize: '0.85rem' }}>#{ticket.id}</span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.9rem' }}>{ticket.subject}</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem' }}>{ticket.username}</span>
                  </td>
                  <td>
                    <span className="kodda-auth-muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(ticket.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td>
                    <span className={`kodda-badge ${STATUS_BADGE_CLASS[ticket.status] || ''}`}>
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <ExpandableDescription text={ticket.description} />
                  </td>
                  <td>
                    <select
                      aria-label={`Cambiar estado del ticket #${ticket.id}`}
                      className="kodda-input"
                      value={ticket.status}
                      disabled={updatingId === ticket.id}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      style={{ fontSize: '0.82rem', padding: '0.25rem 0.5rem' }}
                    >
                      <option value="open">Abierto</option>
                      <option value="in_progress">En progreso</option>
                      <option value="closed">Cerrado</option>
                    </select>
                    {updatingId === ticket.id ? (
                      <span className="kodda-auth-muted" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.2rem' }}>
                        Guardando…
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    <span className="kodda-auth-muted">
                      {filterStatus
                        ? `No hay tickets con estado "${STATUS_LABELS[filterStatus]}".`
                        : 'No hay tickets registrados.'}
                    </span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
