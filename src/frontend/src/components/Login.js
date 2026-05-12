import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const to = location.state?.from?.pathname || '/';
    return <Navigate to={to} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
        setError(
          'No hay conexión con el servidor. Levantá la API (puerto 8000), por ejemplo con `make backend` o `make test`.'
        );
      } else {
        setError(typeof detail === 'string' ? detail : 'No se pudo iniciar sesión');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Usuario
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="auth-links">
        <Link to="/forgot-password">Olvidé mi contraseña</Link>
      </p>
    </div>
  );
}
