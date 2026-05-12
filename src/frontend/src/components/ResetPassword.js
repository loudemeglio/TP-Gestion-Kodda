import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('Falta el token en el enlace.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/auth/reset-password', {
        token,
        new_password: password,
      });
      setMessage(data.message);
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'No se pudo cambiar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Nueva contraseña</h1>
      {!token ? <p className="auth-error">Enlace inválido (sin token).</p> : null}
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Nueva contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p className="auth-success">{message}</p> : null}
        <button type="submit" disabled={submitting || !token}>
          {submitting ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
      <p>
        <Link to="/login">Ir al inicio de sesión</Link>
      </p>
    </div>
  );
}
