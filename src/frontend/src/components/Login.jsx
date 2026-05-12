import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KoddaLogo } from './KoddaLogo';

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
          'No hay conexión con el servidor. Levantá la API (puerto 8000), por ejemplo con make backend o make test.'
        );
      } else {
        setError(typeof detail === 'string' ? detail : 'No se pudo iniciar sesión');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="kodda-auth-root">
      <aside className="kodda-auth-brand" aria-hidden="false">
        <div className="kodda-auth-brand-inner">
          <KoddaLogo />
          <p className="kodda-auth-eyebrow">Plataforma C2C / B2C</p>
          <h1 className="kodda-auth-headline">Tu placard, en movimiento circular.</h1>
          <p className="kodda-auth-lead">
            Comprá y vendé con precios más accesibles. La IA te ayuda con talles, búsqueda en lenguaje natural y
            reputación inteligente — vos decidís; Kodda conecta.
          </p>
          <div className="kodda-auth-pills">
            <span className="kodda-pill">Sugerencia de precio</span>
            <span className="kodda-pill">Talle recomendado</span>
            <span className="kodda-pill">Chat asistido</span>
            <span className="kodda-pill">Búsqueda libre</span>
          </div>
        </div>
        <p className="kodda-auth-footer-note">
          Interfaz clara y pasos simples, pensada para quienes quieren que la app haga el trabajo pesado al publicar
          o al elegir talle.
        </p>
      </aside>

      <main className="kodda-auth-panel">
        <div className="kodda-auth-card">
          <h1>Iniciar sesión</h1>
          <p className="kodda-auth-sub">Ingresá tu usuario o email y tu contraseña para entrar a tu espacio Kodda.</p>

          <form onSubmit={handleSubmit}>
            {error ? <p className="kodda-auth-error">{error}</p> : null}

            <label className="kodda-field">
              <span>Usuario o email</span>
              <input
                className="kodda-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="ej. mateo o mateo@mail.com"
                required
              />
            </label>

            <label className="kodda-field">
              <span>Contraseña</span>
              <input
                className="kodda-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <button className="kodda-btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar a Kodda'}
            </button>
          </form>

          <div className="kodda-auth-links">
            <Link to="/forgot-password">Olvidé mi contraseña</Link>
            <span className="kodda-auth-muted">¿Primera vez? El registro público depende de la configuración del servidor.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
