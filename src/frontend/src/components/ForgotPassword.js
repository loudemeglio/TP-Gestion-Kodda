import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { KoddaLogo } from './KoddaLogo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      setMessage(data.message);
    } catch (err) {
      setError('No se pudo procesar la solicitud. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="kodda-auth-simple">
      <div className="kodda-auth-card">
        <KoddaLogo compact />
        <h1 style={{ marginTop: '1rem' }}>Olvidé mi contraseña</h1>
        <p className="kodda-auth-sub">Si el correo está en Kodda, recibirás un enlace para restablecerla.</p>

        <form onSubmit={handleSubmit}>
          <label className="kodda-field">
            <span>Correo</span>
            <input
              className="kodda-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          {error ? <p className="kodda-auth-error">{error}</p> : null}
          {message ? <p className="kodda-auth-success">{message}</p> : null}
          <button className="kodda-btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>

        <div className="kodda-auth-links">
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
