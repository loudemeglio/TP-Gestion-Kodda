import { useState } from 'react';
import { api } from '../../api/client';
import { formatApiError } from '../../utils/apiError';

/**
 * Formulario para crear un ticket de soporte/reclamo.
 * Props:
 *   onCreated(ticket) — callback llamado cuando se crea exitosamente un ticket.
 */
export default function CreateTicket({ onCreated }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (subject.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres.');
      return;
    }
    if (description.trim().length < 10) {
      setError('La descripción debe tener al menos 10 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/api/tickets', {
        subject: subject.trim(),
        description: description.trim(),
      });
      setSuccess(true);
      setSubject('');
      setDescription('');
      if (onCreated) onCreated(data);
    } catch (err) {
      setError(formatApiError(err, 'No se pudo crear el ticket. Intentá de nuevo.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="kodda-auth-card" style={{ marginBottom: '2rem' }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Nuevo reclamo</h3>
      <p className="kodda-auth-muted" style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        Describí tu problema y un agente se pondrá en contacto a la brevedad.
      </p>

      {success ? (
        <p className="kodda-auth-success" role="status" style={{ marginBottom: '1rem' }}>
          ✓ Tu reclamo fue enviado correctamente.
        </p>
      ) : null}

      {error ? (
        <p className="kodda-auth-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <label className="kodda-field">
          <span>Motivo del reclamo <span style={{ color: 'var(--kodda-accent, #e03)' }}>*</span></span>
          <input
            id="ticket-subject"
            className="kodda-input"
            type="text"
            placeholder="Ej: Producto no recibido, problema con el pago…"
            value={subject}
            maxLength={200}
            onChange={(e) => setSubject(e.target.value)}
            disabled={submitting}
            required
          />
          <span className="kodda-auth-muted" style={{ fontSize: '0.78rem', textAlign: 'right' }}>
            {subject.length}/200
          </span>
        </label>

        <label className="kodda-field" style={{ marginTop: '0.75rem' }}>
          <span>Descripción <span style={{ color: 'var(--kodda-accent, #e03)' }}>*</span></span>
          <textarea
            id="ticket-description"
            className="kodda-input"
            placeholder="Contanos en detalle qué pasó, número de orden, fecha, etc."
            value={description}
            maxLength={5000}
            rows={5}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            required
            style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 'inherit' }}
          />
          <span className="kodda-auth-muted" style={{ fontSize: '0.78rem', textAlign: 'right' }}>
            {description.length}/5000
          </span>
        </label>

        <div className="kodda-modal-actions" style={{ marginTop: '1.25rem' }}>
          <button
            id="ticket-submit-btn"
            type="submit"
            className="kodda-btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Enviando…' : 'Enviar reclamo'}
          </button>
        </div>
      </form>
    </div>
  );
}
