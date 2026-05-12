import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { KoddaLogo } from './KoddaLogo';

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
    <div className="kodda-auth-simple">
      <div className="kodda-auth-card">
        <KoddaLogo compact />
        <h1 style={{ marginTop: '1rem' }}>Nueva contraseña</h1>
        <p className="kodda-auth-sub">Elegí una clave segura para volver a entrar a Kodda.</p>

        {!token ? <p className="kodda-auth-error">Enlace inválido (sin token).</p> : null}

        <form onSubmit={handleSubmit}>
          <label className="kodda-field">
            <span>Nueva contraseña</span>
            <input
              className="kodda-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          {error ? <p className="kodda-auth-error">{error}</p> : null}
          {message ? <p className="kodda-auth-success">{message}</p> : null}
          <button className="kodda-btn-primary" type="submit" disabled={submitting || !token}>
            {submitting ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>

        <div className="kodda-auth-links">
          <Link to="/login">Ir al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
