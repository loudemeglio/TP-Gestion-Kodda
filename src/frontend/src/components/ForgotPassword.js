import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

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
    <div className="auth-page">
      <h1>Olvidé mi contraseña</h1>
      <p className="auth-hint">Te enviaremos un enlace si el correo está registrado.</p>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p className="auth-success">{message}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>
      <p>
        <Link to="/login">Volver al inicio de sesión</Link>
      </p>
    </div>
  );
}
